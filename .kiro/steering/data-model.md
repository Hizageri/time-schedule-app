# Data Model Steering

> updated_at: 2026-11-18（`university-config`：大学ごとの設定、共通の形の科目の条件、成績の段階を設定から読む）
> 今実際に使われているデータの形（コードから確認済み）。コード上の型は `src/types/index.ts`（初期値は `src/context/defaultState.ts`） と `src/services/aiApi.ts` にある。
> `[要確認]` = 作者に意図を確認したい箇所

## 方針

- **データの形を変えるときは、先にこのファイルを直してからコードの型に反映する**（UI 専用の型は例外）
- マスターデータ（シラバス・口コミ）は `src/data/*.json` をバンドルする。DB には入れない
- ユーザーデータは Firestore の `users/{uid}` 1ドキュメントに `AppState` を丸ごと保存する（読み込みが終わってから、`merge` なしで丸ごと書き直す。下の「扱いの注意」）
- マスターデータのキーは snake_case（`id_name`, `target_bit`）、アプリ側の状態は camelCase（`courseId`, `targetBit`）
- 科目の識別子は `CourseData.id_name`。ユーザーデータの `courseId` やマップのキーにはこの値が入る
- 大学ごとに違う値（大学名・学期制・曜日・時限・学年の範囲・ベースクラス・成績の段階）は、保存データではなく**大学ごとの設定**（`src/config/universities/*.ts`）に書く。計算と表示は今の大学の設定（`src/config/currentUniversity.ts`）を読む
- 科目の条件（学年・学期・クォーター・再履修）は、アプリの中では**共通の形**（`CourseConditions`）だけを読む。大学ごとの元の形（会津大学は `target_bit`）は、変換のスクリプト（`npm run build:syllabus`）で共通の形にしておく

## 型定義

