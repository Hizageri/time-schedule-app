# ADR-0019：文章の生成に Gemini API を使う

- 状態：採用
- 日付：2026-10 以前（アプリを作り始めたとき）
- 関係する spec：`gemini-model-migration`（これから。モデルの切り替え）
- 出典：作者への聞き取り（2026-11-11）、`api/_lib/geminiRetry.ts`、Gemini API の Pricing・Deprecations・Additional Terms of Service

## 背景

科目選びの講評・時間割のパターン・成績へのリアクションの文章を作るために、LLM が必要だった（計算はコードで行い、AI は文章だけ。ADR-0001）。

今の形：サーバー側の `api/` の3つの窓口から、Gemini API を無料の枠で呼んでいる（ブラウザからは呼ばない。ADR-0002）。メインのモデルは `gemini-2.5-flash`（2026-12-01 に終了）、予備は `gemini-3.1-flash-lite`。

## 選択肢

### 案A：Gemini API
- メリット：無料の枠がある。今のコードがそのまま動く
- デメリット：無料の枠では、送った内容が Google の製品の改善に使われ、人が読むこともある。モデルの入れ替わりが速い

### 案B：OpenAI（GPT-5 mini など）
- メリット：structured outputs が成熟している
- デメリット：API に無料の枠がない

### 案C：Anthropic（Claude Haiku 5.5 など）
- メリット：有料の中では安い
- デメリット：API に無料の枠がない

### 案D：無料の枠があるほかのサービス（Groq・OpenRouter など）
- メリット：無料で使える
- デメリット：オープンなモデルが中心で、日本語の質が落ちる可能性がある。3つの窓口の書き直しが要る

## 決めたこと

案A。

## 選ばなかった理由

Gemini を選んだ明確な理由はない。今後、OpenAI など、ほかのサービスに変える可能性がある（作者への聞き取り）。
