// 会津大学の設定
import type { UniversityConfig } from '../universityConfig';

export const aizuUniversity: UniversityConfig = {
    id: 'u-aizu',
    name: '会津大学',
    termSystemLabel: '4学期制',
    terms: [
        { id: 'first', label: '前期', quarters: [{ label: 'Q1', courseLabel: '1Q' }, { label: 'Q2', courseLabel: '2Q' }] },
        { id: 'second', label: '後期', quarters: [{ label: 'Q3', courseLabel: '3Q' }, { label: 'Q4', courseLabel: '4Q' }] },
    ],
    hasFullYearCourses: true,
    days: ['月', '火', '水', '木', '金', '土'],
    lastPeriod: 11,
    minSelectablePeriod: 5,
    gradeRange: { min: 1, max: 6 },
    baseClasses: [
        { grades: [1, 2], options: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'], description: '1~2年生向けの基本的なクラス分けです。' },
        { grades: [3, 4, 5, 6], options: ['CS', 'IT-SPR', 'SY', 'CN', 'IT-CMV', 'SE-DE'], description: '3~4年生向けの専門コース（トラック）に応じたクラス分けです。' },
    ],
    // A（80点以上）・B（65〜79点）・C（50〜64点）・F（50点未満）。D はない（2026-11-17 作者より）
    gradingScale: [
        { label: 'A', point: 4 },
        { label: 'B', point: 3 },
        { label: 'C', point: 2 },
        { label: 'F', point: 0 },
    ],
    // 前の初期値の段階で入った D は、F と同じ 0 ポイントの不合格として読む
    gradeAliases: { D: 'F' },
};
