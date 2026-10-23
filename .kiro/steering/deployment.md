# Deployment Steering

> updated_at: 2026-10-08
> コードの外（Vercel・Firebase などの管理画面）でしている設定の記録。
> **キーやパスワードの値は絶対に書かない。** 書くのは変数名と保存場所だけ。

## 方針

- 公開先は Vercel。フロント（Vite のビルド結果）と `api/*.ts`（Serverless Functions）を同じプロジェクトでデプロイする
- 秘密情報は Vercel の環境変数とローカルの `.env` だけに置く。リポジトリには入れない
- Gemini の API キーはサーバー専用。ブラウザに出る `VITE_` 付きの変数に入れない
- CI・自動テスト・段階的な公開の仕組みはない。デプロイ前の確認は `npm run build` と `npm run lint` を手で行う

## URL

| 種類 | URL | 用途 |
|------|-----|------|
| 本番 | `https://（Vercel の Settings → Domains に表示されるドメイン）` | **利用者にはこれを案内する** |
| デプロイごとの URL | `https://<プロジェクト名>-<ランダム>-yuse1drm-7077s-projects.vercel.app` | デプロイのたびに変わる。確認用。**Google ログインはできない** |
| ローカル | `http://localhost:5173` | `npm run dev` |

- デプロイごとの URL を README などで案内しない（ログインできないため）

## Firebase の承認済みドメイン

場所：Firebase コンソール → Authentication → 設定 → 承認済みドメイン

| ドメイン | 理由 |
|----------|------|
| `localhost` | ローカル開発（最初から登録済み） |
| `（本番ドメイン）` | 本番 |

- ワイルドカード（`*.vercel.app`）は登録できない。デプロイごとの URL は登録しない
- 独自ドメインを追加したら、ここにも追加する

## Firestore

- `(default)` データベースを使う
- セキュリティルールはリポジトリのルートの `firestore.rules` で管理する（2026-10-24〜）。内容は「`users/{uid}` を本人だけが読み書きできる。ほかの場所は書いていないので拒否」。2026-10-23 に作者がコンソールから貼り付けた内容と同じ
- **リポジトリの `firestore.rules` が正**。コンソールのルールを直接書き換えない。変えるときは `firestore.rules` を直して、下の手順で反映する

### ルールの反映の手順（作者が行う）

1. Firebase コンソール → このアプリのプロジェクト → Firestore Database → 「ルール」タブを開く
2. エディタの中身を、リポジトリの `firestore.rules` の中身で**全部置きかえる**
3. 「公開」を押す（数分で反映される）
4. 下の「ルールの確認の手順」を行う

### ルールの確認の手順（Rules Playground）

「ルール」タブのエディタの横にある「Rules Playground」（ルールの試験）で、次の4つを試す。場所はどれも `/users/<試す uid>`。

| # | 試す内容 | 設定 | 期待する結果 |
|---|----------|------|--------------|
| 1 | ログインしていない人が読む | 種類 `get`、「認証済み」をオフ | 拒否 |
| 2 | 別の利用者が読む | 種類 `get`、認証済みをオン、プロバイダの uid を場所の uid と**違う値**にする | 拒否 |
| 3 | 別の利用者が書く | 種類 `create`（または `update`）、2 と同じ認証 | 拒否 |
| 4 | 本人が読み書きする | 種類 `get` と `update`、認証済みをオン、uid を場所の uid と**同じ値**にする | 許可 |

あわせて、`/other/abc`（`users` 以外の場所）を本人の認証で `get` して、拒否されることも確かめる。4 つとも期待どおりなら反映できている。

- 第2段階で保存の場所を学期ごと（`users/{uid}/terms/...`）に分けると、今のルールでは下の階層が拒否される。そのときに `firestore.rules` も直す（`roadmap.md` の `university-data-model`）

## 環境変数の保存場所

| 変数 | Vercel | ローカル `.env` | 注意 |
|------|:------:|:---------------:|------|
| `GOOGLE_API_KEY` | ✅ Production / Preview / Development | ✅ | サーバー専用。`VITE_` を付けない。コードは `GEMINI_API_KEY` も代わりに読む |
| `VITE_FIREBASE_*`（6個） | ✅ | ✅ | ブラウザに公開される前提の値 |
| `FIREBASE_PROJECT_ID`（任意） | 任意 | 任意 | AI 窓口（`api/_lib/auth.ts`）が ID トークンを確かめるときのプロジェクト ID。**なければ `VITE_FIREBASE_PROJECT_ID` を使う**ので、ふだんは設定しなくてよい。秘密情報ではない。どちらもないと AI 窓口は 500 を返す |

`VITE_FIREBASE_*` の6個：`API_KEY` / `AUTH_DOMAIN` / `PROJECT_ID` / `STORAGE_BUCKET` / `MESSAGING_SENDER_ID` / `APP_ID`

- 環境変数を変えたら、Vercel で **Redeploy** しないと反映されない（`VITE_*` はビルド時に埋め込まれるため）
- `.env` は commit しない（`.gitignore` 済み）。見本は `.env.example` に、値を入れずに書く
- `service-account.json` も `.gitignore` 済み。置く場合も commit しない

## キーの更新履歴（値は書かない）

| 日付 | 内容 |
|------|------|
| 2026-10-07 | 過去に commit された `.env` から漏れていた Gemini キー3つを削除し、新しいキーを発行して Vercel に設定。AI 機能の動作を確認 |
| 2026-10-09 | 本番のキー（2026-10-07 に発行したもの）で予備モデル `gemini-3.1-flash-lite` を呼び、正常に応答が返ることを確認 |

- 履歴を書き換えるより、漏れたキーを無効化して入れ替えるほうを優先する
- キーを入れ替えたら、この表に日付と内容を追記する

## よくあるトラブル

| 症状 | 原因 | 対処 |
|------|------|------|
| `auth/unauthorized-domain` でログインできない | 開いている URL が承認済みドメインにない（デプロイごとの URL で開いている） | 本番 URL で開く。新しいドメインなら承認済みドメインに追加 |
| `Database '(default)' not found` | Firestore のデータベースがない、または `VITE_FIREBASE_PROJECT_ID` が別のプロジェクトを指している | Firestore で `(default)` を作成する／プロジェクト ID を確認して Redeploy |
| AI 機能が「なんか調子が悪いみてえだ。時間をおいて出直してこい」になる | `GOOGLE_API_KEY` が未設定か無効、または Redeploy していない | 環境変数を確認して Redeploy |
| `AQ.` から始まる API キーで `401 ACCESS_TOKEN_TYPE_UNSUPPORTED` になる | キーによって起きる Google 側の問題。2026-10-07 に作ったキー（Vercel に設定済み）は正常に動くが、別に作った `AQ.` キーでは発生した | 本番の Vercel のキーは変えない。手元の `.env` にも Vercel と同じキーを使う |

AI の API は失敗しても 200 で代わりの文面を返すため、画面上はエラーに見えないことがある。Vercel の Functions のログで確認する。
