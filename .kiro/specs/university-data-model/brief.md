# Brief: university-data-model

> 作成：2026-11-17（roadmap の `university-data-model` から）。第2段階なので期限はない
> 2026-11-17：作者の決定で2つに分けた。大学ごとの設定は `university-config`（先に行う）が持ち、この spec は利用者とシラバスのデータの形と、データの移し替えを持つ

## Problem

コマどりは全国の大学で使えることを目標にしている（`roadmap.md`）。ところが今のデータの形とコードは、会津大学を前提にしている。

- **利用者のデータに、大学を名前（`"会津大学"`）で持っている**（大学ごとの設定は `university-config` で作る）
- **選んだ科目を、シラバスの中身ごとコピーして保存している**
  - シラバスを直してもコピーは古いまま。年度が変わると、どの年度の科目かが分からない
- **「新学期へ進む」で、前の学期の時間割と成績が消える**
  - 履歴が残らないので、過去の学期を見返せない。あとで作る `course-history`（使う前に取った科目の登録）の置き場所もない
- **クラスによって時間割が変わる科目の一部が、クラスごとに別の科目になっている**
  - `MA01`〜`MA04`（線形代数 I・II、微積分 I・II）は「(C1/C2)」「(C3/C4)」「(C5/C6)」ごとに別の科目。科目選択で選んだクラスから、時間割の作成で変えられない（2026-11-13 作者の確認）
  - 一方で、口コミは科目ごとに1つなので、1つの科目にまとめると、クラスごとに違う口コミが1つになってしまう

この形のまま、シラバスの DB 化（`syllabus-db`）や時間割のパターンのコード化（`timetable-pattern-engine`）に進むと、どれも会津大学専用の前提の上に作ることになる。

## Current State

- 大学ごとの値：`src/config/universityConfig.ts` に会津大学の値（最後の時限 11、最大時限の下限 5）だけがある（`secure-and-stable` で1か所に集めた）。成績の段階は `userProfile.gradingScale`（初期値 A=4・B=3・C=2・D=0・F=0）、学期制は `userProfile.termSystem`（`'4学期制'`）
- `target_bit` の読み取りは `src/utils/targetBit.ts` に集まっている（`src-structure-migration` で集めた）。ほかのファイルから15か所で使われている
- 利用者のデータ：Firestore の `users/{uid}` の1ドキュメントに `AppState` を丸ごと保存（ADR-0015）。`selectedCourses` はシラバスの中身ごとのコピー。科目の ID は `id_name`（例：`"MA01 線形代数 I(C1/C2)"`）
- 「新学期へ進む」：選んだ科目・確定した時間割・成績・ピン・教室名を消し、合格した科目だけを `earnedCredits` に残す
- Firestore のルール：本人の `users/{uid}` だけを読み書きできる。下の階層（サブコレクション）は拒否される
- シラバスは `src/data/syllabus.json`（204 件）。151 件はクラスが1つだけ。口コミは `raw_reviews.json` で科目（`id_name`）ごとに1つ
- 会津大学の成績の段階：A は 80 点以上、B は 70〜79 点、C は 60〜69 点。GPA にするときの各段階のポイントは作者が確認中

## Desired Outcome

- 利用者のデータは、大学を **ID**（例：`universityId: "u-aizu"`）で持ち、名前は設定から引く
- 選んだ科目は、シラバスのコピーではなく**年度つきの科目 ID**（例：`"u-aizu/2026/HS01"`）で持ち、中身は ID から引く（`syllabus-db` までは `src/data/*.json` から引く）
  - 2026-11-18 作者の決定：`selectedCourses` は科目 ID だけを持つ（科目の中身を丸ごと複製しない）。`university-config` では保存データの形を変えないため、科目を選ぶときに共通の形の条件（`conditions`）を外して入れるだけにしてある。AI 窓口に送る科目も ID だけにするかは、この spec の設計で決める
