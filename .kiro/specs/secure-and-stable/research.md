# Research & Design Decisions: secure-and-stable

## Summary

- **調査の種類**：既存のアプリの拡張（light discovery）。ただし認証は安全性に関わるため、公式ドキュメントで手順を確認した
- **調べた範囲**：`api/*.ts`、`src/ai/aiService.ts`、`src/lib/firebase.ts`、`src/logic/AppContext.tsx`、`src/logic/timetableGenerator.ts`、`src/logic/types.ts`、画面（Onboarding・CourseSelection・Generator・Dashboard・MobileTimetableList・App）、`vite.config.ts`（開発時の `/api` の振り分け）、`vercel.json`、依存パッケージ（`npm audit`）、Firebase 管理画面の Firestore ルール（作者が貼り付け、2026-10-23）
- **主な発見**
  1. ID トークンは、Firebase の公式手順（サードパーティの JWT ライブラリで検証する方法）どおりに、Node.js 標準の `crypto` だけで検証できる。新しいライブラリは要らない
  2. `npm audit fix`（`--force` なし）で重大・中は消える。残る高4件はすべて `@grpc/grpc-js`（`@firebase/firestore` が `~1.9.0` に固定）が原因。npm の `overrides` で `^1.13.6` に上げると 0 件になる。この部品はブラウザ用のビルドにも `api/` にも入っていない
  3. 今の Firestore ルールは、すでに「自分の `users/{uid}` だけ読み書きできる」になっている。リポジトリに置いて管理するだけでよい

## Research Log

### Firebase ID トークンの検証（ライブラリなし）
- **出典**：Firebase「Verify ID Tokens」（https://firebase.google.com/docs/auth/admin/verify-id-tokens）の「Verify ID tokens using a third-party JWT library」
- **確かめる項目**
  - ヘッダー：`alg` が `RS256`、`kid` が Google の公開鍵（https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com）のどれかと一致
  - 中身：`exp` が未来、`iat` が過去、`aud` がプロジェクト ID、`iss` が `https://securetoken.google.com/<プロジェクトID>`、`sub` が空でない文字列（uid）、`auth_time` が過去
  - 署名：同じ公開鍵で検証。公開鍵は応答の `Cache-Control` の `max-age` の間キャッシュする
- **この環境で確認したこと（2026-10-23）**：公開鍵の URL は 200 を返し、`cache-control: public, max-age=18566` 付き。4つの鍵はどれも Node.js の `crypto.createPublicKey` で読める（RSA 2048 ビット）
- **注意**：JWT の検証だけでは、取り消されたトークンは分からない（Firebase の公式の説明）。このアプリでは取り消しの確認までは行わない（トークンの有効期限は1時間）
- **影響**：`api/_lib/auth.ts` で検証する。プロジェクト ID はサーバーの環境変数から読む（`FIREBASE_PROJECT_ID`、なければ `VITE_FIREBASE_PROJECT_ID`。Vercel では `VITE_` 付きの変数もサーバー関数から読める。秘密情報ではない）

### 依存パッケージの脆弱性（2026-10-23）
- 今：`npm audit --omit=dev` で重大1（`protobufjs` 7.5.4）・高4（`@grpc/grpc-js` 1.9.16 とそれを使う `@firebase/firestore`・`@firebase/firestore-compat`・`firebase`）・中1（`@protobufjs/utf8`）
- `npm audit fix --package-lock-only`（`--force` なし）をコピーで試した：`protobufjs` 7.6.6、`@protobufjs/utf8` 1.1.2 になり、重大・中は消える。高4件は残る
- `firebase` の最新（13.1.0）の `@firebase/firestore` 4.19.0 も `@grpc/grpc-js: ~1.9.0`。普通の更新では直らない
- `package.json` に `"overrides": { "@grpc/grpc-js": "^1.13.6" }` を足してコピーで試した：`@grpc/grpc-js` 1.14.6 になり、`npm audit --omit=dev` は 0 件
- `@grpc/grpc-js` と `protobufjs` は Firestore を Node.js で使うときだけの部品。2026-10-22 に `dist/assets/*.js` を検索して、ブラウザ用のビルドに入っていないことを確認済み。`api/` は firebase を import していない
- **影響**：`overrides` で上げても、本番で動くコードは変わらない。万一 `@firebase/firestore` の Node.js 用の部分と合わなくても、このアプリでは使っていない。`npm audit fix --force` は firebase を 9.14.0 に戻そうとするので使わない

