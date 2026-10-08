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
- セキュリティルールは Firebase コンソールで設定済み：`users/{uid}` を本人だけが読み書きできる
- ルールはまだリポジトリで管理していない（`firestore.rules` として管理するのは今後 spec で対応予定）。コンソール側が正

## 環境変数の保存場所

| 変数 | Vercel | ローカル `.env` | 注意 |
|------|:------:|:---------------:|------|
| `GOOGLE_API_KEY` | ✅ Production / Preview / Development | ✅ | サーバー専用。`VITE_` を付けない。コードは `GEMINI_API_KEY` も代わりに読む |
| `VITE_FIREBASE_*`（6個） | ✅ | ✅ | ブラウザに公開される前提の値 |

`VITE_FIREBASE_*` の6個：`API_KEY` / `AUTH_DOMAIN` / `PROJECT_ID` / `STORAGE_BUCKET` / `MESSAGING_SENDER_ID` / `APP_ID`

- 環境変数を変えたら、Vercel で **Redeploy** しないと反映されない（`VITE_*` はビルド時に埋め込まれるため）
- `.env` は commit しない（`.gitignore` 済み）。見本は `.env.example` に、値を入れずに書く
- `service-account.json` も `.gitignore` 済み。置く場合も commit しない

## キーの更新履歴（値は書かない）

| 日付 | 内容 |
|------|------|
| 2026-10-07 | 過去に commit された `.env` から漏れていた Gemini キー3つを削除し、新しいキーを発行して Vercel に設定。AI 機能の動作を確認 |

- 履歴を書き換えるより、漏れたキーを無効化して入れ替えるほうを優先する
- キーを入れ替えたら、この表に日付と内容を追記する

## よくあるトラブル

| 症状 | 原因 | 対処 |
|------|------|------|
| `auth/unauthorized-domain` でログインできない | 開いている URL が承認済みドメインにない（デプロイごとの URL で開いている） | 本番 URL で開く。新しいドメインなら承認済みドメインに追加 |
| `Database '(default)' not found` | Firestore のデータベースがない、または `VITE_FIREBASE_PROJECT_ID` が別のプロジェクトを指している | Firestore で `(default)` を作成する／プロジェクト ID を確認して Redeploy |
| AI 機能が「生成エラー」「通信エラー」になる | `GOOGLE_API_KEY` が未設定か無効、または Redeploy していない | 環境変数を確認して Redeploy |

AI の API は失敗しても 200 で代わりの文面を返すため、画面上はエラーに見えないことがある。Vercel の Functions のログで確認する。
