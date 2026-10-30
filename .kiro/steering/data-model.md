# Data Model Steering

> updated_at: 2026-10-29（`student-period`：入学・卒業予定年月、AI に送るプロフィールの項目）
> 今実際に使われているデータの形（コードから確認済み）。コード上の型は `src/types/index.ts`（初期値は `src/context/defaultState.ts`） と `src/ai/aiService.ts` にある。
> `[要確認]` = 作者に意図を確認したい箇所

## 方針

- **データの形を変えるときは、先にこのファイルを直してからコードの型に反映する**（UI 専用の型は例外）
- マスターデータ（シラバス・口コミ）は `src/data/*.json` をバンドルする。DB には入れない
- ユーザーデータは Firestore の `users/{uid}` 1ドキュメントに `AppState` を丸ごと保存する（読み込みが終わってから、`merge` なしで丸ごと書き直す。下の「扱いの注意」）
- マスターデータのキーは snake_case（`id_name`, `target_bit`）、アプリ側の状態は camelCase（`courseId`, `targetBit`）
- 科目の識別子は `CourseData.id_name`。ユーザーデータの `courseId` やマップのキーにはこの値が入る

## 型定義

```ts
// ─────────────────────────────────────────────
// 1. ビット表現
// ─────────────────────────────────────────────

/**
 * target_bit（11ビット）：科目・クラスの対象条件
 *
 *  bit 0-5  : 対象学年（bit0 = 1年 … bit5 = 6年。複数立てられる）
 *  bit 6-7  : クォーター  00=奇数Q / 01=偶数Q / 10=またぎ(前期 or 後期を通して) / 11=集中講義など
 *  bit 8-9  : 学期        00=前期 / 01=後期 / 10=通年
 *  bit 10   : 再履修クラス 1=再履修向け / 0=通常
 *
 *  例：323 = 0b001_0100_0011 → 1,2年 / 偶数Q / 後期 → 4Q
 */
export type TargetBit = number;

/**
 * reviews_bit（12ビット）：先輩の口コミ評価。各3ビットで 1〜5（0 = データなし）
 *
 *  bit 0-2  : 難易度
 *  bit 3-5  : 課題量
 *  bit 6-8  : テストの厳しさ
 *  bit 9-11 : 出席の厳しさ
 *
 *  生成元：scripts/build_reviews.js が raw_reviews.json から計算
 */
export type ReviewBit = number;

// ─────────────────────────────────────────────
// 2. マスターデータ（src/data/*.json、Firestore には入っていない）
// ─────────────────────────────────────────────

/**
 * "曜日-時限" の形式（例："月-1"）。現データは月〜金で、最大 11 限（"月-11" など）。
 * 集中講義などでは "TBD" や "8/24(月)" のような日付の文字列も入る
 */
export type TimeSlot = string;

export interface ClassInfo {
  class_id: string;          // "C1", "ALL", "CS" など
  schedule: TimeSlot[];      // 1クラスあたり複数コマ（例：["金-9","金-10","火-9","火-10"]）
  target_bit?: TargetBit;    // クラスごとに条件が違う場合だけある（現データでは16件）
}

/** syllabus.json の1要素（204件） */
export interface CourseData {
  id_name: string;           // "HS01 哲学" のように「科目コード 科目名」。IDと表示名を兼ねている [要確認]
  target_bit?: TargetBit;    // 科目単位の条件（現データでは192件にある）
  credits: number;
  outline: string;
  grading?: { exam: number; report: number; others: number }; // 割合（%）
  classes: ClassInfo[];
  /** data.ts で reviews_bit.json から付け足される */
  reviews_bit?: ReviewBit;
  /** data.ts で reviews_text.json から付け足される */
  comment?: string;
}

/** raw_reviews.json の1要素（口コミの元データ） */
export interface RawReview {
  id: string;                // CourseData.id_name と一致
  difficulty: number;        // 1〜5
  assignment: number;        // 1〜5
  exam: number;              // 1〜5
  attendance: number;        // 1〜5
  comment: string;
}

// ─────────────────────────────────────────────
// 3. ユーザーデータ（Firestore: users/{uid} にこの型を丸ごと保存）
// ─────────────────────────────────────────────

export interface GradingScale {
  label: string;             // "A" など
  point: number;             // 4 など。0 は不合格扱い
}

export interface CommittedClass {
  courseId: string;          // CourseData.id_name
  classId: string;
  schedule: TimeSlot[];
  targetBit: TargetBit | undefined;
}

export interface GradeRecord {
  grade: string;             // GradingScale.label
  classDifficulty: number;   // 1〜5（成績入力画面からは常に 3 が入る）
  testDifficulty: number;    // 1〜5（同上）
}

export interface AppState {
  /** 1:オンボーディング 2:条件 3:科目選択 4:AI相談 5:生成 6:ダッシュボード 7:成績入力 8:振り返り */
  currentScreen: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  userProfile: {
    nickname: string;
    university: string;      // "会津大学" で固定
    dreamJob: string;
    gradingScale: GradingScale[];
    termSystem: string;      // "4学期制" で固定
    /** 入学年月。"YYYY-MM"（例 "2025-04"）。未設定は ''。任意 */
    enrollmentYearMonth: string;
    /** 卒業予定年月。"YYYY-MM"。未設定は ''。任意。両方入っているときは入学より後 */
    expectedGraduationYearMonth: string;
  };
  timetableSettings: {
    workingDays: number;     // 5 or 6
    maxPeriods: number;      // 5〜大学の最後の時限（会津大学は 11）。初期値 5。範囲は src/config/universityConfig.ts から作る
  };
  timetableConditions: {
    targetGrade: number;     // 1〜6
    term: 'first' | 'second' | 'full'; // 'full' を選ぶUIはない
    hasRetake: boolean;      // ONにするUIはない [要確認]
    retakeClasses: string[]; // 値を入れる処理がない [要確認]
    baseClass: string;
  };
  /** 選んだ科目。CourseData をオブジェクトごと保存（シラバス本文も複製される） */
  selectedCourses: CourseData[];
  committedClasses: CommittedClass[];
  /** key = CourseData.id_name */
  grades: Record<string, GradeRecord>;
  earnedCredits: { courseId: string; courseName: string }[]; // courseName にも id_name が入る
  /** key = courseId, value = classId */
  pinnedClasses: Record<string, string>;
  /** key = "月-1" など。UIがない [要確認] */
  classroomNames: Record<string, string>;
}

// ─────────────────────────────────────────────
// 4. API（/api/*）
// ─────────────────────────────────────────────

/**
 * 共通：3つの AI 窓口（consultation・timetable-patterns・grade-reaction）は
 * - ヘッダー `Authorization: Bearer <Firebase ID トークン>` が必須（ログイン中の本人だけ）
 * - 送られた科目は `id_name`（成績は `courseId`）だけを使い、概要・クラス・単位・口コミ本文はサーバーのシラバス（src/data）から引く。
 *   リクエストの形は互換のため下のとおりだが、それ以外の項目は使わない。知らない科目 ID は 400
 * - 入力の上限：科目 40・成績 40 件・ニックネーム／なりたい職業／大学名 100 文字（値は api/_lib/validation.ts の INPUT_LIMITS だけで管理）
 * - 成功時と Gemini の失敗時は今までどおり 200（失敗時は代わりの文面）。前処理で断るときは下の ApiErrorResponse
 */
export type ApiErrorCode =
  | 'method_not_allowed'   // 405
  | 'invalid_input'        // 400 入力の上限を超える・形が違う・知らない科目 ID
  | 'unauthenticated'      // 401 ID トークンがない・無効・期限切れ・別プロジェクト
  | 'chatbot_disabled'     // 410 チャットの窓口（常に）
  | 'server_misconfigured' // 500 API キー・プロジェクト ID がない、シラバスが読めない
  | 'auth_unavailable';    // 503 Google の公開鍵が取れない
export interface ApiErrorResponse {
  error: ApiErrorCode;     // 詳しい理由は返さない（サーバーのログにだけ残す）
}

export interface ConsultationRequest {
  /** サーバーが使う項目だけを送る（入学・卒業予定年月などは送らない） */
  userProfile: Pick<AppState['userProfile'], 'nickname' | 'dreamJob' | 'university'>;
  courses: CourseData[];                  // 使うのは id_name だけ
}
export interface ConsultationResponse {
  overallFeedback: string;
  courseFeedbacks: { courseId: string; courseName: string; comment: string }[];
}

export interface TimetablePatternsRequest {
  courses: CourseData[];                  // 使うのは id_name だけ
  baseClass: string;
  /** key = 科目 ID（id_name）、value = クラス ID。送った科目にない・開講クラスにないピンはサーバーで捨てる */
  pinnedClasses: Record<string, string>;
  // timetableSettings は送っていない
}
export interface TimetablePatternsResponse {
  patterns: {
    id: string;
    name: string;
    description: string;
    assignments: { courseId: string; classId: string }[];
  }[];
}
// ブラウザは、返ってきた割り当てを「有効なピン → パターンの割り当て → 最初のクラス」の順で補って表示する（ピンは必ず守る）

export interface GradeReactionRequest {
  /** サーバーが使う項目だけを送る（入学・卒業予定年月などは送らない） */
  userProfile: Pick<AppState['userProfile'], 'nickname' | 'dreamJob' | 'university' | 'gradingScale'>;
  grades: { courseId: string; courseName: string; grade: string; credits: number }[]; // courseName・credits はシラバスから引き直す
}
export interface GradeReactionResponse {
  title: string;
  message: string;
}

/** チャットの窓口（/api/chatbot）は 2026-10-24 から止めている。どんな依頼にも 410 `chatbot_disabled` を返す。下の形は止める前のもの */
export interface ChatbotRequest {
  message: string;
  history: { role: 'user' | 'model'; content: string; timestamp: string }[];
}
export interface ChatbotResponse {
  response: string;
}
```

