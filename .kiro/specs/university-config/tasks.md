# Implementation Plan

> 会津大学の利用者から見た動きは、成績の選択肢から D がなくなることを除いて変えない。各タスクのあとに `npm run build` と `npm run check:ui` が通ることを確かめてから次へ進む。
> 保存データの形（`AppState`）は変えない。
> 画面の HTML の比較で差分が出たら、成績の選択肢の D の分だけであることを確かめてから基準を作り直す（それ以外の差分は不具合として直す）。

- [x] 1. 準備：データの形と大学ごとの設定
- [x] 1.1 `data-model.md` に新しい形を書く
  - `UniversityConfig`（大学名・学期制の名前・学期とクォーター・通年の有無・曜日・時限・学年の範囲・ベースクラス・成績の段階・成績の読みかえ）と、`CourseConditions`（学年・学期・学期の中のどこか・再履修）、`CourseData.conditions`・`ClassInfo.conditions` を書く。保存データ（`AppState`）の型は変えないこと、`userProfile.gradingScale`・`termSystem`・`university` を計算と表示に使わなくなることも書く
  - `data-model.md` が設計の型と一致している
  - _Requirements: 1.1, 2.1, 4.2_

- [x] 1.2 大学ごとの設定と、今の大学を決める部品を作る
  - `config/universityConfig.ts` に型と選択肢を作る関数を置き、`config/universities/aizu.ts`（会津大学）・`test.ts`（試しの大学）・`config/currentUniversity.ts`（開発サーバーで `VITE_UNIVERSITY=test` のときだけ試しの大学）を作る。今の `CURRENT_UNIVERSITY` を使っているところは、`currentUniversity` に置きかえる
  - 本番のビルドの出力（`dist/`）に試しの大学の名前が入っていないことと、開発サーバーで環境変数を付けたときだけ試しの大学になることを確かめてある
  - _Depends: 1.1_
  - _Requirements: 1.1, 1.2, 1.3, 5.1_

- [x] 2. 科目の条件を共通の形にする
- [x] 2.1 シラバスの変換のスクリプトを作る
  - `scripts/build_syllabus.ts` を作り、`npm run build:syllabus` で動かす（Node.js の型を取り除いて動かす仕組みで、`utils/targetBit.ts` をそのまま読み込めるかを最初に確かめる）。会津大学の `target_bit` から共通の形の条件を作り、照らし合わせ（全科目・全クラスで `targetBit.ts` の読み取りと一致）・数・値の範囲・読み取れない値を確かめてから、`src/data/course_conditions.json` に書き出す。元の `syllabus.json` は書きかえない
  - スクリプトを流して生成物ができる。わざとおかしな値を入れた写しで流すと、ファイルを書かずに止まり、科目の名前と理由が出る
  - _Depends: 1.1_
  - _Requirements: 2.1, 4.1_

- [x] 2.2 共通の形の条件を科目に付け、判定の関数を作る
  - `utils/courseConditions.ts` に、共通の形の条件で判定する関数（学年・学期・クォーター・再履修）を作る。`data/index.ts` で、今の大学の科目データに共通の形の条件を結合する（会津大学は `syllabus.json` ＋ `course_conditions.json`、試しの大学は `test_university/courses.json`）
  - 使い捨てのスクリプトで、会津大学の全科目について、新しい判定の関数と `targetBit.ts` の関数の結果が一致することを確かめてある
  - _Depends: 1.2, 2.1_
  - _Requirements: 2.1, 5.1_

- [ ] 3. 計算と表示が設定と共通の形を読むようにする
- [x] 3.1 科目の絞り込みを共通の形の条件にする
  - `utils/courseFilter.ts`・`hooks/useAvailableCourses.ts`・科目選択の画面（学年のラベル・学期のラベル）を、共通の形の条件と大学の設定で動くようにする
  - ビルドと `npm run check:ui` がすべて通る
  - _Depends: 2.2_
  - _Requirements: 2.1, 2.4, 4.1_

