# Research & Design Decisions

## Summary
- **Feature**: `student-period`
- **Discovery Scope**: Simple Addition（プロフィールに2項目を足す。既存の保存の流れと画面の作りに乗せる）
- **Key Findings**:
  - 読み込み時に `userProfile` を `defaultState` と1段深く重ねているので、項目を足すだけで今の利用者は自動で未設定（`''`）になる。保存の流れ（`AppContext`）は変えなくてよい
  - AI の依頼（`aiService.ts` の `generateConsultation`・`generateGradeReaction`）は `userProfile` を丸ごと送っている。サーバーは知らない項目を使わないが、要件 5.1「AI の依頼に含めない」を満たすには、送る項目をブラウザ側で絞る必要がある
  - オンボーディングは入力のたびに `updateProfile` で状態に書く作り。年月は「年だけ選んだ」途中の状態を `"YYYY-MM"` の形で持てないので、画面の中に下書きを持ち、「次へ」で確かめてから書く

## Research Log

### 既存の保存と読み込み
- **Context**: 今の利用者に年月がないときの扱い（4.2）
- **Sources Consulted**: `src/logic/AppContext.tsx`（読み込み時の重ね合わせ）、`.kiro/steering/data-model.md`
- **Findings**: `userProfile: { ...defaultState.userProfile, ...(remoteData.userProfile || {}) }` で重ねている。保存は `merge` なしで状態を丸ごと書く
- **Implications**: `defaultState` に `''` を足すだけでよい。データの移し替えは要らない

### AI の依頼に入るプロフィール
- **Context**: 要件 5.1
- **Sources Consulted**: `src/ai/aiService.ts`、`api/_lib/validation.ts`（`parseProfile`・`validateGradeReactionInput`）
- **Findings**: サーバーが使うのは `nickname`・`dreamJob`・`university`（成績のリアクションはさらに `gradingScale`）。ブラウザは `userProfile` を丸ごと送っている
- **Implications**: `aiService.ts` で、サーバーが使う項目だけを選んで送る。サーバー側（`api/`）は変えない

### 年月の入力欄
- **Context**: どの端末でも同じように選べること
- **Findings**: 年月の入力欄（`<input type="month">`）は、ブラウザによってカレンダーが出ずに文字入力になる。年と月のプルダウン2つなら、どこでも同じ
- **Implications**: 年（今年の前後4年）と月（1〜12）の `<select>` を使う

## Design Decisions

### Decision: 新しいファイルを作らない
- **Context**: 作者の方針「設計はなるべくシンプルに」（2026-10-29）
- **Alternatives Considered**:
  1. 年月の部品（`components/YearMonthSelect.tsx`）と関数のファイル（`logic/studentPeriod.ts`）を新しく作る
  2. 関数は今の `logic/utils.ts` に置き、プルダウンは2つの画面にそれぞれ書く
- **Selected Approach**: 2
- **Rationale**: 変えるファイルが今あるものだけになり、`structure.md` のファイル一覧も増えない。確かめる処理（形・前後・年の範囲）は関数にまとめるので、画面に書くのはプルダウンの見た目だけになる
- **Trade-offs**: プルダウンの書き方が2画面に重なる（各20行ほど）。第2段階の `src-structure-migration` や `ui-design-definition` で部品にまとめられる
- **Follow-up**: 2画面の文言・確かめ方が同じ関数を使っていることを確かめる

### Decision: 年月は `"YYYY-MM"` の文字列で持つ
- **Alternatives Considered**: `{ year: number; month: number } | null`
- **Selected Approach**: 文字列。未設定は `''`
- **Rationale**: 今の `userProfile` の項目（`nickname` など）と同じく文字列で、初期値も `''` にそろう。文字列のまま比べると前後が正しく決まる（`"2026-04" < "2030-03"`）
- **Trade-offs**: 形の確かめが要る → `utils.ts` の関数で行う

### Decision: エラーは「次へ」「保存する」を押したあとに出し、直すと消える
- **Rationale**: 年だけ選んだ途中で「月も選んで」と出ると邪魔になる。押したあとは入力に合わせてその場で出し直すので、直せば消える（3.3）

## Risks & Mitigations
- 保存済みの年が、年月がたって選べる範囲（前後4年）の外になる → 選べる年の一覧に、今入っている年を足して、表示と保持ができるようにする
- 年月を入れても AI の依頼に入ってしまう → `aiService.ts` で送る項目を絞り、試しの画面で依頼の本文に年月がないことを確かめる
