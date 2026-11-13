# Research & Design Decisions: gemini-model-migration

## Summary

- **調査の種類**：既存の機能の拡張（light discovery）。外部の API と SDK の変更が中心なので、公式のドキュメントと SDK のパッケージで確かめた
- **調べた範囲**：`api/consultation.ts`・`api/timetable-patterns.ts`・`api/grade-reaction.ts`・`api/chatbot.ts`・`api/_lib/geminiRetry.ts`、`package.json`、Vercel のプロジェクト設定、Gemini API の Pricing・Deprecations・Models・「What's new in Gemini 3.6 Flash and 3.5 Flash-Lite」、`@google/genai` 3.3.0 のパッケージ（README・型定義）
- **主な発見**
  1. `gemini-2.5-flash` は 2026-12-01 に終了し、`gemini-3.5-flash-lite` に自動で振り向けられる。ただし `gemini-3.5-flash-lite` 自体も、公式の説明では「previous-generation（一つ前の世代）」で、より新しい `gemini-3.8-flash` がある
  2. Gemini 3.6 Flash・3.5 Flash-Lite 以降のモデルでは、`temperature` などのサンプリングのパラメータと、モデルの返答を先に書いておく使い方が廃止された。コマどりのコードはどちらも使っていない
  3. `@google/genai` 3.3.0 は Node.js 22 以上が必要。Vercel の関数は Node.js 24.x で動いている

## Research Log

### 今のコードの Gemini の使い方
- 3つの窓口は `new GoogleGenerativeAI(apiKey).getGenerativeModel({ model, systemInstruction }).generateContent(prompt)` を `withGeminiRetry` で包んで呼ぶ。`response.response.text()` で文字列を取り、`sanitizeJsonResponse` で JSON を取り出して `JSON.parse`
- `generationConfig`（`temperature` など）は使っていない。会話の履歴を先に書いておく使い方もしていない
- `api/chatbot.ts`（止めている。常に 410）は `startChat(...).sendMessage(...)` を使っている
- `geminiRetry.ts` は `GoogleGenerativeAIFetchError` の `status`（503・429・404）で、やり直しと予備のモデルへの切りかえを決めている

### `@google/genai`（3.3.0、2026-11-12 更新）
- 出典：npm のパッケージ（README・`dist/node/node.d.ts`）
- 呼び方：`new GoogleGenAI({ apiKey })` → `ai.models.generateContent({ model, contents, config })` → `response.text`
- `config` に `systemInstruction`・`responseMimeType`・`responseJsonSchema`・`thinkingConfig` を渡せる
- エラー：`ApiError`（`status: number` を持つ）
- `engines`：`node >= 22.0.0`。Vercel のプロジェクトの設定は `nodeVersion: 24.x`（Vercel の API で確認）
- `@google/generative-ai` は 0.24.1 のまま

### モデル（2026-11-13 時点、公式の Pricing・Deprecations）

| モデル | 無料の枠 | 有料の枠（100万トークン、入力／出力） | 終了日 |
|------|------|------|------|
| `gemini-2.5-flash`（今のメイン） | あり | $0.30 ／ $2.50 | 2026-12-01（`gemini-3.5-flash-lite` に振り向け） |
| `gemini-3.1-flash-lite`（今の予備） | あり | $0.25 ／ $1.50 | 2027-05-07（後継は `gemini-3.5-flash-lite`） |
| `gemini-3.5-flash-lite` | あり | $0.30 ／ $2.50 | 発表なし |
| `gemini-3.6-flash` | あり | $0.75 ／ $3.75（2026-12-31 まで）、$1.50 ／ $7.50（2027-01-01 から） | 発表なし |
| `gemini-3.8-flash` | あり | $0.75 ／ $3.75（2026-12-31 まで）、$1.50 ／ $7.50（2027-01-01 から） | 発表なし |
| `gemini-2.5-flash-lite` | あり | $0.10 ／ $0.40 | 発表なし |
| Gemini 4 の各モデル | なし | — | — |

