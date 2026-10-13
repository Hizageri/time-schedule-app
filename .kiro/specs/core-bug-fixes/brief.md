# Brief: core-bug-fixes

## Problem

時間割を作るときの基本の動きに、不具合がいくつかある。審査員が初回から触る場合も、デモで開き直す場合も、価値が伝わる前につまずく。

- 6限より後の授業が、時間割に表示されない。重なりも見えない。シラバスには 6〜11 限の授業が多い（例：月-9・月-10 は各36件）
- 科目詳細でピン留めしたクラスが、AI の時間割生成に反映されない
- ログイン直後や開き直したときに、保存した時間割が初期値で上書きされることがある。ピンの解除などで消したデータが、リロードすると戻る
- 「合格かどうか」の判定が場所によって違う。そのため、修得済みの扱いや再履修候補の表示がずれることがある

## Current State

（パスは 2026-10-13 時点のもの。`src-structure-migration` のあとは移行先で読み替える）

- **時限の表示**
  - 画面は `timetableSettings.maxPeriods` どおりに描いている
  - 初期値は 5（`src/logic/types.ts:117`）
  - 変えられるのはオンボーディングだけ（`src/pages/OnboardingScreen.tsx:110-116`、選択肢は 5〜10）
  - 2回目以降のログインではオンボーディングを通らないので変えられない（`AppContext.tsx:56-57`）
  - 11限はどうしても表示できない
  - `TimeSlot` 型は 10 限まで
- **ピン留め**
  - `GeneratorScreen.tsx:48` → `aiService.ts:59-62` → `api/timetable-patterns.ts:20` のどこにも、ピンを渡す処理がない
  - AI が失敗したときの代わりの時間割（`GeneratorScreen.tsx:73-80, 112-118`）は、ピンを無視して `classes[0]` を選ぶ
  - `data-model.md` の `TimetablePatternsRequest` にも「pinnedClasses は送っていない」と書いてある
- **Firestore の同期**（`src/logic/AppContext.tsx`）
  - 読み込み前の書き込み（41-91行）：`setUser` が `getDoc` より先に動くので、`defaultState` のまま `setDoc` が走る
  - 状態が変わるたびに全体を書き込む（1文字入力ごと）
  - `merge: true` なので、消した Map のキーが Firestore に残る
    - 対象：`pinClass` の解除、`startNewSemester` での `grades`・`pinnedClasses`・`classroomNames` のリセット
  - `removeCommittedClass`（147行）は部分一致（`includes`）で消すので、別の科目まで消えることがある
- **合格の判定**：次の4か所で、ルールが少しずつ違う
  - `AppContext.tsx:200-201`
  - `timetableGenerator.ts:125-127`
  - `CourseSelectionScreen.tsx:78-79`
  - `CourseSelectionScreen.tsx:106-108`

## Desired Outcome

- 選んだ授業は、何限であっても時間割（生成プレビュー・ダッシュボード・モバイルの一覧）に表示され、重なりも分かる
- ピン留めしたクラスは、AI が出すすべてのパターンと、AI が失敗したときの代わりの時間割の両方で守られる
- ログイン直後や開き直したときに、保存した状態が初期値で上書きされない。消したデータはリロードしても戻らない
- 合格の判定が1つにそろい、修得済み・再履修候補・単位の計算が同じルールで動く

## Approach

`src-structure-migration` で切り出した部品（Firestore 同期のフック、`services/aiApi.ts`、`utils/` の判定関数）に対して、修正を1か所ずつ入れる。データの形が変わるもの（`TimetablePatternsRequest` にピンを足す）は、先に `data-model.md` を直す。

## Scope

- **In**:
  - 6限より後（11限まで）の授業を表示する。やり方は requirements で決める。候補：
    - 選んだ科目のコマから表示する時限を自動で決める
    - プロフィールから最大時限を変えられるようにする
  - ピンを `/api/timetable-patterns` に送り、プロンプトと返ってきた結果の両方で守らせる。AI が失敗したときの代わりの時間割でも守る
  - Firestore 同期を直す
    - 読み込みが終わるまで書き込まない
    - 消したキーが残らないようにする
    - 書き込む回数を減らす（例：まとめて書き込む）
  - `removeCommittedClass` を完全一致で消すようにする
  - 合格の判定を `utils/` の1つの関数にそろえる
  - 変わった仕様を `data-model.md`・`tech.md`・`product.md` に反映する
- **Out**:
  - 空きコマ検索（`empty-slot-search`）
  - 見た目の変更（`first-run-ux-refresh`）
  - `api/*` の認証、`firestore.rules` の管理、モデルや SDK の変更
  - 「月曜枠」「木曜枠」や日付文字列など、`"曜日-時限"` の形でないコマの表示を直すこと（requirements で必要と分かったら、spec の変更として提案する）
  - `selectedCourses` を ID だけ保存する形に変えること。データの形が大きく変わるので、requirements で必要かどうかを判断し、必要なら `data-model.md` の変更として提案する

## Boundary Candidates

- 時限の範囲（何限まで表示するか）の決め方
- ピン留めの受け渡し（クライアント → API → プロンプト → 返ってきた結果のチェック）
- Firestore 同期（読み込み・保存のタイミング・消したキーの扱い）
- 合格の判定

## Out of Boundary

- 空いているコマの判定や、科目の検索
- 画面のレイアウトや文言の作り直し

## Upstream / Downstream

- **Upstream**: `src-structure-migration`（同期フック・`services/aiApi.ts`・`utils/` の判定関数）、`data-model.md`
- **Downstream**:
  - `empty-slot-search`：時限の範囲と合格の判定を使う
  - `first-run-ux-refresh`：正しく保存されることを前提に作る

## Existing Spec Touchpoints

- **Extends**: なし
- **Adjacent**:
  - `src-structure-migration`：その成果の上で直す
  - `empty-slot-search`：時限の範囲を決める関数を共有する

## Constraints

- 型・API の形を変えるときは、先に `data-model.md` を直す
- Gemini は `api/` から呼ぶ。プロンプトを変えるときは、コマどり先輩のキャラ付けを保つ
- 予定：〜10/22（3日）
