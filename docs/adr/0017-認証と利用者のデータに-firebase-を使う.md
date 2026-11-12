# ADR-0017：認証と利用者のデータの保存に Firebase（Authentication ＋ Cloud Firestore）を使う

- 状態：採用
- 日付：2026-10 以前（アプリを作り始めたとき）

## 選択肢

- Firebase（Authentication ＋ Firestore）
- Supabase（Auth ＋ Postgres）
- 認証サービス（Auth0・Clerk など）＋ 自分の API ＋ DB
- AWS Amplify（Cognito ＋ DynamoDB）

## 決めたこと

Firebase（Authentication ＋ Firestore）。

## 選んだ理由

aiにおすすめされたからです。使い続ける理由も、aiにおすすめされたからです。
