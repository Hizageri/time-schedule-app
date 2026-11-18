// 試しの大学の設定。会津大学と違う決まりで、設定どおりに動くかを確かめるためだけに使う。
// 開発サーバーで VITE_UNIVERSITY=test のときだけ使われ、本番のビルドには入らない（src/config/currentUniversity.ts）
import type { UniversityConfig } from '../universityConfig';

export const testUniversity: UniversityConfig = {
    id: 'u-test',
    name: '試しの大学（開発用）',
    termSystemLabel: '2学期制',
    terms: [
        { id: 'first', label: '春学期', quarters: [] },
        { id: 'second', label: '秋学期', quarters: [] },
    ],
    hasFullYearCourses: false,
    days: ['月', '火', '水', '木', '金'],
    lastPeriod: 7,
    minSelectablePeriod: 4,
    gradeRange: { min: 1, max: 4 },
    baseClasses: [
        { grades: [1, 2, 3, 4], options: ['A組', 'B組'], description: '試しの大学のクラス分けです。' },
    ],
    gradingScale: [
        { label: 'S', point: 4 },
        { label: 'A', point: 3 },
        { label: 'B', point: 2 },
        { label: 'C', point: 1 },
        { label: 'F', point: 0 },
    ],
    gradeAliases: {},
};