## 初期値（`defaultState`）

- `gradingScale`：A=4, B=3, C=2, D=0, F=0
- `enrollmentYearMonth`・`expectedGraduationYearMonth`：どちらも `''`（未設定）
- `timetableSettings`：`workingDays: 5`, `maxPeriods: 5`
- `timetableConditions`：`targetGrade: 1`, `term: 'first'`, `hasRetake: false`, `baseClass: 'C1'`
- ログイン時は Firestore のデータを `defaultState` に重ねる。`userProfile`・`timetableSettings`・`timetableConditions` は1段深くマージする

## 扱いの注意

- `target_bit` は科目単位にないことがある。読むときは `course.target_bit ?? course.classes[0]?.target_bit` の順で探す
- `syllabus.json` の `OT03-001` は以前 `classes` の中に科目オブジェクトが入れ子になっていて、`class_id` と `schedule` がなかった（詳細モーダルが落ちる原因だった）。2026-10-12 に `月曜枠`（月-9, 月-10）・`木曜枠`（木-9, 木-10）の2クラスに直した。今は全204科目のクラスに `class_id` と `schedule` がある
- それでも手で管理しているデータなので、`schedule` を読むときは `cls.schedule ?? []` のように、ない場合に備える（詳細モーダル・生成画面・ダッシュボード・`checkScheduleConflict` はそうしてある）
- 画面の描画中にエラーが起きても真っ白にならないよう、`src/components/ErrorBoundary.tsx` で画面全体を囲んでいる。エラー時はコマどり先輩の口調のエラー画面と「戻る」ボタンを出す
- コード上の `TimeSlot` 型は `"月-1"` 〜 `"金-10"` のリテラルと `string` の合併型だが、実質は `string`
- `reviews_bit.json`・`reviews_text.json` は生成物。直さずに `raw_reviews.json` を直して `npm run build:reviews`
- 保存は、保存データの読み込みが終わってから行う（読み込み中・読み込みに失敗したときは保存しない）。最後の変更から 3 秒後に1回、`setDoc` を `merge` なしで呼び、`AppState` そのもので丸ごと書き直す。消した Map のキー（ピン・成績など）は保存データからも消える。ページを隠す・閉じるとき、ログアウトの前、利用者が切り替わる前は、待っている保存をすぐ行う
- 入学年月・卒業予定年月（2026-10-29〜）：保存されるのは `"YYYY-MM"`（月は2桁）か `''` だけで、年だけ・月だけの途中の状態は保存しない。両方が `"YYYY-MM"` のときは `expectedGraduationYearMonth > enrollmentYearMonth`（文字列の比較で前後が正しく決まる）。この項目ができる前の保存データには項目がなく、読み込み時に `defaultState` と重ねるので `''` になる（移し替えは要らない）。AI の依頼にも、企業やほかのサービスにも送らない
- Firestore は `ignoreUndefinedProperties: true` で初期化している（`src/lib/firebase.ts`）。値が `undefined` の項目は保存されず、読み直すと項目ごとない状態になる（例：口コミ本文のない科目の `comment`）
