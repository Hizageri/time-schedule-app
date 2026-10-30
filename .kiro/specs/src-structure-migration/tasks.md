# Implementation Plan

> 画面の見た目と動きは一切変えない。各タスクのあとに `npm run build` が通り、`npm run check:ui`（タスク 1.1 以降）がすべて通ることを確かめてから次へ進む。
> 段階（2・3・4）の最後のタスクでは、`roadmap.md` の確認の段階に合わせて、全部の確認を流し直す。
> 移す途中で不具合を見つけても直さず、この下の Implementation Notes に記録する（要件 3.4）。

- [x] 1. 段階0：試しの画面を入れる（移行の前のコードで）
- [x] 1.1 試しの画面の土台をリポジトリに入れる
  - `checks/ui/` に、Firebase（`firebase/auth`・`firebase/firestore`・`src/lib/firebase`）を偽物に差し替える Vite の設定、偽物の準備（`window.__h`）、本物の入口（`/src/main.tsx`）を読み込むページを置く
  - 確認を流す道具を作る：開発サーバーをプロジェクトのフォルダから立て、`localhost` 以外への通信を止め、確認ごとに PASS/FAIL を出し、最後に通った数と通らなかった確認の名前を出す。1つでも通らなければ終了コード 1
  - `package.json` の開発用の部品に Playwright を、コマンドに `check:ui` を足す。一時ファイルは `.gitignore` に入れる
  - steering：`tech.md` の「テスト：なし」と開発コマンドを、試しの画面の流し方・確かめること・ブラウザの入れ方に書き換える。`structure.md` の目標の構成に `config/` と `checks/ui/` を足す
  - `npm run check:ui` で「アプリを開くとログイン画面が出る」確認が通り、本番のビルドの出力に `window.__h` の文字がないことを確かめてある
  - _Requirements: 5.1, 5.3, 5.4, 5.5, 6.3_

- [x] 1.2 第1段階と student-period の確認を試しの画面に移す
  - 保存（ログイン直後・読み込みの失敗・初回の作成・利用者の切り替え・3秒まとめた保存・すぐ書く保存・保存の失敗）、AI（トークン、401 でログイン画面、400・500 で先輩の文面、送るプロフィールの項目、3機能の表示）、ピン、確定済みの授業の削除と新学期、最大時限と表示の範囲の外の知らせ、41科目目、入学・卒業予定年月、ログインのポップアップを閉じたとき、全体の流れの確認を `checks/ui/scenarios/` に置く
  - 移行の前のコード（本物の入口・`StrictMode` あり）で `npm run check:ui` を流し、すべて通ることを確かめてある。通らない確認があれば、試しの画面に入れる前に作者に報告する
  - _Requirements: 1.2, 1.3, 1.4, 5.2_

- [x] 1.3 画面の HTML の基準を作る
  - 決まった保存データで、ログイン・オンボーディング・条件・科目選択・相談・生成・ダッシュボードの3タブ・成績入力・読み込み失敗の画面を、パソコンとスマートフォンの幅で開き、`#root` の HTML を比べる確認を作る。`--update-snapshots` で基準を作り直せるようにする
  - 移行の前のコードで基準を作り、もう一度流すとすべて一致することを確かめてある
  - _Requirements: 1.1_

- [x] 2. 段階1：型・設定・計算・通信・データ・状態を移す
- [x] 2.1 型を `types/` に、初期値を `context/` に移す
  - 型は `types/index.ts` に、`defaultState` は `context/defaultState.ts` に移す。`logic/types.ts` にある未使用の関数（`calculateStudentBit`・`canTakeClass`）は `utils/targetBit.ts` に移す（消さない）
  - steering：`data-model.md` の型の場所の記述を新しい場所に合わせる
  - ビルドと `npm run check:ui` がすべて通る
  - _Requirements: 2.1, 6.2_

