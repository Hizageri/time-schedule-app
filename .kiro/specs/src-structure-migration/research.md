# Research & Design Decisions

## Summary
- **Feature**: `src-structure-migration`
- **Discovery Scope**: Extension（今のコードの置き場所を変える。動きは変えない）。軽い調査：今のファイルの export と、どこから使われているかを洗い出した
- **Key Findings**:
  - 学期・クォーターの判定は9か所あるが、意味はすべて同じ（学期：`(bit >> 8) & 3` が 2＝通年なら常に対象、それ以外は今の学期と一致すれば対象。クォーター：`(bit >> 6) & 3` が 0＝奇数Q・1＝偶数Q・2＝またぎ・3＝集中）。結果を変えずに1か所の関数にまとめられる
  - コマ表のセル探しは、ダッシュボード（確定済みの授業）と生成画面（選んだ科目＋割り当て＋退避）で、入力は違うが判定（学期 → クォーター → 集中講義は除く → コマを含む）は同じ。「授業の一覧」を受け取る1つの関数にまとめ、入力の作り方だけを画面ごとの hook に残せる
  - `ProposalScreen`・`GeneratorScreen`・`GradeInputScreen` が通信（`ai/aiService.ts`）を直接呼んでいる。目標の構成では画面から通信を直接呼べないので、画面ごとに小さな hook が要る
  - ESLint は `**/*.{ts,tsx}` だけ、型チェック（`tsconfig.app.json`）は `src` だけを見る。試しの画面を `src/` の外に置けば、本番のビルドに入らない

## Research Log

### ファイルの export と使われ方
- **Sources Consulted**: `src/` の全ファイル（`grep` で export と import を一覧）
- **Findings**:
  - `logic/types.ts`：型（`TimeSlot`・`ClassInfo`・`CourseData`・`GradingScale`・`AppState`・`ChatMessage`）に加えて、値（`defaultState`）と未使用の関数（`calculateStudentBit`・`canTakeClass`）がある
  - `logic/timetableGenerator.ts`：ビットのラベル（`getTargetGrades`・`getTermLabel`・`getQuarterLabel`・`getPeriodLabel`・`isRetakeCourse`）、絞り込み（`filterByBit`・`isRetakeCandidate`）、合否（`isPassingGradePoint`・`isCoursePassed`・`isCourseFailed`）、時間割（`resolveClassAssignments`・`getLatestPeriod`）、未使用のモック（`generateTimetables`）が1つのファイルに混ざっている
  - `logic/utils.ts`：`cn`・`getSubjectColor`・未使用の `checkScheduleConflict`・`parseTimeSlot`・`DAYS`・`PERIODS`・年月の関数
  - `ui/styles/App.css` はどこからも読み込まれていない（未使用。移すだけで消さない）
- **Implications**: `utils/` は役割ごとにファイルを分ける。未使用のものも移して残す

### 試しの画面をリポジトリに入れる方法
- **Context**: 要件 5
- **Findings**:
  - 第1段階で作った試しの画面は、Vite の `resolveId` で `firebase/auth`・`firebase/firestore`・`src/lib/firebase` を偽物に差し替え、Playwright で `window.__h`（ログイン・保存データ・`setDoc` の記録）を操作している。差し替えは import の名前（`lib/firebase` で終わる）で決めているので、`lib/` の場所が変わらなければ移行の前後で同じように動く
  - 入口は、今は `components/App` を直接読み込んでいる。移行で `App.tsx` の場所が変わるので、本物の入口 `src/main.tsx` を読み込む形にすれば、移行の前後で同じ（5.4）。本物の入口は `StrictMode` で描画するので、今までの試しの画面（`StrictMode` なし）より本物に近くなる
  - Tailwind の対象のファイルは作業フォルダ基準なので、Vite はプロジェクトのフォルダから起動する（`student-period` の Implementation Notes）
  - Playwright 1.56.1 が開発環境にある。リポジトリには `devDependencies` に `playwright` を足す。作者のパソコンでは最初に1回だけブラウザを入れる（`npx playwright install chromium`）
