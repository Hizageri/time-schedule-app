// 画面6（ダッシュボード）の時間割の裏側の処理：クォーターの切り替え、時間割のセル、集中講義、表示の範囲の外の時限
import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { findClassesInSlot, findIntensiveEntries, getLatestPeriod } from '../utils/timetable';

export function useTimetableGrid() {
    const { state } = useAppContext();

    // Quarter Toggle State
    const termQuarters = state.timetableConditions.term === 'first'
        ? [{ val: 'odd', label: 'Q1' }, { val: 'even', label: 'Q2' }]
        : [{ val: 'odd', label: 'Q3' }, { val: 'even', label: 'Q4' }];
    const [activeQuarter, setActiveQuarter] = useState<'odd' | 'even'>('odd');

    const days = ['月', '火', '水', '木', '金', '土'].slice(0, state.timetableSettings.workingDays);
    const periods = Array.from({ length: state.timetableSettings.maxPeriods }, (_, i) => i + 1);
    // 確定した授業のいちばん遅い時限（表示の範囲の外にあれば知らせる）
    const latestCommittedPeriod = getLatestPeriod(state.committedClasses.map(c => c.schedule ?? []));

    const getCellClasses = (day: string, period: number) =>
        findClassesInSlot(state.committedClasses, `${day}-${period}`, state.timetableConditions.term, activeQuarter);

    const getIntensiveClasses = () => findIntensiveEntries(state.committedClasses, state.timetableConditions.term);

    return { termQuarters, activeQuarter, setActiveQuarter, days, periods, latestCommittedPeriod, getCellClasses, getIntensiveClasses };
}
