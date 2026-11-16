# Implementation Plan

> 利用者から見た動き（画面に出る内容・形・口調・失敗したときの扱い）は変えない。各タスクのあとに `npm run build` が通ることを確かめてから次へ進む。
> 試しの画面（`npm run check:ui`）は AI 窓口を偽物の応答に差しかえるので、本物の Gemini の返答（形・口調）は確かめられない。本物の確認は、最後に作者が本番で行う（タスク 4.4）。
> テストの仕組みがないので、サーバー側の部品は、作業用のフォルダに置く使い捨てのスクリプトで確かめる（リポジトリには入れない）。
> 期限：2026-12-01 より前に本番に出す。

- [x] 1. 準備
- [x] 1.1 新しい SDK を入れる
  - Node.js が 22 以上であることを確かめ、`@google/genai` の 3.3 系を `package.json` の依存に足す。古い `@google/generative-ai` は、使っているコードを書きかえるまで残す（タスク 3.4 で外す）
  - SDK の型で、`interactions.create` の引数（`model`・`input`・`system_instruction`・`response_format`・`store`）、返り値の `output_text`、SDK 自身のやり直しを切るリクエストのオプションの名前、投げるエラーの種類と status の持ち方を確かめ、下の Implementation Notes に書く
  - `npm ls @google/genai` が 3.3 系を表示し、ビルドが通る
  - _Requirements: 3.1_

- [x] 2. サーバー側の部品
- [x] 2.1 Gemini を1回呼ぶ部品を作る
  - `api/_lib/geminiClient.ts` に `generateJson({ apiKey, model, systemInstruction, prompt, responseSchema })` を作る。Interactions API を1回だけ呼び、`store: false` と JSON Schema の `response_format` を付け、SDK 自身のやり直しを切る。返答の文字列が空ならエラーを投げる
  - `fetch` を差しかえた使い捨てのスクリプトで、送った依頼に `store: false`・モデル名・`response_format` が入っていること、503 が返ったときに SDK が自分でやり直さず、エラーがそのまま投げられることを確かめてある
  - _Depends: 1.1_
  - _Requirements: 1.1, 1.2, 1.3, 2.6, 3.1, 3.3_

- [x] 2.2 (P) 3つの返答の形を定義する
  - `api/_lib/responseSchemas.ts` に、相談・時間割の生成・成績のリアクションの JSON Schema と、`JSON.parse` したあとの値を確かめる型ガードを作る。項目の名前は、今のプロンプトと `src/services/aiApi.ts` のレスポンスの型と同じにする。`any` を使わない
  - 使い捨てのスクリプトで、型ガードが、正しい形を通し、項目が足りない形・型が違う形・配列でない形を通さないことを確かめてある
  - _Boundary: responseSchemas_
  - _Requirements: 1.1, 1.2, 1.3, 2.5_

- [x] 2.3 (P) やり直しの部品を新しいモデルとエラーに合わせる
  - `api/_lib/geminiRetry.ts` のモデル名を `PRIMARY_MODEL = "gemini-3.5-flash-lite"`・`FALLBACK_MODEL = "gemini-2.5-flash-lite"` にする。古い SDK のエラーのクラスを使っている判定を、新しい関数 `getGeminiErrorStatus(error: unknown): number | undefined`（`status` か `statusCode` の数値を読む）に置きかえる。やり直しの回数・待ち時間・時間の予算・404 のときの動きは変えない
  - 使い捨てのスクリプトで、`getGeminiErrorStatus` が `status` を持つエラー・`statusCode` を持つエラー・どちらもないエラーで正しい値を返すこと、`withGeminiRetry` が 503 で待ってやり直し、続けば予備のモデルで1回だけ試し、404 ではすぐ予備で試し、400 ではやり直さないことを確かめてある（待ち時間は短くして流す）
  - `geminiRetry.ts` が古い SDK を import していない
  - _Boundary: geminiRetry_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6, 4.1, 4.2_

- [ ] 3. 窓口を新しい部品に置きかえる
- [x] 3.1 相談の窓口を置きかえる
  - `api/consultation.ts` の Gemini の呼び出しを `withGeminiRetry` ＋ `generateJson`（相談の形）に置きかえ、`sanitizeJsonResponse` を外して `JSON.parse` と型ガードで読む。どちらかが失敗したら今までと同じ代わりの返答を返す。書きかえる `catch` は `unknown` にする。プロンプトと `systemInstruction` の中身は変えない
  - ビルドが通り、`api/consultation.ts` が古い SDK を import していない
  - _Depends: 2.1, 2.2, 2.3_
  - _Requirements: 1.1, 1.4, 2.5, 3.2, 3.3_

- [x] 3.2 (P) 時間割の生成の窓口を置きかえる
  - `api/timetable-patterns.ts` を 3.1 と同じ形に置きかえる（時間割の生成の形）。ピンの指示はプロンプトのまま残す
  - ビルドが通り、`api/timetable-patterns.ts` が古い SDK を import していない
  - _Boundary: timetable-patterns_
  - _Depends: 2.1, 2.2, 2.3_
  - _Requirements: 1.2, 1.4, 2.5, 3.2, 3.3_