- `gemini-3.5-flash-lite` の公式の説明：「一つ前の世代」。2.5 Flash からの移行先として推奨。推論の評価（HLE）で 2.5 Flash を上回る。3.1 Flash-Lite よりペルソナの一貫性が強い。thinking の既定は `minimal`
- 3.6 Flash・3.5 Flash-Lite 以降の API の変更：`temperature`・`top_p`・`top_k` は無視され、将来は 400 になる。最後の会話がモデルの発言になっている依頼は 400 になる。`thinking_budget` は `thinking_level` に変わった
- 公式の移行ガイドは、新しい Interactions API を勧めている。`generateContent` も引き続き使える

## Synthesis Outcomes

- **一般化**：3つの窓口の「モデルを呼んで文字列を受け取る」部分は同じ形なので、SDK の呼び出しを `api/_lib/` の1か所にまとめると、SDK の入れかえとモデル名の管理（要件 4.2）が1か所で済む
- **作るか使うか**：やり直しと予備のモデルへの切りかえは、今の `withGeminiRetry` をそのまま使い、エラーの判定だけ新しい SDK の `ApiError` に合わせる
- **単純化**：チャットの窓口は動かさないので、呼び出しを新しい SDK に合わせるだけにする

## Design Decisions（作者が決定、2026-11-13）

- **メインのモデル**：`gemini-3.5-flash-lite`（推奨どおり）。比べたもの：`gemini-3.8-flash`、`gemini-2.5-flash-lite`
- **予備のモデル**：`gemini-2.5-flash-lite`（推奨どおり）。比べたもの：`gemini-3.8-flash`、予備を持たない
- **返答の JSON の受け取り方**：structured outputs（推奨どおり）。比べたもの：今のまま（指示＋取り出し）
- **SDK の呼び方**：Interactions API。比べたもの：`generateContent`
  - 公式の説明で、Interactions API は 2026-06 に正式版になり、新しいプロジェクトに推奨。`generateContent` は legacy（サポートは続く）
  - 既定で依頼を Google 側に保存する（無料の枠は1日、有料の枠は55日）。利用者のプロフィールや成績を残さないよう、`store: false` を付ける
  - JS の SDK（3.3.0）は `ai.interactions.create({ model, input, system_instruction, response_format, store })` → `output_text`。`response_format` の JSON Schema では `minLength`・`maxLength` などは守られない
  - Interactions API のエラーは、`generateContent` の `ApiError` とは別の種類のクラス（`APIError` 系・`GoogleGenAiError` 系）で投げられ、status の持ち方（`status`・`statusCode`）が違う。status を読む関数を1つ作って吸収する
  - SDK 自身にもやり直しの仕組みがあるので、`withGeminiRetry` の時間の予算を守るために切る

## Risks & Mitigations

- **新しいモデルで口調や文字数が変わる** → 試しの画面では本物の Gemini を呼ばないので、作者が本番（またはプレビュー）で3つの機能を使って確かめる。崩れたら AI への指示を調整する
- **作者のパソコンの Node.js が 22 より古い** → `@google/genai` が入らない。作業の最初に `node -v` を確かめる手順を入れる
- **期限（2026-12-01）に間に合わない** → 間に合わなくても、Google 側の自動の振り向けで AI の機能は止まらない。ただしコードと実際のモデルが食い違う

## References

- [Gemini API Pricing](https://aistudio.google.com/docs/pricing)
- [Gemini API Deprecations](https://aistudio.google.com/docs/deprecations)
- [What's new in Gemini 3.6 Flash and 3.5 Flash-Lite](https://aistudio.google.com/docs/whats-new-gemini-3.6)
- [Gemini 3.5 Flash-Lite](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite)
- [`@google/genai`（npm）](https://www.npmjs.com/package/@google/genai)
- [Interactions API](https://aistudio.google.com/docs/interactions-overview)
