# Data Model Steering

> updated_at: 2026-10-08
> 今実際に使われているデータの形（コードから確認済み）。コード上の型は `src/logic/types.ts` と `src/ai/aiService.ts` にある。
> `[要確認]` = 作者に意図を確認したい箇所

## 方針

- **データの形を変えるときは、先にこのファイルを直してからコードの型に反映する**（UI 専用の型は例外）
- マスターデータ（シラバス・口コミ）は `src/data/*.json` をバンドルする。DB には入れない
- ユーザーデータは Firestore の `users/{uid}` 1ドキュメントに `AppState` を丸ごと保存する
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
  };
  timetableSettings: {
    workingDays: number;     // 5 or 6
    maxPeriods: number;      // 5〜10（初期値 5）
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

export interface ConsultationRequest {
  userProfile: AppState['userProfile'];
  courses: CourseData[];
}
export interface ConsultationResponse {
  overallFeedback: string;
  courseFeedbacks: { courseId: string; courseName: string; comment: string }[];
}

export interface TimetablePatternsRequest {
  courses: CourseData[];
  baseClass: string;
  // pinnedClasses / timetableSettings は送っていない
}
export interface TimetablePatternsResponse {
  patterns: {
    id: string;
    name: string;
    description: string;
    assignments: { courseId: string; classId: string }[];
  }[];
}

export interface GradeReactionRequest {
  userProfile: AppState['userProfile'];
  grades: { courseId: string; courseName: string; grade: string; credits: number }[];
}
export interface GradeReactionResponse {
  title: string;
  message: string;
}

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
- `timetableSettings`：`workingDays: 5`, `maxPeriods: 5`
- `timetableConditions`：`targetGrade: 1`, `term: 'first'`, `hasRetake: false`, `baseClass: 'C1'`
- ログイン時は Firestore のデータを `defaultState` に重ねる。`userProfile`・`timetableSettings`・`timetableConditions` は1段深くマージする

## 扱いの注意

- `target_bit` は科目単位にないことがある。読むときは `course.target_bit ?? course.classes[0]?.target_bit` の順で探す
- `syllabus.json` の `OT03-001` は `classes` の中身の形が崩れていて `class_id` と `schedule` がない。読む側は `schedule` がない可能性を考える
- コード上の `TimeSlot` 型は `"月-1"` 〜 `"金-10"` のリテラルと `string` の合併型だが、実質は `string`
- `reviews_bit.json`・`reviews_text.json` は生成物。直さずに `raw_reviews.json` を直して `npm run build:reviews`
- 保存は `setDoc(..., { merge: true })` のため、Map（`grades` など）のキーを消しても Firestore 側に残る可能性がある
