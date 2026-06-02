# CBO API 連携仕様書（v0.2）― 出面(4879) 書き込み＋読み取り

本書は本体仕様書 §6（CBO連携仕様）の実装版。

- **書き込み（§1〜7）**: 三浦興業のGAS実装から**確定**した契約。  
- **読み取り（§8）**: GASからは未確定のため、書き込みのREST規則からの**推定設計**。`★疎通確認` の項目は実装初手で1回ずつ実APIで確定する。  
- 実行系は **アプリのサーバ ↔ CBO API の直接通信**。GASは参考のみで稼働システムには挟まない。トークンはサーバ側シークレットのみ。

---

## 1\. 接続・認証

- ベースURL: `https://office.craft-bank.com/api`  
- 共通ヘッダ:  
  - `Authorization: Bearer <token>`（三浦興業用トークン。**サーバ側のみ保持**）  
  - `accept: application/json`  
  - `Content-Type: application/json`  
- レート対策: GAS実装では各呼び出し後に 500ms スリープ → **連続呼び出しはスロットリング**する（pull/pushのバッチ処理で考慮）。  
- エラー: HTTP 200 以外は失敗扱い（`muteHttpExceptions` で本文取得 → ログ化）。

---

## 2\. エンドポイント（確定）

| 操作 | メソッド | パス | 備考 |
| :---- | :---- | :---- | :---- |
| 作成 | POST | `/personal_daily_report` | **単数形** |
| 更新 | PUT | `/personal_daily_reports/{report_id}` | **複数形** |
| 削除 | DELETE | `/personal_daily_reports/{report_id}` | 複数形・body空 |

⚠ 作成のみ単数形・更新/削除は複数形。実装時に取り違え注意。

---

## 3\. リクエストボディ構造

### 3.1 共通ラッパ

```json
{
  "data": { "root": [ { "<key>": [<値>], ... } ] },
  "formatted": false,
  "personal_daily_report_format_id": 4879,
  "company_user_id": <報告者の company_user id>
}
```

### 3.2 data 構造のルール（GASの組み立てロジックより）

1. **値は必ず配列で包む**。単一値も `["x"]`、`[105360]` のように1要素配列。  
2. **キー先頭 `_`** \= 複数値フィールド（元データはカンマ区切り→配列展開）。`_` なし \= 単一値（1要素配列）。  
   - 出面(4879)は全フィールド単一入力なので **`_` 接頭辞は不要**。  
3. **入れ子（box等）** は `{ "親key": [ { "子key": [値] } ] }`。  
   - 出面(4879)は section 直下のフラット構造なので **入れ子なし**（全keyが root 直下）。  
4. **`formatted: false`** \= 表示ラベルではなく**生のID/値**を渡す。  
   - custom\_group（day\_yakan / work\_content / health\_type）→ **custom\_type ID**  
   - onsite（order）→ **order ID**、work\_user → **company\_user ID**  
   - sup\_name → **supplier ID**、sup\_staff → **supplier\_staff ID**  
   - date → `"YYYY-MM-DD"` 文字列、over\_hour → 数値  
5. `company_user_id`（トップ階層）= 報告者。出面の `main_reporter` は **読み取り専用（既定"me"）** のため、`company_user_id` が報告者になり **data内に main\_reporter を入れる必要はない**（要テスト確証）。

---

## 4\. 出面(4879)フィールド → key 対応

| 項目 | key | 値（formatted:false） |
| :---- | :---- | :---- |
| 日付 | start\_date | `"YYYY-MM-DD"` |
| 現場 | onsite | order ID |
| 作業者（自社） | work\_user | company\_user ID |
| 会社名（外注） | sup\_name | 協力会社(5307) supplier ID |
| 氏名（外注） | sup\_staff | supplier\_staff ID |
| 昼勤/夜勤 | day\_yakan | 105360 / 105361 |
| 残業 | over\_hour | 数値 |
| 石綿作業内容 | work\_content | 106548〜106555 |
| 健康状態 | health\_type | 106556〜106558 |

自社員レコードは `work_user` を使い `sup_name`/`sup_staff` を省略。外注レコードは逆。

---

## 5\. ペイロード例

### 5.1 作成（自社員）

`POST /personal_daily_report`

```json
{
  "data": { "root": [{
    "start_date": ["2026-05-01"],
    "onsite": [<order_id>],
    "work_user": [27322],
    "day_yakan": [105360],
    "over_hour": [0],
    "work_content": [106548],
    "health_type": [106556]
  }]},
  "formatted": false,
  "personal_daily_report_format_id": 4879,
  "company_user_id": 27322
}
```

### 5.2 作成（外注）

```json
{
  "data": { "root": [{
    "start_date": ["2026-05-01"],
    "onsite": [<order_id>],
    "sup_name": [<supplier_id>],
    "sup_staff": [79537],
    "day_yakan": [105360],
    "over_hour": [2],
    "work_content": [106549],
    "health_type": [106557]
  }]},
  "formatted": false,
  "personal_daily_report_format_id": 4879,
  "company_user_id": <報告者id>
}
```

### 5.3 更新

`PUT /personal_daily_reports/{cbo_report_id}` ― body は作成と同形（report\_id はパスで指定）。

### 5.4 削除

`DELETE /personal_daily_reports/{cbo_report_id}` ― body は空 `{}`。

⚠ 石綿作業記録は40年保存の法定書類。削除は誤操作防止のためUIで二重確認＋ sync\_logs に必ず記録。可能なら「アプリ側は論理削除→明示操作でのみCBO物理削除」を推奨。

---

## 6\. アダプタ層 関数設計（サーバ側）

