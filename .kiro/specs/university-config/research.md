# Research & Design Decisions: university-config

## Summary

- **調査の種類**：既存の機能の拡張（light discovery）。コードの中の会津大学に固有の値の場所を調べた
- **主な発見**
  1. 会津大学に固有の値は、`src/config/universityConfig.ts` だけでなく、画面・hooks・utils・初期値・AI 窓口に散らばっている（下の表）
  2. 成績の段階は利用者の保存データ（`userProfile.gradingScale`）から読んでいて、12か所で使われている。AI 窓口（`api/grade-reaction.ts`）も、ブラウザから送られた段階で GPA を計算している（`api/` と `src/` は互いに import しない）
  3. 試しの画面は、Vite の `resolveId` で import の先を差しかえる仕組みを持っている（`checks/ui/vite.config.ts`）。同じ仕組みで、今の大学の設定を試しの大学に差しかえられる

## Research Log

### 会津大学に固有の値の場所（2026-11-17）

| 値 | 場所 |
|------|------|
| 大学名・最後の時限・最大時限の下限 | `src/config/universityConfig.ts`、`userProfile.university`（初期値）、ダッシュボードのプロフィールの表示 |
| 学期制の名前 | `userProfile.termSystem`（初期値 `'4学期制'`）、ダッシュボードのプロフィールの表示 |
| 成績の段階 | `userProfile.gradingScale`（初期値 A=4・B=3・C=2・D=0・F=0）。`utils/grades.ts`・`utils/courseFilter.ts`・`hooks/useAvailableCourses.ts`・`context/AppContext.tsx`（新学期へ進む）・画面（成績入力・ダッシュボードの GPA シミュレーター・振り返り・科目選択）・`services/aiApi.ts`（AI に送る）・`api/_lib/validation.ts`・`api/grade-reaction.ts` |
| 科目の条件（`target_bit`）の読み取り | `utils/targetBit.ts`（学年 bit0-5・クォーター bit6-7・学期 bit8-9・再履修 bit10）。`utils/courseFilter.ts`・`utils/timetable.ts`・`utils/timetableMock.ts`・`hooks/useAvailableCourses.ts`・科目選択の画面から使う |
| クォーターの名前（Q1〜Q4） | `hooks/useTimetableGrid.ts`・`hooks/useTimetablePatterns.ts`（前期＝Q1/Q2、後期＝Q3/Q4） |
| 学期の名前（前期・後期・通年） | `utils/targetBit.ts`・ダッシュボード・科目選択の画面 |
| 曜日（月〜土） | `hooks/useTimetableGrid.ts`・`hooks/useTimetablePatterns.ts`（`workingDays` で 5 か 6 日に切る）、`utils/timetable.ts` の `DAYS`（月〜金） |
| 学年の範囲（1〜6） | 条件の画面、`utils/targetBit.ts`（bit0-5）、「新学期へ進む」（上限6） |
| ベースクラスの選択肢 | 条件の画面（1〜2年は C1〜C6、3年以上は CS・IT-SPR・SY・CN・IT-CMV・SE-DE） |

### 成績の段階と D
- 合否：`utils/grades.ts` は、成績のラベルを段階から引き、ポイントが 0 より上なら合格、0 なら不合格。段階にないラベルは「ポイントなし」で、合格にも不合格にもならない
- 会津大学の段階から D を外すと、すでに入っている D は「段階にないラベル」になり、不合格として数えられなくなる。D を F と同じに扱う決まりが要る（作者の決定 2）

## 作者に選んでもらうこと（設計の前）

1. 大学ごとの設定の置き方
2. 科目の条件（`target_bit`）の読み取り方を、設定でどう持つか
3. 試しの大学への切りかえ方
4. AI の成績のリアクションに渡す成績の段階