### Firestore のルール（作者が 2026-10-23 に管理画面から貼り付け）
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
- 要件 3.1〜3.3 は今のルールで満たしている。書いていない場所は拒否される
- 第2段階で学期ごとの保存（`users/{uid}/terms/...`）にすると、このルールでは下の階層が拒否される。`university-data-model` でルールも直す必要がある（ロードマップに申し送る）

### Firestore 同期の今の動き（`AppContext.tsx`）
- `onAuthStateChanged` の中で `setUser` が `getDoc` より先に動く。保存の `useEffect`（`[state, user]`）が、`defaultState` のまま `setDoc(..., { merge: true })` を走らせる（要件 5 の不具合の原因）
- `merge: true` なので、消した Map のキー（ピン、成績など）が Firestore に残り、読み込み時に戻る（要件 6.1・6.2 の原因）
- `removeCommittedClass` の `selectedCourses` の絞り込みが部分一致（`includes`）で、名前が似た別の科目も消える（要件 6.3 の原因）
- 状態のどこが変わっても全体を書く。1文字入力ごとに書く（要件 7）
- 状態は `users/{uid}` の1ドキュメントに丸ごと入っている。読み込みが終わっていれば、`merge` なしで丸ごと書き直すのが、ドキュメントの中身と画面の状態を一致させるいちばん単純な方法

### サーバーが読むデータファイル
- `api/consultation.ts`・`api/chatbot.ts` は `fs.readFileSync(path.join(process.cwd(), "src/data", ファイル名))` で JSON を読む。ファイル名が変数のため、Vercel のファイルの自動追跡で関数に同梱されるかはコードからは確かめられない（同梱されないと、今は空の配列になり、口コミが入らないだけで気づかれない）
- この spec ではサーバーがシラバスから科目を引くので、同梱が必須になる。`vercel.json` の `functions` に `includeFiles: "src/data/**"` を書いて確実にする

### 開発時の `/api`（`vite.config.ts` の `local-api-handler`）
- Node.js の `req` をそのまま渡すので、`req.headers.authorization` は Vercel と同じように読める
- `res.status().json()` を真似ている。401・400・410 もそのまま返せる

### 画面まわり
- 最大時限：`OnboardingScreen.tsx` の選択肢は 5〜10。`DashboardScreen.tsx` のプロフィールは、ニックネーム・職業を「編集する／保存する」で変える作り。`GeneratorScreen`・`DashboardScreen` は `maxPeriods` で表の行数を決め、`MobileTimetableList` は `periods` を受け取る
- `TimeSlot` 型は `"月-1"`〜`"金-10"` と `string` の合併型なので、11限の文字列もそのまま入る
- ピン：`CourseDetailModal` で `pinClass` する。`GeneratorScreen` は、生成時（初めのパターン）とパターン切り替え時に「AI の割り当て → なければ `classes[0]`」で補う同じ処理を2か所に持つ。ピンは見ていない
- 合否：`AppContext.startNewSemester` に `'F'`・`'D'`・`'不可'` の直書きが残っている。ダッシュボードの GPA シミュレーターは成績の段階のポイント（`point > 0`）で数えていて、要件 10.1 と同じ考え方。`GradeInputScreen` の `'D'`・`'F'` はアイコンと色を決める表示だけで、合否の判定ではない（この spec では触らない）
- デバッグ用の `console.log`：`src/lib/firebase.ts`（設定の値の監査3行）、`src/components/App.tsx`（ログアウトの2行）、`src/pages/GeneratorScreen.tsx`（送る科目データ）、`src/pages/DashboardScreen.tsx`（ログアウト）。`console.error`・`console.warn` は調査用として残す（要件 4.5）

## Architecture Pattern Evaluation

