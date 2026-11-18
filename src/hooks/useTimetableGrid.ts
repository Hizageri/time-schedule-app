// 画面6（ダッシュボード）の時間割の裏側の処理：クォーターの切り替え、時間割のセル、集中講義、表示の範囲の外の時限
import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { findClassesInSlot, findIntensiveEntries, getLatestPeriod } from '../utils/timetable';
import { toCourseConditions } from '../utils/targetBit';
import { currentUniversity } from '../config/currentUniversity';
import { getTermDef } from '../config/universityConfig';

export function useTimetableGrid() {
    const { state } = useAppContext();

    // クォーターの切り替え（大学の設定の、今の学期のクォーター。クォーターのない大学は空）
    const termQuarters = getTermDef(currentUniversity, state.timetableConditions.term).quarters
        .map((q, index) => ({ index, label: q.label }));
    const [activeQuarter, setActiveQuarter] = useState<number>(0);

    const days = currentUniversity.days.slice(0, state.timetableSettings.workingDays);
    const periods = Array.from({ length: state.timetableSettings.maxPeriods }, (_, i) => i + 1);
    // 確定した授業のいちばん遅い時限（表示の範囲の外にあれば知らせる）
    const latestCommittedPeriod = getLatestPeriod(state.committedClasses.map(c => c.schedule ?? []));

    // 確定した時間割は、保存データの targetBit（会津大学のビット。university-data-model で移し替えるまで）を共通の形にして読む
    const committedEntries = state.committedClasses.map(c => ({ ...c, conditions: toCourseConditions(c.targetBit ?? 0) }));

    const getCellClasses = (day: string, period: number) =>
        findClassesInSlot(committedEntries, `${day}-${period}`, state.timetableConditions.term, activeQuarter);

    const getIntensiveClasses = () => findIntensiveEntries(committedEntries, state.timetableConditions.term);

    return { termQuarters, activeQuarter, setActiveQuarter, days, periods, latestCommittedPeriod, getCellClasses, getIntensiveClasses };
}