```ts
// ─────────────────────────────────────────────
// 0. 大学ごとの設定（src/config/。保存データではない。TypeScript のコードに書く）
// ─────────────────────────────────────────────

/** 学期の決まり */
export interface TermDef {
  id: 'first' | 'second';
  label: string;                 // 例：'前期'
  /** 学期の中のクォーター。会津大学は2つ（前期は Q1・Q2、後期は Q3・Q4）。ない大学は []。courseLabel は科目カードの開講時期の名前（会津大学：1Q〜4Q） */
  quarters: { label: string; courseLabel: string }[];
}

/** ベースクラスの選択肢（学年ごと） */
export interface BaseClassGroup {
  grades: number[];              // この選択肢を出す学年
  options: string[];             // 例：['C1', 'C2', …]
  description: string;           // 条件の画面の説明文
}

export interface UniversityConfig {
  id: string;                    // 例：'u-aizu'（university-data-model で利用者のデータから引く）
  name: string;                  // 例：'会津大学'
  termSystemLabel: string;       // 例：'4学期制'
  terms: TermDef[];              // 前期・後期の2つ
  hasFullYearCourses: boolean;   // 通年の科目があるか
  days: string[];                // 授業のある曜日の最大（例：['月','火','水','木','金','土']）
  lastPeriod: number;            // 最後の時限
  minSelectablePeriod: number;   // 最大時限として選べるいちばん小さい値
  gradeRange: { min: number; max: number };
  baseClasses: BaseClassGroup[];
  gradingScale: GradingScale[];  // 成績の段階。ポイント 0 は不合格
  /** 保存データに残っている、今の段階にない成績の読みかえ（会津大学：D → F） */
  gradeAliases: Record<string, string>;
}

/**
 * 会津大学：前期（Q1・Q2）・後期（Q3・Q4）、通年あり、月〜土、11限まで（最大時限の選択肢は 5〜11）、学年 1〜4（2026-11-27 に 1〜6 から変えた）、
 *   ベースクラスは 1〜2年が C1〜C6・3〜4年が CS・IT-SPR・SY・CN・IT-CMV・SE-DE、
 *   成績の段階は A=4（80点以上）・B=3（65〜79点）・C=2（50〜64点）・F=0（50点未満）。D はなく、保存データの D は F として読む
 * 試しの大学（開発サーバーで VITE_UNIVERSITY=test のときだけ）：前期・後期でクォーターなし、通年なし、月〜金、7限まで、
 *   学年 1〜4、ベースクラスは1つのグループ、成績の段階は S=4・A=3・B=2・C=1・F=0
 */

// ─────────────────────────────────────────────
// 1. 科目の条件
// ─────────────────────────────────────────────

/**
 * 共通の形の科目の条件。アプリの計算と表示はこれだけを読む
 * 会津大学は scripts/build_syllabus.ts が target_bit から作り、src/data/course_conditions.json（生成物）に書き出す
 */
export interface CourseConditions {
  grades: number[];                         // 対象の学年
  /** 学期。'full' = 1年を通して1つの授業（通年）。'either' = 同じ授業が前期にも後期にもあり、どちらかで受ける（前期と後期の両方の一覧に出す） */
  term: 'first' | 'second' | 'full' | 'either';
  /** 学期の中のどこか：クォーターの番号（0 始まり。会津大学は奇数Q=0・偶数Q=1）、学期を通して（またぎ）、集中講義など */
  /** 集中講義の index は、何学期の集中講義か（0 始まりのクォーターの番号。分からなければなし） */
  slot: { type: 'quarter'; index: number } | { type: 'whole' } | { type: 'intensive'; index?: number };
  isRetake: boolean;                        // 再履修向けか
}

/**
 * course_conditions.json（生成物）の形。key = CourseData.id_name
 * 元のシラバスで科目にビットがあれば course に、クラスにあれば classes（key = class_id）に入る
 */
export type CourseConditionsFile = Record<string, {
  course?: CourseConditions;
  classes?: Record<string, CourseConditions>;
}>;

/**
 * target_bit（11ビット）：会津大学の科目・クラスの対象条件（元のシラバスの形）
 * アプリの中で読むのは、変換のスクリプトと、保存データの committedClasses[].targetBit（確定した時間割の表示）だけ
 *
 *  bit 0-5  : 対象学年（bit0 = 1年 … bit5 = 6年。複数立てられる）
 *  bit 6-7  : クォーター  00=奇数Q / 01=偶数Q / 10=またぎ(前期 or 後期を通して) / 11=集中講義など
 *  bit 8-9  : 学期        00=前期 / 01=後期 / 10=通年 / 11=前期・後期のどちらかで受ける（2026-11-20〜）
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
  intensive_quarter?: number; // 集中講義のクラスだけ：何学期の集中講義か（シラバスと同じ 1〜4）。target_bit がクラスにあるときだけ書く
  /** `src/data/index.ts` で course_conditions.json から付け足される（target_bit があるクラスだけ） */
  conditions?: CourseConditions;
}

/** syllabus.json の1要素（203件。2026-11-27 に作者のシラバスとの見比べで2科目を消し1科目を足した） */
export interface CourseData {
  id_name: string;           // "HS01 哲学" のように「科目コード 科目名」。IDと表示名を兼ねている [要確認]
  target_bit?: TargetBit;    // 科目単位の条件（現データでは191件にある）
  intensive_quarter?: number; // 集中講義の科目だけ：何学期の集中講義か（シラバスと同じ 1〜4。例：「2学期集中」→ 2。夏季集中は 2、冬季集中は 4）。2026-11-25〜（現データでは21件）
  credits: number;
  outline: string;
  grading?: { exam: number; report: number; others: number }; // 割合（%）
  classes: ClassInfo[];
  /** `src/data/index.ts` で reviews_bit.json から付け足される */
  reviews_bit?: ReviewBit;
  /** `src/data/index.ts` で reviews_text.json から付け足される */
  comment?: string;
  /** `src/data/index.ts` で course_conditions.json から付け足される（target_bit がある科目だけ） */
  conditions?: CourseConditions;
}

/** raw_reviews.json の1要素（口コミの元データ） */
export interface RawReview {
  id: string;                // CourseData.id_name と一致
  difficulty: number;        // 1〜5
  assignment: number;        // 1〜5
  exam: number;              // 1〜5
  attendance: number;        // 1〜5
  comment: string;
  /** 例の値（本物の口コミではない）なら true。2026-11-27〜。example_note に、いつ・なぜ入れたかを書く */
  is_example?: boolean;
  example_note?: string;
}
// 注意（2026-11-27 作者より）：raw_reviews.json の値は、ほとんどが作者が入れた例の値（本物の口コミではない）。
// 本物の口コミを集めて入れ直していく予定。それより前に入れた例の値には is_example が付いていない

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
  targetBit: TargetBit | undefined;  // 会津大学の target_bit のまま保存する（移し替えは university-data-model）
}

export interface GradeRecord {
  grade: string;             // GradingScale.label（大学の設定の段階。会津大学で前に入った D は F として読む）
  classDifficulty: number;   // 1〜5（成績入力画面からは常に 3 が入る）
  testDifficulty: number;    // 1〜5（同上）
}

export interface AppState {
  /** 1:オンボーディング 2:条件 3:科目選択 4:AI相談 5:生成 6:ダッシュボード 7:成績入力 8:振り返り */
  currentScreen: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  userProfile: {
    nickname: string;
    /** 初期値は大学の設定の大学名。表示には使わない（大学の設定の name を出す） */
    university: string;
    dreamJob: string;
    /** 初期値は大学の設定の段階。計算・表示・AI に送る値には使わない（大学の設定の gradingScale を使う）。整理は university-data-model */
    gradingScale: GradingScale[];
    /** 初期値は大学の設定の学期制の名前。表示には使わない */
    termSystem: string;
    /** 入学年月。"YYYY-MM"（例 "2025-04"）。未設定は ''。任意 */
    enrollmentYearMonth: string;
    /** 卒業予定年月。"YYYY-MM"。未設定は ''。任意。両方入っているときは入学より後 */
    expectedGraduationYearMonth: string;
  };
  timetableSettings: {
    workingDays: number;     // 5 or 6
    maxPeriods: number;      // 5〜大学の最後の時限（会津大学は 11）。初期値 5。範囲は大学の設定から作る
  };
  timetableConditions: {
    targetGrade: number;     // 大学の設定の学年の範囲（会津大学は 1〜4。2026-11-27 までは 1〜6）
    term: 'first' | 'second' | 'full'; // 'full' を選ぶUIはない
    hasRetake: boolean;      // ONにするUIはない [要確認]
    retakeClasses: string[]; // 値を入れる処理がない [要確認]
    baseClass: string;       // 大学の設定のベースクラスの選択肢から
  };
  /** 選んだ科目。CourseData をオブジェクトごと保存（シラバス本文も複製される）。conditions は外して入れる（保存の形を変えないため）。科目 ID だけで持つ形には university-data-model で移す */
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
  /** gradingScale には、保存データの値ではなく大学の設定の段階を入れる */
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

- `university`・`termSystem`・`gradingScale`・`timetableConditions.baseClass`：今の大学の設定から作る（会津大学：'会津大学'・'4学期制'・A=4, B=3, C=2, F=0・'C1'）
- `enrollmentYearMonth`・`expectedGraduationYearMonth`：どちらも `''`（未設定）
- `timetableSettings`：`workingDays: 5`, `maxPeriods: 5`
- `timetableConditions`：`targetGrade: 1`, `term: 'first'`, `hasRetake: false`, `baseClass: 'C1'`
- ログイン時は Firestore のデータを `defaultState` に重ねる。`userProfile`・`timetableSettings`・`timetableConditions` は1段深くマージする

## 扱いの注意

- 科目の条件（`conditions`・`target_bit`）は科目単位にないことがある。読むときは `course.conditions ?? course.classes[0]?.conditions` の順で探す（クラスの条件は クラス → 科目 の順）
- `selectedCourses` には `conditions` を入れない（科目を選ぶときに外す。保存データと AI 窓口に送る中身を今までと同じ形に保つため）。条件は `id_name`・`class_id` で科目データ（`src/data/index.ts` の `findCourse`）から引き直す
- 成績の段階は保存データの `gradingScale` ではなく、大学の設定から読む。成績のラベルは `gradeAliases` で読みかえてから段階を引く（会津大学：D → F。どちらも 0 ポイントの不合格）。保存データの値は書きかえない
- `course_conditions.json` は生成物。直さずに `syllabus.json` を直して `npm run build:syllabus`
- `syllabus.json` の `OT03-001` は以前 `classes` の中に科目オブジェクトが入れ子になっていて、`class_id` と `schedule` がなかった（詳細モーダルが落ちる原因だった）。2026-10-12 に `月曜枠`（月-9, 月-10）・`木曜枠`（木-9, 木-10）の2クラスに直した。今は全203科目のクラスに `class_id` と `schedule` がある
- それでも手で管理しているデータなので、`schedule` を読むときは `cls.schedule ?? []` のように、ない場合に備える（詳細モーダル・生成画面・ダッシュボード・`checkScheduleConflict` はそうしてある）
- 画面の描画中にエラーが起きても真っ白にならないよう、`src/components/ErrorBoundary.tsx` で画面全体を囲んでいる。エラー時はコマどり先輩の口調のエラー画面と「戻る」ボタンを出す
- コード上の `TimeSlot` 型は `"月-1"` 〜 `"金-10"` のリテラルと `string` の合併型だが、実質は `string`
- `reviews_bit.json`・`reviews_text.json` は生成物。直さずに `raw_reviews.json` を直して `npm run build:reviews`
- 保存は、保存データの読み込みが終わってから行う（読み込み中・読み込みに失敗したときは保存しない）。最後の変更から 3 秒後に1回、`setDoc` を `merge` なしで呼び、`AppState` そのもので丸ごと書き直す。消した Map のキー（ピン・成績など）は保存データからも消える。ページを隠す・閉じるとき、ログアウトの前、利用者が切り替わる前は、待っている保存をすぐ行う
- 入学年月・卒業予定年月（2026-10-29〜）：保存されるのは `"YYYY-MM"`（月は2桁）か `''` だけで、年だけ・月だけの途中の状態は保存しない。両方が `"YYYY-MM"` のときは `expectedGraduationYearMonth > enrollmentYearMonth`（文字列の比較で前後が正しく決まる）。この項目ができる前の保存データには項目がなく、読み込み時に `defaultState` と重ねるので `''` になる（移し替えは要らない）。AI の依頼にも、企業やほかのサービスにも送らない
- Firestore は `ignoreUndefinedProperties: true` で初期化している（`src/lib/firebase.ts`）。値が `undefined` の項目は保存されず、読み直すと項目ごとない状態になる（例：口コミ本文のない科目の `comment`）
