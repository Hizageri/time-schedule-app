# Requirements Document

## Project Description (Input)
**誰が困っているか**：コマどりの利用者と作者。AI の3つの機能（相談・時間割の生成・成績のリアクション）は、サーバー側の `api/` から Gemini API を呼んで動いている。

**今の状況**：メインのモデル `gemini-2.5-flash` が deprecated になり、2026-12-01 から Google 側で自動的に `gemini-3.5-flash-lite` に振り向けられる（料金も振り向け先のもの）。コードと実際に動くモデルが食い違い、コマどり先輩の口調や返答の JSON の形が変わっても気づきにくい。予備のモデル `gemini-3.1-flash-lite` も 2027-05-07 に終了する予定。SDK は古い `@google/generative-ai` のままで、`@google/genai` への移行が `tech.md` に予定として残っている。

**何を変えるか**：2026-12-01 より前に、メインのモデルを `gemini-3.5-flash-lite` に変え、予備のモデルを見直し、SDK を `@google/genai` に移行する。AI の3つの窓口の返答の JSON の形とコマどり先輩の口調が保たれることを、試しの画面と本番で確かめる。期限：2026-12-01 より前に本番に出す。

## Requirements
<!-- Will be generated in /kiro-spec-requirements phase -->