- [x] 2.2 設定を `config/` に移す
  - `logic/universityConfig.ts`・`logic/inputLimits.ts` を `config/` に移す。入力の上限は、サーバー側（`api/_lib/validation.ts`）にも同じ値があることをコメントで残す
  - steering：`product.md` の `universityConfig.ts` の場所を合わせる
  - ビルドと `npm run check:ui` がすべて通る
  - _Requirements: 2.1, 2.2, 6.2_

- [x] 2.3 計算を `utils/` の役割ごとのファイルに移す
  - `logic/timetableGenerator.ts`・`logic/utils.ts` の関数を、中身を変えずに `utils/targetBit.ts`・`courseFilter.ts`・`grades.ts`・`timetable.ts`・`timetableMock.ts`・`studentPeriod.ts`・`subjectColor.ts`・`classNames.ts` に分けて移す（未使用のものも移す）
  - steering：`product.md` の `isCoursePassed` の場所を合わせる
  - `utils/` が React・通信・Firebase を import していないこと、ビルドと `npm run check:ui` がすべて通ることを確かめてある
  - _Requirements: 2.1, 4.2_

- [x] 2.4 通信を `services/`、科目データを `data/` に移す
  - `ai/aiService.ts` を `services/aiApi.ts` に、`data.ts` を `data/index.ts` に、中身を変えずに移す
  - steering：`tech.md` のファイルの場所（`aiService`・`data.ts`）を合わせる
  - ビルドと `npm run check:ui` がすべて通る
  - _Requirements: 2.1, 4.1, 6.2_

- [x] 2.5 状態を `context/` に移し、段階1をまとめて確かめる
  - `logic/AppContext.tsx` を `context/AppContext.tsx` に移す（この時点では保存の処理も中に残す）。`logic/` が空になる
  - 段階1のまとめ：ビルド、`npm run check:ui`（画面の HTML の比較を含む）がすべて通り、`utils/`・`services/`・`config/` が `hooks/`・`context/`・`pages/` を import していないことを確かめてある
  - _Depends: 2.1, 2.2, 2.3, 2.4_
  - _Requirements: 1.5, 2.1, 2.4_

- [ ] 3. 段階2：重複をまとめ、裏側の処理を hooks に出す
- [x] 3.1 学期・クォーターの判定を1か所にまとめる
  - `utils/targetBit.ts` に学期のビット・今の学期の値・今の学期に入るか・クォーターの種類を返す関数を作り、9か所の判定（`courseFilter`・ラベル・科目選択・生成・ダッシュボード）をすべてこれに置きかえる。返す結果は変えない
  - `(bit >> 8) & 3`・`(bit >> 6) & 3` が `utils/targetBit.ts` 以外にないこと、ビルドと `npm run check:ui` がすべて通ることを確かめてある
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 3.2 コマ表のセル探しを1か所にまとめる
  - `utils/timetable.ts` に、授業の一覧を受け取ってその曜日・時限に入る授業を返す関数と、集中講義の欄に出す授業を返す関数を作り、生成画面のプレビューとダッシュボードの時間割の両方をこれに置きかえる。授業の一覧の作り方（ビットの取り方・退避の扱い）は画面ごとの違いを残す
  - ダッシュボードと生成画面の表で、同じ授業・重なり・集中講義が出ること（画面の HTML の比較と、ピン・表示の範囲の外・全体の流れの確認）が通る
  - _Depends: 3.1_
  - _Requirements: 3.2, 3.3, 3.4_

- [ ] 3.3 Firestore 同期を `hooks/useUserDataSync.ts` に分ける
  - 認証の監視・読み込みの番号・読み込みの状態・3秒まとめた保存・すぐ書く保存・ページを隠す・閉じるときの保存を、並びとタイミングを変えずに hook に移す。`AppContext` は hook を使い、更新関数とログイン・ログアウトだけを持つ（ログアウトは、保存を止める → 待っている保存を最大3秒待つ → ログアウト、の順を保つ）
  - 保存のすべての確認（ログイン直後・読み込みの失敗・利用者の切り替え・まとめる・すぐ書く・失敗の扱い・ログアウトの前）と全体の流れが通る
  - _Requirements: 1.2, 2.5, 4.3_