```ts
type CboReportPayload = {
  data: { root: [Record<string, unknown[]>] };
  formatted: false;
  personal_daily_report_format_id: 4879;
  company_user_id: number;
};

// 出面入力 → CBOペイロード整形
buildAttendancePayload(input: {
  reporterId: number;               // company_user_id（報告者）
  date: string;                     // 'YYYY-MM-DD'
  orderId: number;                  // onsite
  worker:
    | { kind: 'employee'; companyUserId: number }
    | { kind: 'partner'; supplierId: number; supplierStaffId: number };
  dayYakanId: 105360 | 105361;
  overHour: number;
  workContentId: number;            // 106548..106555
  healthTypeId: number;             // 106556..106558
}): CboReportPayload

// HTTP
createAttendanceReport(p: CboReportPayload): Promise<{ cboReportId: string }> // POST /personal_daily_report
updateAttendanceReport(id: string, p: CboReportPayload): Promise<void>        // PUT  /personal_daily_reports/{id}
deleteAttendanceReport(id: string): Promise<void>                             // DELETE /personal_daily_reports/{id}
```

- 200以外は例外化。バッチ時はスロットリング（例: 並列1〜2、間隔を空ける）。  
- 作成成功時に**レスポンスから report\_id を取得して `daily_reports.cbo_report_id` に保存**（§7-1で要確認）。

---

## 7\. 残確認事項（小・テスト1件で大半解消）

| \# | 内容 | 解消方法 |
| :---- | :---- | :---- |
| 1 | **作成レスポンスのbody形**（新 report\_id のフィールド名） | テスト作成1件のレスポンスを確認（GASは未取得） |
| 2 | custom\_group/order/supplier を **ID で渡す**前提の確証 | テスト作成1件で成功確認（`formatted:false` 前提でほぼ確実） |
| 3 | `main_reporter` を data に入れる要否 | テスト作成1件で確認（読み取り専用なら不要のはず） |
| 4 | sup\_name 用の **協力会社(会社) supplier ID** の取得経路 | 読み取り側（§8）で確定 |

---

## 8\. 読み取り（pull）設計 ― 案A（CBO API GET 直叩き）【推定】

方針: アプリのサーバが CBO API を直接GETする。**GASは実行系に挟まない**。書き込みが `/personal_daily_report(s)` だったことから Laravel系REST と推定し、`★疎通確認` 項目は実装初手で確定する。

### 8.1 取得対象と用途

| 対象 | 用途 | 格納先 |
| :---- | :---- | :---- |
| 案件(2556, asbests=true) | 現場マスタ | sites |
| company\_users | 社員マスタ | workers(employee) |
| 協力会社(5307)+staff | 外注マスタ | workers(partner) |
| 出面(4879) 既存レポート | 既存記録取込・`cbo_report_id`確保・更新/重複判定 | daily\_reports |

### 8.2 推定エンドポイント（★疎通確認で確定）

| 用途 | 推定 メソッド/パス | 推定クエリ・備考 |
| :---- | :---- | :---- |
| 出面一覧 | GET `/personal_daily_reports` | `personal_daily_report_format_id=4879`＋現場/期間絞り（`order_id`・日付範囲）。各要素の `id` を取得 |
| 出面単体 | GET `/personal_daily_reports/{id}` |  |
| 案件一覧 | GET `/orders` | `order_format_id=2556`。**asbests=true は取得後にアプリ側で値フィルタ**（カスタム項目のためクエリ非対応の可能性） |
| 社員一覧 | GET `/company_users` | 退職/無効除外（クエリ or アプリ側） |
| 協力会社+staff | GET `/suppliers` | `supplier_format_id=5307`。会社（supplier id）＋staff（staff id）を両取得 |

`formatted` パラメータ（書き込みに存在）が読み取りにもあれば **`false`\=ID／`true`\=ラベル**。同期にはID必須なので **false系で取得**し、表示ラベルは併取得 or 別管理。

### 8.3 正規化・フィルタルール

- **現場**: order\_format\_id=2556 のうち `asbests`\=true のみ sites へ。住所・ステータスは破棄。  
- **社員**: company\_users の `is_withdrawed`/`withdrawn_at`/`deleted_at` 無効を除外 → workers(employee, 会社名=三浦興業固定)。  
- **外注**: 協力会社 supplier × staff を展開 → workers(partner)。**sup\_name用の会社supplier id と sup\_staff用の staff id を両方保持**（§7-4で必要だった会社idはここで確保）。  
- **出面**: 各レポートの `id` を `cbo_report_id` に保存。onsite / work\_user / sup\_name / sup\_staff / day\_yakan / over\_hour / work\_content / health\_type を抽出（formatted:false ならID）。

### 8.4 読み取りアダプタ関数（サーバ側）

```ts
listSites(): Promise<Site[]>                                  // GET /orders?order_format_id=2556 → asbests=true で絞り
listEmployees(): Promise<Worker[]>                            // GET /company_users → active
listPartnerWorkers(): Promise<Worker[]>                       // GET /suppliers?supplier_format_id=5307 → 会社×staff展開
listAttendanceReports(orderId: number, period: { from: string; to: string }): Promise<CboReport[]>
                                                              // GET /personal_daily_reports?...=4879
getAttendanceReport(reportId: string): Promise<CboReport>
```

### 8.5 ★疎通確認項目（実装初手で1回ずつ実APIで確定）

1. 出面一覧の正確なパス・絞り込みクエリ名（format / order / 日付範囲）と**レスポンスJSON構造**  
2. orders / company\_users / suppliers の正確なパス・クエリ名・レスポンス構造  
3. `formatted` クエリの有無と true/false の返却差（ID か ラベルか）  
4. ページング方式（page / per\_page / cursor 等）と上限件数

