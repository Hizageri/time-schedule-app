# Brief: secure-and-stable

> 2026-10-22 作成。もとの `core-bug-fixes` の brief をこの spec に引き継ぎ、安全性の対応を足した。

## Problem

インターン先へ約1週間後（2026-10-29 ごろ）に提出する。提出先の人が触ったときに、安全面の穴があったり、データが消えたりすると、アプリの価値が伝わる前に信頼を失う。

- **安全性**
  - `api/*` に認証がない。URL を知っていれば誰でも Gemini を呼べるので、API の利用料や上限を他人に使われるおそれがある
  - `api/*` が受け取るデータの大きさ・形を確かめていない。大量の科目や長い文字列を送られると、そのまま Gemini に渡って利用料が増える
  - Firestore のセキュリティルールがリポジトリで管理されていない。「自分のデータだけ読み書きできる」設定かどうかが確認できない
  - 依存パッケージに脆弱性がある（`npm audit --omit=dev` で重大1・高4・中1。2026-10-22 時点）。どれも `firebase` の中の Node.js 用の部品（`protobufjs`・`@grpc/grpc-js`）で、ブラウザ用のビルドにも `api/` にも入っていないため実害は小さいが、残しておく理由もない
  - デバッグ用の `console.log` が本番に残っている（`src/lib/firebase.ts` の API キー先頭6文字など）
- **正常に動く**（もとの `core-bug-fixes`）
  - ログイン直後や開き直したときに、保存した時間割が初期値で上書きされることがある（**データが消える。いちばん深刻**）
  - ピンの解除などで消したデータが、リロードすると戻る。別の科目までまとめて消えることがある
  - 6限より後の授業が時間割に表示されない。重なりも見えない。シラバスには 6〜11 限の授業が多い（例：月-9・月-10 は各36件）
  - 科目詳細でピン留めしたクラスが、AI の時間割生成に反映されない
  - 「合格かどうか」の判定が場所によって違う。修得済みの扱いや再履修候補の表示がずれることがある

## Current State

（パスは 2026-10-22 時点。この spec は**今の構成のまま**直す。目標の構成への移行は第2段階の `src-structure-migration` で行う）

- **`api/*` の認証・入力**
  - `api/consultation.ts`・`api/timetable-patterns.ts`・`api/grade-reaction.ts`・`api/chatbot.ts` は、POST なら誰からでも受け付ける
  - 入力のチェックは「`courses` が配列か」程度。件数・文字数の上限はない
  - 呼び出し元は `src/ai/aiService.ts`（`fetch('/api/...')`）。ID トークンは送っていない
- **Firestore のルール**：リポジトリに `firestore.rules`・`firebase.json` がない。Firebase の管理画面で設定されている内容は未確認
- **Firestore の同期**（`src/logic/AppContext.tsx`）
  - 読み込み前の書き込み：41行目の `setUser` が `getDoc`（46行目）より先に動くので、78〜90行目の `useEffect` が `defaultState` のまま `setDoc(..., { merge: true })` を走らせる
  - 状態が変わるたびに全体を書き込む（1文字入力ごと）
  - `merge: true` なので、消した Map のキーが Firestore に残る（`pinClass` の解除、`startNewSemester` での `grades`・`pinnedClasses`・`classroomNames` のリセット）
  - `removeCommittedClass` は部分一致（`includes`）で消すので、別の科目まで消えることがある
- **時限の表示**
  - 画面は `timetableSettings.maxPeriods` どおりに描く。初期値は 5（`src/logic/types.ts`）
  - 変えられるのはオンボーディングだけ（選択肢 5〜10）。2回目以降のログインではオンボーディングを通らない
  - 11限はどうしても表示できない。`TimeSlot` 型は 10 限まで
- **ピン留め**
  - `GeneratorScreen.tsx` → `aiService.ts` → `api/timetable-patterns.ts` のどこにも、ピンを渡す処理がない（`data-model.md` の `TimetablePatternsRequest` にも「pinnedClasses は送っていない」とある）
  - AI が失敗したときの代わりの時間割は、ピンを無視して `classes[0]` を選ぶ
- **合格の判定**：`AppContext.tsx`（`startNewSemester`）、`timetableGenerator.ts`、`CourseSelectionScreen.tsx`（2か所）で、ルールが少しずつ違う
  - 2026-10-22 に、科目選択の一覧に関わる部分だけ先に直した。`timetableGenerator.ts` に `isCoursePassed`・`isCourseFailed`（修得済みの一覧と成績の記録の両方を見て、成績の段階のポイントで決める）を作り、`filterByBit`・`isRetakeCandidate`・`CourseSelectionScreen.tsx` で使うようにした
  - 残り：`AppContext.tsx` の `startNewSemester`（`'F'`・`'D'`・`'不可'` の直書き）、ダッシュボードの単位・GPA の計算などを `isCoursePassed` にそろえる

## Desired Outcome

- **安全性**
  - `api/*` は、ログインしているユーザーの有効な Firebase ID トークンがないリクエストを 401 で断る
  - `api/*` は、決めた上限（件数・文字数）を超える入力や形の違う入力を 400 で断り、Gemini を呼ばない
  - Firestore のルールがリポジトリで管理され、「自分の `users/{uid}` だけ読み書きできる」ことを確かめてある
  - `npm audit --omit=dev` の重大・高が 0、または残るものは理由を書いてある
  - 本番のブラウザの Console に、API キーなどのデバッグ用ログが出ない
