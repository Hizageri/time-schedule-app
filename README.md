# コマどり! 〜コマどり先輩と組む時間割〜

シラバスと先輩の口コミをもとに、AI の「コマどり先輩」と相談しながら時間割を作れる、大学生向けの Web アプリです。
まずは会津大学で運用し、その実績をもとに全国の大学への展開を目指しています。

**アプリ：https://time-schedule-app-two.vercel.app/**（Google アカウントでログインして使えます）

## できること

- 科目選び：学年・学期・クラスに合わせて、今の自分が取れる科目だけを自動で表示
- AI に相談：選んだ科目となりたい職業をもとに、コマどり先輩がアドバイス
- 時間割の自動作成：「全休を増やす」「1限を避ける」など、方針の違う時間割を提案
- 成績の記録：成績を入力すると GPA を計算し、合格した科目を次の学期へ引き継ぐ

## こだわり

- リアルな口コミ：先輩約 150 人に聞き込みをして口コミを集め、課題の量・テストの重さ・出席の厳しさなどを数値化。シラバスだけでは分からない情報をもとに時間割を作れます
- 仕様書から作る開発（cc-sdd）：技育博でいただいたフィードバックをもとに、仕様書を「正解」として先に書き、それに沿ってコード全体を作り直しています
- 全国展開を見据えた設計

## 技術構成

| 分類 | 使用技術 |
|------|----------|
| フロントエンド | React 19 / TypeScript / Vite / Tailwind CSS |
| 認証・DB | Firebase Authentication（Google ログイン）/ Cloud Firestore |
| AI | Gemini API（Vercel Functions 経由。API キーはサーバー側のみ） |
| ホスティング | Vercel |

## フォルダ構成

```
time-schedule-app/
├── .claude/                                     # cc-sdd のスキル
│   └── skills/                                  # 開発手順（/kiro-*）
│       ├── kiro-debug/
│       │   └── SKILL.md
│       ├── kiro-discovery/
│       │   └── SKILL.md
│       ├── kiro-impl/
│       │   ├── templates/
│       │   │   ├── debugger-prompt.md
│       │   │   ├── implementer-prompt.md
│       │   │   └── reviewer-prompt.md
│       │   └── SKILL.md
│       ├── kiro-review/
│       │   └── SKILL.md
│       ├── kiro-spec-batch/
│       │   └── SKILL.md
│       ├── kiro-spec-design/
│       │   ├── rules/
│       │   │   ├── design-discovery-full.md
│       │   │   ├── design-discovery-light.md
│       │   │   ├── design-principles.md
│       │   │   ├── design-review-gate.md
│       │   │   └── design-synthesis.md
│       │   └── SKILL.md
│       ├── kiro-spec-init/
│       │   └── SKILL.md
│       ├── kiro-spec-quick/
│       │   └── SKILL.md
│       ├── kiro-spec-requirements/
│       │   ├── rules/
│       │   │   ├── ears-format.md
│       │   │   └── requirements-review-gate.md
│       │   └── SKILL.md
│       ├── kiro-spec-status/
│       │   └── SKILL.md
│       ├── kiro-spec-tasks/
│       │   ├── rules/
│       │   │   ├── tasks-generation.md
│       │   │   └── tasks-parallel-analysis.md
│       │   └── SKILL.md
│       ├── kiro-steering/
│       │   ├── rules/
│       │   │   └── steering-principles.md
│       │   └── SKILL.md
│       ├── kiro-steering-custom/
│       │   ├── rules/
│       │   │   └── steering-principles.md
│       │   └── SKILL.md
│       ├── kiro-validate-design/
│       │   ├── rules/
│       │   │   └── design-review.md
│       │   └── SKILL.md
│       ├── kiro-validate-gap/
│       │   ├── rules/
│       │   │   └── gap-analysis.md
│       │   └── SKILL.md
│       ├── kiro-validate-impl/
│       │   └── SKILL.md
│       └── kiro-verify-completion/
│           └── SKILL.md
├── .kiro/                                       # 仕様書（cc-sdd）
│   ├── settings/                                
│   │   └── templates/                           # 仕様書のひな形
│   │       ├── specs/
│   │       │   ├── design.md
│   │       │   ├── init.json
│   │       │   ├── requirements-init.md
│   │       │   ├── requirements.md
│   │       │   ├── research.md
│   │       │   └── tasks.md
│   │       ├── steering/
│   │       │   ├── product.md
│   │       │   ├── structure.md
│   │       │   └── tech.md
│   │       └── steering-custom/
│   │           ├── api-standards.md
│   │           ├── authentication.md
│   │           ├── database.md
│   │           ├── deployment.md
│   │           ├── error-handling.md
│   │           ├── security.md
│   │           └── testing.md
│   └── steering/                                # プロジェクト全体の仕様書
│       ├── data-model.md                        # データの形
│       ├── deployment.md                        # 公開・外部設定
│       ├── product.md                           # 目的・機能
│       ├── structure.md                         # 構成ルール
│       └── tech.md                              # 技術選定
├── api/                                         # サーバー側（Vercel Functions）
│   ├── _lib/                                    # 共通処理
│   │   └── geminiRetry.ts                       # AI の再試行・予備モデル
│   ├── chatbot.ts                               # チャット
│   ├── consultation.ts                          # 科目選びの相談
│   ├── grade-reaction.ts                        # 成績へのリアクション
│   └── timetable-patterns.ts                    # 時間割の生成
├── docs/                                        # 資料
│   └── archive/                                 # 過去の仕様書
│       └── specs-2026-10/
│           ├── 01_requirements.md
│           ├── 02_architecture.md
│           ├── 03_schema.md
│           └── 04_tasks.md
├── src/                                         # アプリ本体
│   ├── ai/                                      # AI 呼び出し
.....

## 今後の予定

- 空き時間に入れられる科目を探せる「空きコマ検索」
- UI の全面見直し
- シラバスのデータベース化と、他大学への展開
