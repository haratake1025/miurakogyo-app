# Claude Code 着手用 タスク分解（v0.1）― 出面・石綿記録システム

## 参照設計（このリポジトリに同梱想定）

- `出面_石綿記録システム_仕様書ドラフト_v0.3.md`（全体仕様）  
- `CBO_API連携仕様_v0.1.md`（書き込み=確定／読み取り=推定）  
- `バックエンド設計_v0.1.md`（DDL・APIルート・同期ステートマシン）  
- `フロントエンド設計_v0.1.md`（画面・A案グリッド）

## 使い方

- 各チケットは Claude Code に渡す1単位（1 PR目安）。**依存**順に進める。  
- ★`疎通` 付きは「実APIを叩いて確定する」タスク。これが Phase 2–3 の確定値になる。  
- 各チケットの**受け入れ条件**を満たしたら次へ。

## 依存関係（概略）

```
P0 → P1 → P2(T2.0★ → 2.1 → 2.2/2.3 → 2.4) → P3 → P4 → P5
                         └ T2.0 が P2.3/P3.1-3.2/P3.6 の確定を解放
```

---

## Phase 0 ― 初期化・環境

### T0.1 プロジェクト初期化

- 目的: Next.js(App Router)+TypeScript+Tailwind+TanStack Query の雛形。  
- 受け入れ: ローカル起動・空ページ表示・lint/format 通過。

### T0.2 環境変数・シークレット

- 目的: サーバ専用シークレットの保持（フロント露出禁止）。  
- 内容: `CBO_BASE_URL=https://office.craft-bank.com/api` / `CBO_TOKEN` / `CBO_COMPANY_ID=4083` / `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`。  
- 受け入れ: サーバ側からのみ参照される構成（クライアントバンドルに秘密が含まれない）。

### T0.3 Supabase 接続

- 目的: Supabaseプロジェクト作成・接続確認（service\_role はサーバのみ）。  
- 受け入れ: サーバから疎通成功。

---

## Phase 1 ― データベース

### T1.1 スキーマ適用（依存 T0.3 / 参照 バックエンド§2）

- 内容: `sites` / `workers` / `daily_reports` / `sync_logs` / 選択肢3表、`worker_source`・`sync_status_t` enum、部分uniqueインデックス、updated\_atトリガを作成。  
- 受け入れ: 全テーブル・制約・index・trigger が作成され、`unique(site_id,worker_id,work_date)`・workers部分uniqueが効く。

### T1.2 seed 投入（依存 T1.1 / 参照 §2.1）

- 内容: day\_yakan(105360/105361)・work\_content(106548–106555)・health\_type(106556–106558)。  
- 受け入れ: 昼勤夜勤2件・作業内容8件・健康状態3件が投入される。

---

## Phase 2 ― CBO連携アダプタ（`lib/cbo/`・サーバ専用）

### T2.0 ★疎通: CBO API 実挙動の確定（参照 連携§7・§8.5）

- 内容（実APIで確認し、結果をコード定数/型に反映）:  
  1. 出面4879を**テスト1件 POST** → レスポンスの **新report\_idフィールド名**、custom\_group等を **ID で渡して成功**するか、`main_reporter` を data に入れる要否。  
  2. 読み取りGETの**実パス・クエリ名・レスポンス構造**（orders2556 / company\_users / suppliers5307 / personal\_daily\_reports）。  
  3. `formatted` クエリの有無と true/false の差（ID/ラベル）、ページング方式。  
- 受け入れ: 上記が文書化され、T2.2/T2.3 の実装に反映できる確定値が揃う。  
- 注意: テストデータは検証用現場で。**石綿記録の削除は本タスクでは行わない**（法定書類）。

### T2.1 HTTP基盤（依存 T0.2）

- 内容: fetchラッパ（Authヘッダ・`accept`/`Content-Type`・200以外を例外化・**スロットリング**・リトライ方針）。  
- 受け入れ: 共通クライアント経由でCBOへ到達、エラー型が定義される。

### T2.2 書き込みアダプタ（依存 T2.0,T2.1 / 参照 連携§2–6）

- 内容: `buildAttendancePayload`（自社=work\_user / 外注=sup\_name+sup\_staff の分岐、全値を配列包み、`formatted:false`、format=4879）、`create`（POST `/personal_daily_report`）・`update`（PUT `/personal_daily_reports/{id}`）・`delete`（DELETE 同）。  
- 受け入れ: 検証現場で create→update→（必要時）delete が成功し、create時に cbo\_report\_id を取得できる。

### T2.3 読み取りアダプタ（依存 T2.0,T2.1 / 参照 連携§8）

- 内容: `listSites`(orders2556→**asbests=trueでアプリ側フィルタ**) / `listEmployees`(company\_users→active) / `listPartnerWorkers`(suppliers5307→会社×staff展開, **会社id＋staff id両保持**) / `listAttendanceReports`(現場×期間×format4879) / `getAttendanceReport`。  
- 受け入れ: 各取得が実データを返し、型に整う。

### T2.4 レスポンス正規化（依存 T2.3 / 参照 連携§8.3）

- 内容: CBO応答 → `sites`/`workers`/`daily_reports` のモデルへ変換（IDで保持）。  
- 受け入れ: 変換結果がDBスキーマに upsert 可能な形。

---

## Phase 3 ― APIルート（`app/api/...` / 参照 バックエンド§3）

### T3.0 認証ミドルウェア（依存 T0.3）