| 案 | 内容 | よい点 | 悪い点 | 判断 |
|----|------|--------|--------|------|
| 認証A：`firebase-admin` | 公式 SDK で検証 | いちばん確実。取り消しの確認もできる | 新しいライブラリ（大きい）。サービスアカウントの秘密鍵の管理が増える | 見送り |
| **認証B：`crypto` で JWT を検証** | 公式手順どおりに、標準の `crypto` で署名と項目を確かめる | ライブラリが要らない。秘密鍵も要らない。速い（公開鍵はキャッシュ） | 確かめる項目を自分で漏れなく書く必要がある | **採用** |
| 認証C：`accounts:lookup` に問い合わせ | Firebase Auth の REST API にトークンを渡す | 実装が短い | 毎回外部に問い合わせて遅い。検証の方法として公式に案内されていない | 見送り |
| 入力A：送られた科目の文章をそのまま使う | 今のまま、上限だけかける | 変更が小さい | 概要などの長い文章を送られると、そのまま AI に渡る | 見送り |
| **入力B：科目 ID だけ信じ、中身はサーバーのシラバスから引く** | 送られた `id_name` でサーバー側のシラバスを引いて AI に渡す | 文章を書き換えられても AI に渡らない。上限は件数と ID の形だけでよい | サーバーがシラバスを読めることが前提（`includeFiles` で確実にする） | **採用** |
| 保存A：`merge: true` のまま、消したキーに削除の印を付ける | 消すたびに削除を書く | 部分の書き込みで済む | 消す場所すべてで削除の印が必要。漏れやすい | 見送り |
| **保存B：読み込み後は `merge` なしで丸ごと書く** | ドキュメントを状態そのものにする | 消したものは自動で消える。1か所で済む | 読み込み前に書くと全部消える → 読み込みが終わるまで書かない仕組みが必須 | **採用**（要件 5.1 とセット） |

## Design Decisions

### Decision: AI 窓口の前処理を共通にする（一般化）
- **Context**：要件 1（認証）と 2（入力の確認）は、3つの AI 窓口で同じ順番で行う
- **Selected Approach**：`api/_lib/auth.ts`（トークンの検証）と `api/_lib/validation.ts`（上限の値と、窓口ごとの入力の確認）に分け、各窓口は「メソッド → API キー → 認証 → 入力の確認 → これまでの処理」の順に呼ぶ
- **Rationale**：上限の値を1か所に置ける（2.8）。窓口ごとの違いは確認の関数だけ
- **Trade-offs**：各窓口の冒頭に数行ずつ同じ呼び出しが並ぶ。窓口が3つだけなので、さらに包む仕組みは作らない（単純化）

### Decision: 科目の中身はサーバーのシラバスから引く
- **Context**：要件 2 の目的は「大量のデータや壊れたデータで利用料が増えない」こと。送られた概要などの長い文章を信じると、件数の上限だけでは守れない
- **Selected Approach**：送られた科目の `id_name` だけを使い、サーバーのシラバス（`src/data/syllabus.json`）から引く。見つからない ID は 400。リクエストの形（科目オブジェクトの一覧）は互換のため変えない
- **Rationale**：AI に渡る文章が、こちらのデータだけになる
- **Trade-offs**：`vercel.json` に `includeFiles` を足す。第2段階の `syllabus-db` で読み込み先が DB に変わる

### Decision: ピンの反映はブラウザ側の1つの関数で行う
- **Context**：要件 9.2〜9.5 は、AI の結果・AI が失敗したときの代わり・パターン切り替えのすべてで同じルールを当てる
- **Selected Approach**：`resolveClassAssignments`（`src/logic/timetableGenerator.ts`）で「有効なピン → AI の割り当て（開講クラスにあるとき）→ 最初のクラス」の順に決める。生成時とパターン切り替え時の2か所の補う処理をこれに置きかえる。AI にもピンを伝えて、ほかの科目の割り当てをピンに合わせてもらう
- **Rationale**：AI の出力に頼らず、必ず守れる。サーバー側で直さないので、守る場所が1か所になる
- **Trade-offs**：AI がピンを無視しても気づきにくい（結果は直るので利用者には影響しない）

