// ブラウザ側の入力の上限。
// サーバー側の値（api/_lib/validation.ts の INPUT_LIMITS）と同じにする（api/ と src/ は互いに import しない）

/** 一度に選べる科目の数（INPUT_LIMITS.maxCourses と同じ） */
export const MAX_SELECTED_COURSES = 40;

/** ニックネーム・なりたい職業の最大文字数（INPUT_LIMITS.maxProfileText と同じ） */
export const PROFILE_TEXT_MAX_LENGTH = 100;
