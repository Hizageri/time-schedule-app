// 画面5（時間割の生成）の裏側の処理：パターンの取得（AI と代わりの時間割）、ピンを守る割り当て、
// パターンの切り替え、手での変更、退避と戻し、クォーターの切り替え、プレビューのセル、確定
import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateTimetablePatterns } from '../services/aiApi';
import type { TimetablePatternsResponse } from '../services/aiApi';
import { resolveClassAssignments, getLatestPeriod, findClassesInSlot } from '../utils/timetable';
import type { TimetableEntry } from '../utils/timetable';

export function useTimetablePatterns() {
    const { state, setState, setScreen } = useAppContext();
    const [patternsData, setPatternsData] = useState<TimetablePatternsResponse | null>(null);
    const [activePatternIndex, setActivePatternIndex] = useState<number>(0);
    const [isGenerating, setIsGenerating] = useState(true);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 仮削除（一時退避）された科目のID一覧
    const [hiddenCourseIds, setHiddenCourseIds] = useState<string[]>([]);

    // Current editable class assignments for the active pattern
    // Record<courseId, classId>
    const [editableAssignments, setEditableAssignments] = useState<Record<string, string>>({});

    const activePattern = patternsData?.patterns[activePatternIndex];

    const termQuarters = state.timetableConditions.term === 'first'
        ? [{ val: 'odd', label: 'Q1' }, { val: 'even', label: 'Q2' }]
        : [{ val: 'odd', label: 'Q3' }, { val: 'even', label: 'Q4' }];
    const [activeQuarter, setActiveQuarter] = useState<'odd' | 'even'>('odd');

    useEffect(() => {
        const fetchPatterns = async () => {
            setIsGenerating(true);
            setIsComplete(false);
            try {
                if (!state.selectedCourses || state.selectedCourses.length === 0) {
                    console.warn("selectedCourses is empty!");
                    setIsGenerating(false);
                    return;
                }
                
                let res: TimetablePatternsResponse;
                try {
                    res = await generateTimetablePatterns(state.selectedCourses, state.timetableConditions.baseClass, state.pinnedClasses);
                } catch (apiErr) {
                    console.warn("API呼び出し失敗。デフォルトパターンへ切り替えます:", apiErr);
                    res = {
                        patterns: [
                            { id: "p1", name: "AIおすすめ", description: "全体のバランスを重視した時間割", assignments: [] },
                            { id: "p2", name: "全休作成型", description: "授業がない日をなるべく多く作成", assignments: [] },
                            { id: "p3", name: "1限回避型", description: "朝早い授業をなるべく回避", assignments: [] },
                            { id: "p4", name: "遅い時間回避", description: "夕方以降の遅いコマを削減", assignments: [] },
                            { id: "p5", name: "空きコマ削減", description: "空き時間をなくして効率化", assignments: [] },
                        ]
                    };
                }

                setPatternsData(res);

                if (res && res.patterns && res.patterns.length > 0) {
                    // ピン → パターンの割り当て → 最初のクラス の順で決める（AI の結果でも代わりの時間割でも同じ）
                    setEditableAssignments(resolveClassAssignments(state.selectedCourses, res.patterns[0].assignments ?? [], state.pinnedClasses));
                }

                // 強制的に100%にしてから画面切り替え
                setIsComplete(true);
                setTimeout(() => {
                    setIsGenerating(false);
                }, 400);
            } catch (err) {
                console.error(err);
                setError((err as { message?: string }).message || 'AIからの応答の取得に失敗しました。');
                setIsGenerating(false);
            }
        };

        fetchPatterns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTabChange = (index: number) => {
        setActivePatternIndex(index);
        if (patternsData?.patterns[index]) {
            // タブ切り替え時も同じ順で決める（手で変えたクラスは、別のパターンに切り替えるとそのパターンの割り当てに戻る）
            setEditableAssignments(resolveClassAssignments(state.selectedCourses, patternsData.patterns[index].assignments ?? [], state.pinnedClasses));
        }
    };

    const handleAssignmentChange = (courseId: string, newClassId: string) => {
        setEditableAssignments(prev => ({
            ...prev,
            [courseId]: newClassId
        }));
    };

    const handleHideCourse = (courseId: string) => {
        if (!hiddenCourseIds.includes(courseId)) {
            setHiddenCourseIds(prev => [...prev, courseId]);
        }
    };

    const handleRestoreCourse = (courseId: string) => {
        setHiddenCourseIds(prev => prev.filter(id => id !== courseId));
    };

    const handleRestoreAll = () => {
        setHiddenCourseIds([]);
    };

    const handleConfirm = () => {
        // 仮削除中の科目を除外して確定
        const activeSelectedCourses = state.selectedCourses.filter(
            c => !hiddenCourseIds.includes(c.id_name)
        );

        const finalClasses: typeof state.committedClasses = [];

        activeSelectedCourses.forEach(course => {
            const assignedClassId = editableAssignments[course.id_name];
            if (assignedClassId) {
                const classInfo = course.classes.find(c => c.class_id === assignedClassId);
                if (classInfo) {
                    finalClasses.push({
                        courseId: course.id_name,
                        classId: classInfo.class_id,
                        schedule: classInfo.schedule ?? [],
                        targetBit: classInfo.target_bit ?? course.target_bit
                    });
                }
            }
        });

        // グローバルStateの selectedCourses と committedClasses を同期更新
        setState(prev => ({
            ...prev,
            selectedCourses: activeSelectedCourses,
            committedClasses: finalClasses
        }));

        setScreen(6); // Dashboard
    };

    const days = ['月', '火', '水', '木', '金', '土'].slice(0, state.timetableSettings.workingDays);
    const periods = Array.from({ length: state.timetableSettings.maxPeriods }, (_, i) => i + 1);

    // プレビュー中の授業のいちばん遅い時限（表示の範囲の外にあれば知らせる）
    const latestPreviewPeriod = getLatestPeriod(
        state.selectedCourses
            .filter(course => !hiddenCourseIds.includes(course.id_name))
            .map(course => course.classes.find(c => c.class_id === editableAssignments[course.id_name])?.schedule ?? [])
    );

    // プレビューの材料：退避していない科目 × 割り当てたクラス（ビットはクラス → 科目の順に探す）
    const previewEntries: TimetableEntry[] = state.selectedCourses.flatMap(course => {
        if (hiddenCourseIds.includes(course.id_name)) return [];
        const assignedClassId = editableAssignments[course.id_name];
        if (!assignedClassId) return [];
        const classInfo = course.classes.find(c => c.class_id === assignedClassId);
        if (!classInfo) return [];
        return [{ courseId: course.id_name, classId: classInfo.class_id, schedule: classInfo.schedule ?? [], targetBit: classInfo.target_bit ?? course.target_bit ?? 0 }];
    });

    const getPreviewCellClasses = (day: string, period: number) =>
        findClassesInSlot(previewEntries, `${day}-${period}`, state.timetableConditions.term, activeQuarter)
            .map(entry => ({ courseId: entry.courseId, classId: entry.classId }));

    return {
        patternsData,
        activePatternIndex,
        isGenerating,
        isComplete,
        error,
        hiddenCourseIds,
        editableAssignments,
        activePattern,
        termQuarters,
        activeQuarter,
        setActiveQuarter,
        handleTabChange,
        handleAssignmentChange,
        handleHideCourse,
        handleRestoreCourse,
        handleRestoreAll,
        handleConfirm,
        days,
        periods,
        latestPreviewPeriod,
        getPreviewCellClasses,
    };
}