### Decision: 保存は「読み込み済みのときだけ、3秒まとめて、丸ごと」
- **Context**：要件 5・6・7
- **Selected Approach**：読み込みの状態（`loading`・`ready`・`error`）を持ち、`ready` のときだけ保存を予約する。予約は最後の変更から3秒後に1回、`merge` なしで丸ごと書く。ページを隠す・閉じるとき（`visibilitychange` の hidden、`pagehide`）とログアウトの前に、予約中の保存をすぐ実行する。予約には「どの利用者の保存か」を持たせ、利用者が変わったら前の利用者の分だけを書く
- **Rationale**：上書き・復活・回数の3つを、保存の入口1か所で解決できる
- **Trade-offs**：複数のタブで同時に編集すると、後から保存したほうが勝つ（今も同じ）。ページを閉じる瞬間の保存は、ブラウザが待たないことがある（要件 7.3 は「試みる」）

### Decision: 依存パッケージは `audit fix` ＋ `overrides`
- **Context**：要件 4.1（重大・高を 0 件）
- **Selected Approach**：`npm audit fix`（`--force` なし）と、`package.json` の `overrides` で `@grpc/grpc-js` を `^1.13.6` にする
- **Rationale**：コピーで試して 0 件になった。上げる部品は本番では動かない
- **Trade-offs**：`@firebase/firestore` の指定（`~1.9.0`）と違う版を使わせることになる。理由を `tech.md` に書く。firebase を更新するときに、`overrides` が要らなくなっていないか確かめる

### Decision: 大学ごとに変わる値は1か所の設定にする（全国展開の準備）
- **Context**：要件 8.2（大学の最後の時限）、Boundary Context の「大学ごとに変わる値は直書きしない」
- **Selected Approach**：`src/logic/universityConfig.ts` に今の大学（会津大学）の設定を置く。この spec で使うのは最後の時限（11）と、最大時限の下限（5）だけ。成績の段階は今までどおり `userProfile.gradingScale` から読む
- **Rationale**：第2段階の `university-data-model` で、大学ごとの設定に置きかえやすい
- **Trade-offs**：今は会津大学の1つだけ。項目を先回りして増やさない（単純化）

## Synthesis Outcomes

- **一般化**：AI 窓口の前処理（認証・入力の確認）を共通の部品にした。ピンの反映を、AI の結果・代わりの時間割・パターン切り替えで共通の1つの関数にした。合否の判定を、2026-10-22 に作った `isCoursePassed` に集めた
- **作るか使うか**：認証は `firebase-admin` ではなく標準の `crypto` で作る（新しいライブラリと秘密鍵を増やさないため）。脆弱性は既存の `npm audit fix` と npm の `overrides` を使う。Firestore のルールは今のものをそのまま使う
- **単純化**：Firebase CLI の設定（`firebase.json`）は作らず、ルールは管理画面に貼る手順にする。保存の部品は今の `AppContext` の中に置き、`hooks/` への分割は第2段階の移行に任せる。チャットの窓口は守る仕組みを作らず止める

## Risks & Mitigations

- **トークンの検証に漏れがある** → 公式の項目を1つずつ確かめる。不正なトークン・期限切れ・別プロジェクトのトークンで 401 になることを確認する
- **公開鍵が取れない（Google 側の障害など）** → 401 ではなく 503 を返す（利用者をログアウトさせない）。エラーをログに残す
- **サーバーがシラバスを読めない** → `includeFiles` で同梱する。読めないときは 500 を返してログに残す（空の配列で黙って進めない）。プレビュー環境で確かめる
- **`overrides` で入れた `@grpc/grpc-js` と firebase が合わない** → ブラウザ用のビルドに入っていないことを、ビルド後に再確認する。開発サーバーと本番で、ログイン・保存が動くことを共通の確認で確かめる
- **保存を `merge` なしにしたことで、読み込み前の書き込みが起きるとデータが全部消える** → 保存の予約は `ready` のときだけ。利用者が変わったら予約を前の利用者の分として扱う。読み込みに失敗したら保存を止める
- **ページを閉じる瞬間の保存が終わらない** → 3秒の待ちの間に閉じた場合だけの取りこぼし。`visibilitychange` でも保存して、スマートフォンでも取りこぼしを減らす

## References

- [Verify ID Tokens | Firebase Authentication](https://firebase.google.com/docs/auth/admin/verify-id-tokens)：ライブラリなしで検証するときの確認項目
- Google の公開鍵：https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com
- Vercel の `vercel.json` の `functions`（`maxDuration`・`includeFiles`）
- npm の `overrides`（`package.json`）