- 内容: Supabase Auth セッション検証、サーバは service\_role でDB操作。認可はルート層。  
- 受け入れ: 未認証は弾かれ、認証済のみAPI実行可。

### T3.1 マスタpull（依存 T2.3,T2.4,T1.x）`POST /api/sync/pull/masters`

- 内容: sites / workers を upsert（cbo\_order\_id・部分unique基準）。sync\_logs(target=site/worker)。  
- 受け入れ: 実行後、石綿✔現場と社員/外注がDBに反映。

### T3.2 出面pull（依存 T2.3,T2.4）`POST /api/sync/pull/reports` {siteId,from,to}

- 内容: 出面4879取得 → daily\_reports upsert（cbo\_report\_id基準）。**競合検知**: CBO更新が `cbo_synced_at` より新しくローカルが local\_edited なら `conflict`。`cbo_synced_at` 更新。  
- 受け入れ: 既存report\_idが取り込まれ、competeケースでconflictが立つ。

### T3.3 グリッド取得（依存 T1.x）`GET /api/sites/[siteId]/reports?month=YYYY-MM`

- 受け入れ: 対象月の daily\_reports（worker/options join）を返す。

### T3.4 一覧系 `GET /api/sites` / `GET /api/workers?company=...`

- 受け入れ: 現場一覧・作業者候補を返す。

### T3.5 出面CRUD（依存 T1.x / 参照 §4状態遷移）`POST/PATCH/DELETE /api/reports`

- 内容: 作成=local\_new、編集=synced→local\_edited、削除=ガード＋sync\_logs。  
- 受け入れ: 1セル=1レコードで CRUD でき、sync\_status が正しく遷移。

### T3.6 push（依存 T2.2,T3.5）`POST /api/sync/push` {siteId, ids?}

- 内容: local\_new/local\_edited を CBO へ create/update。成功で synced＋cbo\_report\_id 保存。全件 sync\_logs。スロットリング。  
- 受け入れ: 未同期がCBOへ反映され、再pullで整合。

### T3.7 ログ `GET /api/sync/logs`

- 受け入れ: 同期ログを新しい順で返す。

---

## Phase 4 ― フロントエンド（参照 フロント設計）

### T4.1 AppShell・基盤（依存 T3.0）

- 内容: サイドナビ（現場一覧/マスタ/同期）・会社バッジ(三浦興業)・ルーティング・TanStack Query・ログイン。  
- 受け入れ: ナビ遷移・ログインが動作。

### T4.2 現場一覧（依存 T3.1,T3.4）

- 内容: SiteCard・フィルタ・「CBOから取込(マスタ)」。  
- 受け入れ: pull後に石綿現場が並び、各現場へ遷移。

### T4.3 出面表グリッド・A案（依存 T3.3,T3.5 / 参照 フロント§5）

- 内容: 行=作業者×列=日、左列/ヘッダ固定・横スクロール、**インライン編集**（昼夜/残業/作業内容/健康状態/削除）、**sync\_status配色**、キーボード移動、土日祝色分け。  
- 受け入れ: 空セル作成=local\_new、編集=local\_edited、状態が色で判別、キーボードで連続入力可。

### T4.4 石綿記録グリッド（依存 T3.3,T3.5 / 参照 フロント§6）

- 内容: 上期/下期切替・凡例・作業内容(単一)＋健康状態・修正済バッジ・ヘッダ(管轄/工事名/工期/責任者)。出面表と同一データ連動。  
- 受け入れ: 石綿項目をセル編集でき、出面表側にも反映。

### T4.5 作業者一括追加モーダル（依存 T3.4 / 参照 フロント§7）

- 内容: 会社選択→氏名複数チェック→行追加（マスタ新規登録はしない、既存表示者は除外）。  
- 受け入れ: 複数名を一括で表に追加できる。

### T4.6 同期バー（依存 T3.1,T3.2,T3.6）

- 内容: 取込/反映ボタン・未同期件数バッジ・最終同期時刻・進捗/トースト・楽観更新。  
- 受け入れ: pull/push がUIから実行でき、結果が反映。

---

## Phase 5 ― 帳票・競合・仕上げ

### T5.1 競合解決UI（依存 T3.2,T3.6 / 参照 フロント§8）`/sync`

- 内容: 行ごとに CBO版/アプリ版を比較・選択。  
- 受け入れ: conflict を解消し synced へ。

### T5.2 石綿記録 印刷（依存 T4.4）

- 内容: 法定様式の印刷レイアウト（上期/下期・凡例・健康状態）。  
- 受け入れ: 印刷プレビューが様式を満たす。

### T5.3 出面集計Excel（依存 T4.3）

- 受け入れ: 作業者×日付の集計をExcel出力。

### T5.4 仕上げ

- 内容: 削除ガード/監査ログ閲覧・祝日判定ライブラリ導入・エラーハンドリング。

### T5.5 受け入れテスト（E2E）

- 内容: pull → グリッド編集 → push → 再pull で整合、競合・削除の挙動確認。  
- 受け入れ: 主要シナリオが通る。

---

## 実装着手の最優先メモ

1. **T2.0★疎通を最初に**（読み取り実パス・report\_id・id渡し・main\_reporter）。ここが Phase 2–3 の確定値。  
2. 検証は専用テスト現場で。**石綿記録の削除はテストで行わない**（40年保存の法定書類）。  
3. 不明点が出たら設計4文書の該当章を更新 → 本タスク表へ反映、の順で同期を保つ。