- 利用者のデータを**学期ごと**に保存し（例：`users/{uid}/terms/{学期ID}`）、「新学期へ進む」で前の学期を消さずに残す
- クラスによって時間割が変わる科目は、**1つの科目の中の複数のクラス**として持ち、時間割の作成でクラスを選び直せる。**口コミはクラスごと**に持つ
- 今の利用者のデータを、新しい形に移し替える。移し替えたあとも、今の時間割・成績・プロフィールが今までどおり見える
- 移し替えのあとも、今までどおりの動き（共通の確認 1〜6）になる

## Approach

roadmap の決定どおり、データの形を先に `data-model.md` で決めてから、コードに反映する（CLAUDE.md の型のルール）。`university-config` の大学ごとの設定の上に作る。利用者のデータの移し替えは、この spec の中で1回にまとめる。

## Scope

- **In**:
  - 利用者のデータの形の変更：大学 ID、年度つきの科目 ID、学期ごとの保存
  - シラバスと口コミのデータの形の変更：クラスごとに別の科目になっているものを1つの科目にまとめる、口コミをクラスごとに持つ
  - 今の利用者のデータの移し替え
  - Firestore のルールの変更（学期ごとの保存の下の階層）と、Rules Playground での確認
  - steering（`data-model.md`・`product.md`・`tech.md`・`structure.md`）の更新
- **Out**:
  - 会津大学以外の大学の、本物のデータを集めて入れること
  - シラバスを DB に移すこと（`syllabus-db`）
  - 時間割のパターンをコードで組むこと（`timetable-pattern-engine`）
  - 使う前に取った科目を登録すること（`course-history`）
  - 大学ごとの設定（`university-config`）
  - 過去の学期を見返す画面（作者の決定で、あとの spec で作る）
  - 担当の教授の名前を持つこと（作者の方針で持たない）
  - 見た目の変更

## Boundary Candidates

- 科目 ID（大学・年度・科目コード）の付け方
- シラバス・口コミのデータの形（クラスのまとめ方、クラスごとの口コミ）
- 利用者のデータの形と保存場所（学期ごと）、Firestore のルール
- 今の利用者のデータの移し替え

## Out of Boundary

- シラバスの置き場所（JSON か DB か）は `syllabus-db` が持つ。この spec は形と ID の付け方だけを決める
- 時間割の組み合わせの計算は `timetable-pattern-engine` が持つ
- 見た目は `ui-design-definition` が持つ

## Upstream / Downstream

- **Upstream**：`university-config`（大学ごとの設定）、`data-model.md`（型の正）、`secure-and-stable`（保存の流れ・合否の判定・Firestore のルール）、`src-structure-migration`（`utils/targetBit.ts`・`config/`・`hooks/useUserDataSync.ts` の形）、ADR-0005・ADR-0015・ADR-0016
- **Downstream**：`timetable-pattern-engine`・`syllabus-db`・`course-history`・`empty-slot-search`・`first-run-ux-refresh`。どれもこの spec のデータの形の上に作る

## Existing Spec Touchpoints

- `secure-and-stable`：保存（読み込み済みのときだけ・3秒まとめて・丸ごと。ADR-0008）を、学期ごとの保存に合わせて考え直す
- `student-period`：入学・卒業予定年月はプロフィール（学期をまたいで変わらない側）に置く
- `src-structure-migration`：試しの画面（`checks/ui/`）の保存データの形も、新しい形に合わせる

## Constraints

- 型の正は `data-model.md`。データの形を変えるときは、先にこのファイルを直す
- Firestore のルールを変えたら、作者が管理画面に反映し、Rules Playground で確かめる（`deployment.md`）
- 今の利用者のデータを消さない。移し替えに失敗しても、元のデータが残るようにする
- 新しいライブラリはなるべく入れない
- 新しいコードで `any` を使わない

## Open Questions

作者の決定（2026-11-17）：
- spec を2つに分ける（大学ごとの設定は `university-config`、この spec はデータの形と移し替え）
- 再履修のクラスと、内容ごとに分かれている科目（`SS04`・`OT08`・`OT10`）をクラスとして扱うかは、設計で決める
- 過去の学期を見返す画面は、この spec では作らない（データを残すところまで）

残っていること（要件で決める）：
1. 学期 ID の付け方と、「今の学期」の決め方（利用者が学期を進めたときに作るか、学年と学期から決めるか）
