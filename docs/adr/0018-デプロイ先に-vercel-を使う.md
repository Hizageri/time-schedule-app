# ADR-0018：フロントと AI 窓口のデプロイ先に Vercel を使う（商用にするときに Cloudflare への移行を検討する）

- 状態：採用
- 日付：2026-10 以前（アプリを作り始めたとき）。続ける判断は 2026-11-11

## 選択肢

- Vercel（静的ファイル ＋ Serverless Functions）
- Firebase Hosting ＋ Cloud Functions for Firebase
- Netlify
- Cloudflare（Pages / Workers）

## 決めたこと

Vercel（静的ファイル ＋ Serverless Functions）。商用で使うとなったときに変更することにします。

## 選んだ理由

今は非商用の段階でテストをしながらアプリをデバックする段階なので商用にする必要はあまり感じない点。また容量についてもvercelの無料枠でも十分足りる点。この二つです。