- [ ] 3.4 (P) 画面3（科目選択）の裏側の処理を hook に出す
  - 今の学年の科目と下の学年の未合格の科目、選択単位数、40科目の上限つきの選択を `hooks/useAvailableCourses.ts` に移し、画面は返り値で描画する（上限の文言は今と同じ）
  - 科目選択の画面の HTML が一致し、41科目目の確認とピンの確認が通る
  - _Boundary: useAvailableCourses, CourseSelectionScreen_
  - _Depends: 3.1_
  - _Requirements: 1.4, 4.4_

- [ ] 3.5 (P) 画面4（相談）と画面7（成績入力）の AI の呼び出しを hook に出す
  - 相談の呼び出し・残す科目の選択・確定を `hooks/useConsultation.ts` に、成績のリアクションの呼び出しを `hooks/useGradeReaction.ts` に移す。画面の中の表示のための計算（成績入力の一覧など）はこの spec では画面に残す
  - 相談・成績のリアクションの表示、送るプロフィールの項目、401・400 の扱いの確認が通る
  - _Boundary: useConsultation, useGradeReaction, ProposalScreen, GradeInputScreen_
  - _Requirements: 1.3, 2.3_

- [ ] 3.6 画面5（生成）の裏側の処理を hook に出す
  - パターンの取得（AI と代わりの時間割）、ピンを守る割り当て、パターンの切り替え、手での変更、退避と戻し、クォーターの切り替え、プレビューのセル、表示の範囲の外の時限、確定を `hooks/useTimetablePatterns.ts` に移し、画面は返り値で描画する
  - 生成画面の HTML が一致し、ピン・表示の範囲の外・全体の流れの確認が通る
  - _Depends: 3.2_
  - _Requirements: 1.3, 1.4, 4.4_

- [ ] 3.7 画面6（ダッシュボードの時間割）の裏側の処理を hook に出す
  - クォーターの切り替え、時間割のセル、集中講義、表示の範囲の外の時限を `hooks/useTimetableGrid.ts` に移す。GPA シミュレーターとプロフィールの編集はこの spec では画面に残す
  - ダッシュボードの3タブの HTML が一致し、確定済みの授業の削除・最大時限・入学と卒業予定年月の確認が通る
  - _Depends: 3.2_
  - _Requirements: 1.4, 4.4_

- [ ] 3.8 段階2をまとめて確かめる
  - ビルドと `npm run check:ui` がすべて通る
  - `src/pages`・`src/components` が `firebase/*` と `services/` を import していないこと、`firebase/*` を import しているのが `lib/`・`hooks/`・`context/` だけであることを確かめてある
  - _Depends: 3.3, 3.4, 3.5, 3.6, 3.7_
  - _Requirements: 1.5, 2.3, 2.4, 2.5_

- [ ] 4. 段階3：UI 部品・CSS・App を移す
- [ ] 4.1 UI 部品と CSS と `App.tsx` を移し、古いフォルダをなくす
  - `ui/Header.tsx`・`ui/Button.tsx` を `components/` に、`ui/styles/` を `assets/styles/` に（未使用の `App.css` も）、`components/App.tsx` を `src/App.tsx` に移し、`main.tsx` の読み込み先を合わせる
  - steering：`tech.md` の CSS・`ErrorBoundary`・`App.tsx` の場所の記述を合わせる
  - `src/logic`・`src/ai`・`src/ui`・`src/data.ts`・`src/components/App.tsx` がなくなっている
  - _Requirements: 2.1, 2.7, 6.2_