- **正常に動く**
  - ログイン直後や開き直したときに、保存した状態が初期値で上書きされない。消したデータはリロードしても戻らない
  - 選んだ授業は、何限であっても時間割（生成プレビュー・ダッシュボード・モバイルの一覧）に表示され、重なりも分かる
  - ピン留めしたクラスは、AI が出すすべてのパターンと、AI が失敗したときの代わりの時間割の両方で守られる
  - 合格の判定が1つにそろい、修得済み・再履修候補・単位の計算が同じルールで動く

## Approach

今の構成のまま、安全性 → データが消える不具合 → そのほかの不具合、の順に1つずつ直す。

- 判定や計算を1か所にまとめるときは、今の構成の同じ役割の場所に置く（`structure.md`。例：合格の判定やビット判定は `src/logic/`）。第2段階の移行でそのまま `utils/` に移せる形にする
- **全国展開を前提にする**（`product.md`）。新しく書くもの（API の入力チェック、認証、合格の判定、表示する時限の決め方）は、大学名・学期制・成績の段階・時限の数を決め打ちにしない。今の値（会津大学・4学期制・A〜F・最大11限）は、1か所の設定や引数から渡す
- ID トークンの検証方法は design で決める。新しいライブラリを入れずに済む方法を優先する。候補：
  - Firebase Auth の REST API（`accounts:lookup`）にトークンを渡して確かめる
  - Google の公開鍵で JWT の署名を Node.js の `crypto` で確かめる
  - `firebase-admin` を入れる（いちばん確実だが、新しいライブラリになる）
- データの形が変わるもの（`TimetablePatternsRequest` にピンを足す、API に ID トークンを送る）は、先に `data-model.md` を直す

## Scope

- **In**:
  - `api/*` の認証（Firebase ID トークンの検証）と、`aiService.ts` からトークンを送ること
  - `api/*` の入力チェック（件数・文字数の上限、形の確認）
  - Firestore のセキュリティルールをリポジトリに置き、内容を確かめる（反映は Firebase の管理画面か CLI。手順を `deployment.md` に書く）
  - 依存パッケージの更新（`npm audit fix`。`--force` は使わない。firebase を古い版に戻そうとするため）
  - 本番に残っているデバッグ用ログを消す
  - Firestore 同期を直す：読み込みが終わるまで書き込まない／消したキーが残らないようにする／書き込む回数を減らす
  - `removeCommittedClass` を完全一致で消すようにする
  - 6限より後（11限まで）の授業を表示する。やり方は requirements で決める（候補：選んだ科目のコマから表示する時限を自動で決める／プロフィールから最大時限を変えられるようにする）
  - ピンを `/api/timetable-patterns` に送り、プロンプトと返ってきた結果の両方で守らせる。AI が失敗したときの代わりの時間割でも守る
  - 合格の判定を1つの関数にそろえる
  - 変わった仕様を `data-model.md`・`tech.md`・`product.md`・`deployment.md` に反映する
- **Out**:
  - `src/` の目標の構成への移行（第2段階の `src-structure-migration`）
  - 全国展開向けのデータ設計・シラバスの DB 化（第2段階）
  - 空きコマ検索・UI の作り直し（第2段階）
  - モデル名や SDK（`@google/genai`）の変更
  - 1ユーザーあたりの回数制限（requirements で必要と分かったら、spec の変更として提案する。サーバーレスでは関数のメモリに回数を持てないため、保存先から考える必要がある）
  - 「月曜枠」「木曜枠」や日付文字列など、`"曜日-時限"` の形でないコマの表示を直すこと
  - `selectedCourses` を ID だけ保存する形に変えること（requirements で必要かどうかを判断し、必要なら `data-model.md` の変更として提案する）
  - テストの導入（第2段階の最初に検討する）

## Boundary Candidates

- API の守り（認証・入力チェック）
- Firestore の守り（セキュリティルール）
- 依存パッケージ・ログの整理
- Firestore 同期（読み込み・保存のタイミング・消したキーの扱い）
- 時限の範囲（何限まで表示するか）の決め方
- ピン留めの受け渡し（クライアント → API → プロンプト → 返ってきた結果のチェック）
- 合格の判定

## Out of Boundary

- 空いているコマの判定や、科目の検索
- 画面のレイアウトや文言の作り直し
- フォルダ構成の変更

## Upstream / Downstream

- **Upstream**: なし（今の構成の上で直す）。`data-model.md`
- **Downstream**:
  - `src-structure-migration`：この spec で直したもの（同期の処理、合格の判定、API の呼び出し）を目標の構成に移す。動きは変えない
  - `university-data-model`：この spec で設定や引数に出した「大学ごとに変わる値」を、大学ごとの設定に置きかえる
  - `empty-slot-search`：時限の範囲と合格の判定を使う

## Existing Spec Touchpoints

- **Extends**: なし（もとの `core-bug-fixes` の brief はこの spec に統合した）
- **Adjacent**:
  - `src-structure-migration`：この spec の成果を移す
  - `empty-slot-search`：時限の範囲を決める関数を共有する

## Constraints

- 期限：インターン先への提出（2026-10-29 ごろ）。今日は 2026-10-22
- 遅れたときに削る順番（`roadmap.md`）：ピン留めの反映 → 合格の判定の統一 → 6限より後の表示。安全性とデータが消える不具合は削らない
- 型・API の形を変えるときは、先に `data-model.md` を直す
- Gemini は `api/` から呼ぶ。プロンプトを変えるときは、コマどり先輩のキャラ付けを保つ
- 秘密情報をコード・commit に入れない。`VITE_` から始まる変数に秘密情報を入れない
- 画面・コンポーネントから `firebase/*` を直接 import しない（`lib/` と `logic/AppContext` を経由する）
- Firebase の管理画面での作業（ルールの反映など）は作者が行う。手順を書いて渡す