- [ ] 3.3 (P) 成績のリアクションの窓口を置きかえる
  - `api/grade-reaction.ts` を 3.1 と同じ形に置きかえる（成績のリアクションの形）。成績が1つも入っていないときの「未評価」の返答は今のまま
  - ビルドが通り、`api/grade-reaction.ts` が古い SDK を import していない
  - _Boundary: grade-reaction_
  - _Depends: 2.1, 2.2, 2.3_
  - _Requirements: 1.3, 1.4, 2.5, 3.2, 3.3_

- [ ] 3.4 チャットの窓口を合わせ、古い SDK を外す
  - `api/chatbot.ts` の Gemini の呼び出しを新しい SDK（Interactions API、`store: false`、会話の履歴は依頼に含めて送る）に合わせる。前処理で 410 を返す動きは変えない
  - `package.json` から `@google/generative-ai` を外す
  - `api/` と `src/` のどこにも `@google/generative-ai` の import がなく、ビルドが通る
  - _Depends: 3.1, 3.2, 3.3_
  - _Requirements: 3.4_

- [ ] 4. 確かめて、文書を合わせて、本番に出す
- [ ] 4.1 全体を確かめる
  - `npm run build` と `npm run check:ui` がすべて通る。lint の指摘がこの spec の前から増えておらず、この spec で書いたコードに `any` がない
  - 本番のビルドの出力（`dist/`）に、新しい SDK と API キーの変数名が入っていない（Gemini はサーバー側だけ）
  - モデル名が `api/_lib/geminiRetry.ts` の1か所にだけ書かれている
  - _Depends: 3.4_
  - _Requirements: 1.5, 3.1, 3.2, 4.2, 5.1_

- [ ] 4.2 steering を合わせる
  - `tech.md`：技術スタックの AI の行（SDK・モデル名）、API の共通パターン（Interactions API・`store: false`・structured outputs と型ガード・`getGeminiErrorStatus`・SDK のやり直しを切ること）、Node.js 22 以上。`structure.md`：`api/_lib/` の2つの新しいファイル。`roadmap.md`：第2段階の一覧にこの spec を足す
  - steering の中に `@google/generative-ai`・`gemini-2.5-flash`（予備の `gemini-2.5-flash-lite` を除く）・`sanitizeJsonResponse` の古い記述が残っていない
  - _Depends: 4.1_
  - _Requirements: 4.2, 5.4_

- [ ] 4.3 本番での確認の手順をまとめる
  - `production-check.md` に、作者が本番で行う確認を書く：相談・時間割の生成（ピンあり）・成績のリアクションを使い、返答の形・口調・文字数のめやすが今までどおりか。口調が崩れたときに知らせてほしいことと、戻し方（revert）
  - 作者に渡せる形になっている
  - _Depends: 4.1_
  - _Requirements: 1.4, 5.2_

- [ ] 4.4 本番に出し、作者が確かめる
  - 作者の「マージして」の指示で `main` に入れ、2026-12-01 より前に本番に出す
  - 作者が `production-check.md` の手順で確かめる。口調や文字数が崩れていたら、作者の確認のうえでプロンプトと `systemInstruction` を調整して出し直す
  - 作者の確認が終わったら、`roadmap.md` のこの spec を完了にする
  - _Depends: 4.2, 4.3_
  - _Requirements: 1.4, 5.3_

## Implementation Notes
- 1.1（SDK の確認。`@google/genai` 3.3.0、`fetch` を差しかえて確かめた）：
  - 呼び方：`new GoogleGenAI({ apiKey }).interactions.create({ model, input, system_instruction, store, response_format: { type: 'text', mime_type: 'application/json', schema } }, { retries: { strategy: 'none' } })`。送り先は `POST https://generativelanguage.googleapis.com/v1/interactions`。送った本文に `store: false`・モデル名・`response_format` がそのまま入る
  - 返り値の `output_text` は、応答の `steps` の最後の `model_output` の `text` を SDK がつないだもの。文章がなければ `output_text` は付かない（`undefined`）
  - SDK 自身のやり直し：何も指定しないと 503 で5回送る。2つ目の引数に `{ retries: { strategy: 'none' } }` を渡すと1回だけ
  - エラー：503 は `InternalServerError`、429 は `RateLimitError`、404 は `NotFoundError`、400 は `BadRequestError`。どれも `status` と `statusCode` の両方に数値の HTTP の status を持つ
  - この環境では、リポジトリの Playwright（1.56.1）が求める Chromium の版がなかったので、作業用のフォルダのラッパー（`chromium.launch` に `executablePath: '/opt/pw-browsers/chromium'` を足して `checks/ui/run.mjs` を読む）で `check:ui` を流した。リポジトリの試しの画面は変えていない。移行の前の基準：122 / 122、lint 32 件