- [ ] 4.2 段階3をまとめて確かめる
  - ビルドと `npm run check:ui`（画面の HTML の比較を含む）がすべて通る
  - lint の指摘が移行の前（35件）から増えておらず、移行で書いたコードに `any` がない
  - 本番のビルドの出力に `window.__h`・`checks/` の文字がない
  - _Depends: 4.1_
  - _Requirements: 1.1, 1.5, 2.6, 2.7, 5.5_

- [ ] 5. steering への反映と最後の確認
- [ ] 5.1 `structure.md` とほかの steering を移行後の内容に合わせる
  - `structure.md` の「現状のディレクトリ構成」「現状からの対応」（移し終えたこと）「依存の向き（現状）」を書き直し、画面に残っている計算（GPA シミュレーター・プロフィールの編集・成績入力の一覧など）を書く
  - 設計書の「Steering Impact」の表の「Yes」の行（`product.md`・`tech.md`・`structure.md`・`data-model.md`）の更新がすべて入っていることと、steering の中に古いファイルの場所（`src/logic/`・`src/ai/`・`src/ui/`・`src/data.ts`）が残っていないことを確かめてある
  - _Depends: 4.2_
  - _Requirements: 6.1, 6.2_

- [ ] 5.2 全体を確かめ、本番での確認の手順をまとめる
  - `npm run check:ui` とビルドを最後にもう一度流し、すべて通る
  - 作者が本番 URL で行う確認（共通の確認 1〜6、ログイン・保存・AI・年月）の手順を、作者に渡せる形にまとめてある
  - _Depends: 5.1_
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

## Implementation Notes
- 1.1：試しの画面は Vite の root をプロジェクトのフォルダにし、`checks/ui/index.html` を `/checks/ui/index.html` で開く（`/src/main.tsx` をそのまま読めるため）。`envDir` を `checks/ui/` にして本物の `.env` を読まない。本番のビルドに入っていないかは `setDocCalls`・`popupErrorCode` など偽物だけにある文字で確かめる（`__h` は React の `__html` と重なるので使えない）
- 1.1（範囲外・記録）：`npm audit --omit=dev` に新しく `re2js`（高、`firebase` → `@firebase/firestore` の中）が出た。10/23 の確認のあとに公表された指摘で、この spec の変更が原因ではない。`npm audit fix` で直るとの表示。移行とは別に扱う
- 1.2：移行の前のコード（本物の入口・`StrictMode` あり）で、確認 100 件がすべて通った（2〜3分かかる）。AI の 401・400 の扱いは、第1段階ではコードを直接呼んで確かめていたものを、画面からの確認（401 → ログイン画面、400・500 → 先輩の文面）に置きかえた。詳細モーダルは Escape では閉じないので「閉じる」ボタンを押す
- 1.3：画面の HTML の基準は 11 画面 × パソコンとスマートフォンの幅 = 22 件。生成画面は、確定済みの授業があるとダッシュボードが出る（今までの決まり）ので、確定済みの授業なしで開く。タブは名前と完全に一致するボタンを押す（「成績」で探すと「成績を入力して次学期へ」に当たる）。基準の1か所を書き換えると、その画面だけが通らなくなることを確かめた
- 2.3：分けるときに一度、ファイルを書き込み用に開いてから読んだため、新しいファイル5つが空になった。元のファイルは git にあるので戻し、すべての中身を作り終えてから書き込むやり方でやり直した（移した名前が新しいファイルに全部あることを1つずつ確かめた）。`timetableMock.ts` に残る lint の指摘4件は、元の `timetableGenerator.ts` から持ってきた既存のもの
- 3.1（不具合の記録・直していない）：`utils/timetable.ts` の `checkScheduleConflict`（どこからも使われていない）は、`(existing.targetBit ?? 0 >> 6) & 3` の演算子の優先順位の誤りで、クォーターではなく学年のビットを読んでいる。使われていないので動きに影響はない。使い始めるときに直す。この判定はまとめた関数に置きかえず、そのまま残した（置きかえると動きが変わるため）
