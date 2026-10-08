# CLAUDE.md

会津大学生向けの AI 時間割作成アプリ。React + TypeScript + Vite / Firebase（Auth・Firestore）/ Vercel Functions + Gemini。

## 開発の進め方（cc-sdd）

- このプロジェクトは spec 駆動で開発する。**実装の前に必ず `specs/` を読むこと**
  - `specs/01_requirements.md`：要件定義（画面・機能・業務ルール）
  - `specs/02_architecture.md`：技術選定（構成・データの流れ・API・外部サービス設定）
  - `specs/03_schema.md`：型定義の案（正はここ）
  - `specs/04_tasks.md`：実装の順番（タスク）と、付録に既知の課題一覧
- `specs/` に書かれていない仕様を勝手に追加しない。必要なら先に spec の変更を提案する
- 1回の依頼では1タスクだけ進める。着手前に修正方針を説明し、了承を得てから実装する
- タスクが終わったら `04_tasks.md` にチェックを入れ、関連する spec も更新する

## 型のルール

- データ構造を変えるときは、`specs/03_schema.md` を先に更新してから `src/types/` に反映する
- `src/types/` だけを直接変えない（spec にない UI 専用の型は例外）
- `src/` から `specs/` を import しない
- 新しいコードで `any` を使わない

## ディレクトリのルール（移行先）

- `components/`：汎用UI / `pages/`：画面 / `hooks/`：ロジック / `context/`：グローバル状態
- `utils/`：UIを持たない純粋関数 / `lib/`：外部ライブラリの初期化（firebase など）
- `types/`：型 / `data/`：固定JSON / `assets/`：静的素材
- コンポーネントから `firebase/*` を直接 import しない（`lib/` と `hooks/` を経由する）

## セキュリティ

- APIキーや秘密情報をコードや commit に含めない。`.env` は絶対に commit しない
- Gemini は必ず `api/`（サーバー側）から呼ぶ。`VITE_` から始まる変数に秘密情報を入れない

## コマンド

- `npm run dev`：開発サーバー（`/api` も動く）
- `npm run build`：型チェック＋ビルド
- `npm run lint`：ESLint
- `npm run build:reviews`：口コミJSONの再生成


# Agentic SDLC and Spec-Driven Development

Kiro-style Spec-Driven Development on an agentic SDLC

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/kiro-spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro-steering`, `/kiro-steering-custom`
- Discovery: `/kiro-discovery "idea"` — determines action path, writes brief.md + roadmap.md for multi-spec projects
- Phase 1 (Specification):
  - Single spec: `/kiro-spec-quick {feature} [--auto]` or step by step:
    - `/kiro-spec-init "description"`
    - `/kiro-spec-requirements {feature}`
    - `/kiro-validate-gap {feature}` (optional: for existing codebase)
    - `/kiro-spec-design {feature} [-y]`
    - `/kiro-validate-design {feature}` (optional: design review)
    - `/kiro-spec-tasks {feature} [-y]`
  - Multi-spec: `/kiro-spec-batch` — creates all specs from roadmap.md in parallel by dependency wave
- Phase 2 (Implementation): `/kiro-impl {feature} [tasks] [--review required|inline|off]`
  - Without task numbers: autonomous mode (subagent per task + independent review + final validation)
  - With task numbers: manual mode (selected tasks in main context, still reviewer-gated before completion)
  - `--review off` skips task-local review; use it intentionally and keep `/kiro-validate-impl {feature}` as the final quality gate
  - `/kiro-validate-impl {feature}` (standalone re-validation)
- Progress check: `/kiro-spec-status {feature}` (use anytime)

## Skills Structure
Skills are located in `.claude/skills/kiro-*/SKILL.md`
- Each skill is a directory with a `SKILL.md` file
- Skills run inline with access to conversation context
- Skills may delegate parallel research to subagents for efficiency
- Additional files (templates, examples) can be added to skill directories
- `kiro-review` — task-local adversarial review protocol used by reviewer subagents
- `kiro-debug` — root-cause-first debug protocol used by debugger subagents
- `kiro-verify-completion` — fresh-evidence gate before success or completion claims
- Use skills explicitly requested by the user and skills relevant to the task's domain, including design, accessibility, and UX.
- Select skills from their descriptions or metadata first, then read only the selected skills and the references needed for the task.
- Follow explicit host and project rules and retain required workflow checks. Do not skip relevant skills just because the task is small.

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro-spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- For spec and implementation work, load the core steering files below from `.kiro/steering/`. Reuse current context rather than rereading unchanged files.
- Load additional steering only when required by project rules or relevant to the task.
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro-steering-custom`)
