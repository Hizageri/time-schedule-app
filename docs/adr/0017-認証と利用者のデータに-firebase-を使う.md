# ADR-0017：認証と利用者のデータの保存に Firebase（Authentication ＋ Cloud Firestore）を使う

- 状態：採用
- 日付：2026-10 以前（アプリを作り始めたとき）
- 関係する spec：なし（最初の技術選定）
- 出典：作者への聞き取り（2026-11-10）、`src/lib/firebase.ts`、`firestore.rules`、`package.json`（`firebase` 12.x）、ADR-0002・ADR-0006・ADR-0014・ADR-0015・ADR-0016

## 背景

Google でログインでき、利用者ごとのデータ（1人あたり数十 KB）を端末をまたいで保存する仕組みが必要だった。

今の形：

- Firebase Authentication：Google ログイン（`signInWithPopup`、毎回アカウントの選択画面を出す）。ID トークンは AI 窓口の本人確認にも使う（ADR-0006）
- Cloud Firestore：`users/{uid}` に `AppState` を保存（ADR-0015）。クライアントから SDK で直接読み書きし、security rules（本人の `users/{uid}` だけ）で守る
- 設定値の `VITE_FIREBASE_*` はブラウザに公開される前提の値で、秘密情報ではない（ADR-0002）

## 選択肢

### 案A：Firebase（Authentication ＋ Firestore）
- 概要：Google の BaaS。認証と NoSQL のドキュメント DB がセット
- メリット：Google ログインが数行で書ける。クライアントから直接 DB を読み書きでき、保存の API を書かなくてよい。無料枠（Spark プラン）が大きい（Firestore は read 1日5万回・write 1日2万回）
- デメリット：NoSQL なので JOIN や複雑な集計ができない。課金がドキュメント単位の read・write。安全性が security rules の正しさに直結する。vendor lock-in。SDK が大きい

### 案B：Supabase（Auth ＋ Postgres）
- 概要：オープンソースの BaaS。認証と RDB がセット。安全は RLS（Row Level Security）で守る
- メリット：SQL で JOIN・集計・全文検索ができる。自分でホストもでき、lock-in が弱い
- デメリット：RLS を SQL で正しく書く必要がある。無料枠のプロジェクトは使われないと一時停止される。テーブル設計とマイグレーションの管理が要る

### 案C：認証サービス（Auth0・Clerk など）＋ 自分の API ＋ DB
- 概要：認証は専用サービス、データは Vercel Functions の API の先の DB
- メリット：データへのアクセスがすべてサーバーを通り、1か所で管理できる
- デメリット：保存・読み込みの API を全部書く必要がある。サービスが増え、認証と DB の連携も自分で作る

### 案D：AWS Amplify（Cognito ＋ DynamoDB）
- 概要：AWS の BaaS
- メリット：AWS の他のサービスとつなぎやすい
- デメリット：設定（IAM・Cognito）が複雑。今の構成（Vercel ＋ Gemini）で AWS を使う理由がない

## 決めたこと

案A。

## 選ばなかった理由

- 案B・C・D：当時、比較して選んだわけではない。AI におすすめされた案A をそのまま採用した。使い続けている理由も、AI のおすすめによる（作者への聞き取り）

> 補足（記録にない技術的な説明）：このアプリが利用者のデータに求めるのは、①Google でログインできる ②利用者ごとのデータを端末をまたいで保存できる ③データが小さい（1人あたり数十 KB）④利用者をまたいだ検索や複雑な検索をしない（計算はコードで行う。ADR-0001）の4つ。これには案A がもっとも少ない手間で合う。案B の SQL の強みは、④により今は活きにくい

## 結果

- 良くなること：認証・保存のサーバー側のコードを書かずに済む
- 受け入れたトレードオフ：NoSQL の制約に合わせたデータ設計（ADR-0014・ADR-0016）、vendor lock-in、security rules の正しさへの依存
- 見直す条件：
  - シラバスの条件の検索を DB 側でしたくなったとき（ADR-0014 の RDB との比較）
  - サーバー側から Firestore を読む必要が出たとき（`firebase-admin` と秘密鍵の管理が要る。ADR-0006 で避けたもの）
  - read・write の回数が無料枠を超えそうなとき

## 聞かれたときの答え方

> Q. なぜ Firebase を使っているのですか？

（作者の言葉で書く。参考：当時は AI のおすすめをそのまま採用した。今の要件との照らし合わせは上の補足）

- よくある追加の質問：Supabase などの RDB にしなかったのはなぜですか？
  - 答え：（作者の言葉で書く）