- [x] 3.2 時間割の表示を設定と共通の形の条件にする
  - `utils/timetable.ts`・`hooks/useTimetableGrid.ts`・`hooks/useTimetablePatterns.ts` で、曜日・時限・クォーターの名前を大学の設定から読み、生成のプレビューは共通の形の条件で判定する。確定した時間割（保存データの `targetBit`）は、今の会津大学のビットの読み取りのまま
  - ビルドと `npm run check:ui` がすべて通る
  - _Depends: 2.2_
  - _Requirements: 2.2, 4.1, 4.2_

- [x] 3.3 成績の段階を大学の設定から読む
  - `utils/grades.ts` を、大学の設定の成績の段階と読みかえ（D → F）を使う形にし、呼ぶところ（`courseFilter`・`useAvailableCourses`・`AppContext` の新学期へ進む・成績入力・ダッシュボードの GPA シミュレーター・振り返り・科目選択の不合格の印）を直す。成績の選択肢は大学の設定の段階を出す。`services/aiApi.ts` は、成績のリアクションに大学の設定の段階を送る
  - ビルドと `npm run check:ui` が通る。画面の HTML の比較の差分が、成績の選択肢の D の分だけであることを確かめてから、基準を作り直してある
  - _Depends: 1.2_
  - _Requirements: 2.3, 2.5, 3.1, 3.2, 3.3, 3.4, 4.3_

- [ ] 3.4 条件の画面とプロフィールの表示を設定から読む
  - 条件の画面の学年の範囲とベースクラスの選択肢、ダッシュボードのプロフィールの大学名と学期制、「新学期へ進む」の学年の上限、初期値（`defaultState`）の大学名・学期制・成績の段階・ベースクラスを、大学の設定から作る
  - ビルドと `npm run check:ui` がすべて通る（会津大学の学年は 1〜6、ベースクラスは今までと同じ）
  - _Depends: 1.2_
  - _Requirements: 2.4, 2.6, 4.1, 4.2_

- [ ] 4. 確かめて、文書を合わせて、本番に出す
- [ ] 4.1 試しの大学と、D の成績の確認を試しの画面に足す
  - 試しの画面に、`VITE_UNIVERSITY=test` で開く確認を足す：学年の選択肢（1〜4）・ベースクラス・科目の絞り込み（2学期制・クォーターなし）・時間割の表示（月〜金・7限・クォーターの切りかえなし）・成績の選択肢（S〜F）・GPA。会津大学で、D が入った保存データの GPA と合否が F と同じになる確認も足す
  - `npm run check:ui` で、足した確認を含めてすべて通る
  - _Depends: 3.1, 3.2, 3.3, 3.4_
  - _Requirements: 3.4, 5.2, 5.3_

- [ ] 4.2 会津大学の科目の条件を、本物のシラバスと見比べる（作者）
  - 変換で作った `course_conditions.json` から、科目ごとに学年・学期・クォーター・再履修が並んだ見比べやすい一覧を作って作者に渡す。作者が全科目（すべてのクラスを含む）を本物のシラバスと見比べる。違う科目があれば、作者の確認のうえで元の `syllabus.json` を直し、変換をやり直して、直した科目と理由を Implementation Notes に記録する
  - 作者が全科目の見比べを終え、違っていた科目があれば直してある
  - _Depends: 2.1_
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 4.3 全体を確かめる
  - ビルドと `npm run check:ui` がすべて通る。lint の指摘が増えておらず、この spec で書いたコードに `any` がない。`dist/` に試しの大学の設定が入っていない。保存データの型（`AppState`）が変わっていない
  - _Depends: 4.1, 4.2_
  - _Requirements: 4.2, 4.3, 6.1_

- [ ] 4.4 steering と本番での確認の手順をまとめる
  - `data-model.md`・`product.md`（成績の段階）・`tech.md`（大学ごとの設定・変換のスクリプト・`VITE_UNIVERSITY`）・`structure.md`（新しいファイル）を合わせる。`production-check.md` に、作者が本番で確かめる手順（共通の確認 1〜6、成績の選択肢が A・B・C・F だけ）を書く
  - _Depends: 4.3_
  - _Requirements: 6.2, 6.3_

- [ ] 4.5 本番に出し、作者が確かめる
  - 作者の「マージして」の指示で `main` に入れ、作者が `production-check.md` の手順で確かめる。確認が終わったら、`roadmap.md` のこの spec を完了にする
  - _Depends: 4.4_
  - _Requirements: 6.2_

## Implementation Notes
