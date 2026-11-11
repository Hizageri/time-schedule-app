# ADR-0018：フロントと AI 窓口のデプロイ先に Vercel を使う（商用にするときに Cloudflare への移行を検討する）

- 状態：採用
- 日付：2026-10 以前（アプリを作り始めたとき）。続ける判断は 2026-11-11
- 関係する spec：なし（最初の技術選定）
- 出典：作者への聞き取り（2026-11-11）、`vercel.json`、`vite.config.ts`（`local-api-handler`）、`.kiro/steering/deployment.md`、Vercel「Fair use guidelines」「Limits」、Cloudflare「Workers Limits」「Pages Functions Pricing」、shinobiworks.com「Cloudflare Pagesの無料プランは商用利用できる」（2026-10-02 更新）、ADR-0002・ADR-0003・ADR-0006・ADR-0007

## 背景

Gemini の API キーを隠すため、サーバー側の関数が要る（ADR-0002）。フロントと API を、一人で手間なく公開・更新したい。

今の形：

- フロント（Vite のビルド結果）と `api/*.ts`（Vercel Serverless Functions、Node.js）を、同じ1つのプロジェクトでデプロイしている
- `vercel.json`：`maxDuration: 60`（Gemini の応答を待つため）、`includeFiles: "src/data/**"`（ADR-0007）
- GitHub の `main` に push すると本番に自動でデプロイされる。ほかのブランチはプレビュー用のデプロイになる（プレビューの URL では Google ログインができない。`deployment.md`）
- 開発時は `vite.config.ts` の `local-api-handler` が Vercel の関数の動きを真似て `/api` を動かす

## 選択肢

### 案A：Vercel（静的ファイル ＋ Serverless Functions）
- メリット：フロントと API を1つのプロジェクトでまとめてデプロイできる。push だけでデプロイされ、プレビューも作られる。Vite に標準で対応
- デメリット：無料の Hobby は個人の非商用の利用だけ。商用には Pro（月 $20、デプロイする人1人あたり）が要る。`api/` が Vercel の関数の書き方（`req`・`res`）に依存する
- 無料枠（Hobby、月）：関数の呼び出し 100万回、Active CPU 4時間、Fast Data Transfer 100GB

### 案B：Firebase Hosting ＋ Cloud Functions for Firebase
- メリット：Firebase と同じプロジェクトにまとまる。サーバーから Firestore を読みやすい
- デメリット：Cloud Functions には従量課金の Blaze プランが要る。プレビューは Vercel ほど手軽ではない

### 案C：Netlify
- メリット・デメリット：Vercel とほぼ同じで、移る理由が特にない

### 案D：Cloudflare（Pages / Workers）
- メリット：
  - 静的ファイルの配信は、回数も帯域も無料で無制限
  - サーバー側の処理は、無料で1日 10万回（Pages Functions も Workers と共通の枠）
  - 無料プランでも商用で使える（規約に禁止する文言がない。shinobiworks.com の記事による。規約そのものは未確認）
  - 有料の Workers Paid は月 $5
- デメリット：
  - 無料プランは、1回の処理の CPU 時間が 10ms まで。公式の説明では、認証や大きなデータのパースをする処理は「たいてい 10〜20ms 使う」。AI 窓口は ID トークンの署名の検証（ADR-0006）と約 190KB のシラバスのパース（ADR-0007）をするので、超える可能性が高い。実際には Workers Paid（CPU は既定で 30秒まで）が要ると考える
  - `api/` の書き直し（Workers の `fetch(request)` → `Response` の形）、開発環境の作り直し（wrangler）、シラバスの読み方の変更（Workers の `node:fs` は仮想のファイルシステムなので、JSON を `import` してコードに含める）が要る
  - `crypto.createPublicKey` と Gemini の SDK が動くかは、試して確かめる必要がある

## 決めたこと

案A。商用で使うことになったときに変更する。

## 選ばなかった理由

- 案D：作者の理由（作者への聞き取り）
  - 今は非商用の段階で、テストをしながらアプリをデバッグする段階なので、商用にする必要はあまり感じない
  - 容量についても、Vercel の無料枠で十分足りる
- 案B・C：最初の選定のときは比較していない（AI のおすすめで案A を採用した）。今も移る理由がない

### 容量の試算（2026-11-11、多めに見積もる）

200人が、1人あたり月 30回アプリを開き（毎回フロント一式 約 0.5MB をダウンロード）、月 20回 AI を呼ぶ（1回あたり CPU 0.2秒）とする。

| 項目 | 200人の使用量（月） | Vercel Hobby の無料枠（月） | 使う割合 |
|------|------|------|------|
| 関数の呼び出し | 4,000回 | 100万回 | 約 0.4% |
| Active CPU | 約 13分 | 4時間 | 約 6% |
| 転送量 | 約 3GB | 100GB | 約 3% |

実際の利用の量は、Hobby のログの保存期間（1時間）と、Web Analytics が無効なため測れていない。Vercel の管理画面の Usage で確かめられる。

## 結果

- 良くなること：今のコードと開発の流れを変えずに済む
- 受け入れたトレードオフ：商用にするときに、プランの変更か、デプロイ先の移行が必要になる
- 見直す条件：
  - **商用で使うことになったとき**。Vercel の定義では、制作に関わる誰かが金銭的な利益を得る目的で使うデプロイが商用（支払いの受け取り、商品やサービスの宣伝、サイトの制作でお金を受け取る、アフィリエイトが主な目的、広告を載せる。寄付を募るのは商用ではない）。比べるのは Vercel Pro（月 $20）と Cloudflare Workers Paid（月 $5）。移る前に、AI 窓口を1つ Workers で動かして CPU 時間を測る
  - 利用者が増えて、Vercel の無料枠を超えそうなとき
  - サーバーから Firestore を読む必要が出たとき（案B が有力になる）

## 聞かれたときの答え方

> Q. なぜ Vercel を使っているのですか？ Cloudflare のほうが無料枠が広いのでは？

今は非商用の段階で、テストをしながらアプリをデバッグしている段階なので、商用にする必要をあまり感じていません。容量も、200人に使ってもらう想定で試算して、Vercel の無料枠の数 % で足りることを確かめました。Cloudflare は静的ファイルの配信が無制限で、商用にするなら月 $5 と安いのですが、無料プランは1回の処理の CPU 時間が 10ms までで、ID トークンの検証や大きな JSON のパースをする AI 窓口では超える可能性が高いです。なので、商用で使うことになったときに、Vercel Pro と Cloudflare の有料プランを比べて変更します。

- よくある追加の質問：CPU 時間の 10ms には、Gemini の応答を待つ時間も入るのですか？
  - 答え：入りません。CPU 時間は CPU が実際にコードを実行していた正味の時間で、`fetch` の応答を待っている時間は含みません。超えるかどうかは、署名の検証や JSON のパースのような計算の重い処理で決まります