- **Implications**: `checks/ui/`（ルート）に置き、`npm run check:ui` で流す。外への通信は Playwright で止める（5.3）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations |
|--------|-------------|-----------|---------------------|
| 一度に全部移す | すべてのファイルを1回で移す | 作業の回数が少ない | 動きが変わったときに原因が分かりにくい |
| 3段階で移す（採用） | `roadmap.md` の確認の段階どおり、型・計算・通信・状態 → 重複のまとめと hooks → UI 部品 | 段階ごとに試しの画面で確かめられ、原因を絞れる | 途中の段階では、古い場所と新しい場所が混ざる |

## Design Decisions

### Decision: `utils/` を役割ごとのファイルに分ける
- **Selected Approach**: `targetBit.ts`（ビットの読み取りとラベル）・`courseFilter.ts`（受講できる科目）・`grades.ts`（合否）・`timetable.ts`（時間割の計算）・`studentPeriod.ts`（年月）・`subjectColor.ts`・`classNames.ts`・`timetableMock.ts`（未使用のモック）
- **Rationale**: 後続の `university-data-model` は「ビットの意味を大学ごとの設定にする」ので、ビットの読み取りが `targetBit.ts` 1つに集まっていると直す場所が1つで済む

### Decision: セル探しは「授業の一覧を受け取る関数」にする
- **Context**: ダッシュボードと生成画面で、授業の一覧の作り方が違う
- **Selected Approach**: `findClassesInSlot(entries, slot, term, activeQuarter)`。`entries` は `{ courseId, classId, schedule, targetBit }` の配列。ダッシュボードは確定済みの授業を、生成画面は「退避していない科目 × 割り当てたクラス」を渡す
- **Trade-offs**: 生成画面は、ビットを `classInfo.target_bit ?? course.target_bit`、ダッシュボードは `committedClasses` の `targetBit` を使う。この違いは一覧を作る hook に残す（3.3）

### Decision: 画面から通信を呼ぶところに小さな hook を置く
- **Context**: 要件 2.3・2.4 と、「後続の spec が使わない画面の整理はしない」（Out of scope）の両立
- **Selected Approach**: 相談（画面4）と成績のリアクション（画面7）は、AI を呼ぶ部分だけを `useConsultation`・`useGradeReaction` に出す。画面の中の表示のための小さな計算（GPA シミュレーター、成績入力の一覧など）は、この spec では画面に残し、`structure.md` に「残っているもの」として書く
- **Rationale**: 依存の向き（画面は通信を直接呼ばない）は全画面で守り、画面の作りの整理は後の spec に回す

### Decision: 設定は `config/` に置く（作者が決定、2026-10-30）
- `config/universityConfig.ts`・`config/inputLimits.ts`。値と、値から作る小さな関数（`getSelectablePeriods`）を置く。React・通信・Firebase は使わない

### Decision: 試しの画面は本物の入口（`src/main.tsx`）を読み込む
- **Rationale**: 移行で `App.tsx` の場所が変わっても、試しの画面を直さずに流せる（5.4）
- **Follow-up**: `StrictMode` で今までの確認がすべて通るかを、最初のタスク（移行の前）で確かめる。通らない確認があれば、移行の前のコードの動きとして記録し、試しの画面の側を合わせる

## Risks & Mitigations
- Firestore 同期を hook に分けるときに、保存のタイミング（3秒・閉じるとき・ログアウトの前・利用者の切り替え）が変わる → 保存の確認（読み込み前に保存しない・まとめる・すぐ書く・失敗の扱い）を、分ける前と後の両方で流す
- 移す途中で import の書き換え漏れがあると、ビルドは通っても試しの画面で落ちる → 各段階のあとにビルドと試しの画面の両方を流す
- 試しの画面がリポジトリに入ると、偽物の部品が本番に入るおそれ → `src/` の外に置き、本番のビルドの出力に偽物の文字列（`window.__h`）がないことを確かめる
