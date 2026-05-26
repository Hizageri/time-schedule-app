import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../logic/AppContext';
import { Sparkles, AlertCircle, Save, Calendar as CalendarIcon, Loader2, Edit3, Settings2 } from 'lucide-react';
import { Header } from '../ui/Header';
import { getSubjectColor } from '../logic/utils';
import { generateTimetablePatterns } from '../api/aiService';
import type { TimetablePatternsResponse } from '../api/aiService';

export const GeneratorScreen: React.FC = () => {
    const { state, setScreen, setCommittedClasses } = useAppContext();
    const [patternsData, setPatternsData] = useState<TimetablePatternsResponse | null>(null);
    const [activePatternIndex, setActivePatternIndex] = useState<number>(0);
    const [isGenerating, setIsGenerating] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            console.log("送る科目データ:", state.selectedCourses);
            setIsGenerating(true);
            try {
                if (!state.selectedCourses || state.selectedCourses.length === 0) {
                    console.warn("selectedCourses is empty!");
                    setIsGenerating(false);
                    return;
                }
                const res = await generateTimetablePatterns(state.selectedCourses, state.timetableConditions.baseClass);
                setPatternsData(res);

                if (res.patterns.length > 0) {
                    const initialAssignments: Record<string, string> = {};
                    res.patterns[0].assignments.forEach(a => {
                        initialAssignments[a.courseId] = a.classId;
                    });
                    setEditableAssignments(initialAssignments);
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'AIからの応答の取得に失敗しました。');
            } finally {
                setIsGenerating(false);
            }
        };

        fetchPatterns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTabChange = (index: number) => {
        setActivePatternIndex(index);
        if (patternsData?.patterns[index]) {
            const newAssignments: Record<string, string> = {};
            patternsData.patterns[index].assignments.forEach(a => {
                newAssignments[a.courseId] = a.classId;
            });
            setEditableAssignments(newAssignments);
        }
    };

    const handleAssignmentChange = (courseId: string, newClassId: string) => {
        setEditableAssignments(prev => ({
            ...prev,
            [courseId]: newClassId
        }));
    };

    const handleConfirm = () => {
        const finalClasses: typeof state.committedClasses = [];

        state.selectedCourses.forEach(course => {
            const assignedClassId = editableAssignments[course.id_name];
            if (assignedClassId) {
                const classInfo = course.classes.find(c => c.class_id === assignedClassId);
                if (classInfo) {
                    finalClasses.push({
                        courseId: course.id_name,
                        classId: classInfo.class_id,
                        schedule: classInfo.schedule,
                        targetBit: classInfo.target_bit ?? course.target_bit
                    });
                }
            }
        });

        setCommittedClasses(finalClasses);
        setScreen(6); // Dashboard
    };

    const getQuarterType = (bit: number): 'odd' | 'even' | 'across' | 'intensive' => {
        const qVal = (bit >> 6) & 3;
        if (qVal === 0) return 'odd';
        if (qVal === 1) return 'even';
        if (qVal === 2) return 'across';
        return 'intensive';
    };

    const days = ['月', '火', '水', '木', '金', '土'].slice(0, state.timetableSettings.workingDays);
    const periods = Array.from({ length: state.timetableSettings.maxPeriods }, (_, i) => i + 1);

    const getPreviewCellClasses = (day: string, period: number) => {
        const slotStr = `${day}-${period}`;
        const activeClasses: any[] = [];
        const sessionTermBit = state.timetableConditions.term === 'second' ? 1 : (state.timetableConditions.term === 'full' ? 2 : 0);

        state.selectedCourses.forEach(course => {
            const assignedClassId = editableAssignments[course.id_name];
            if (!assignedClassId) return;

            const classInfo = course.classes.find(c => c.class_id === assignedClassId);
            if (!classInfo) return;

            const bit = classInfo.target_bit ?? course.target_bit ?? 0;

            // Check Term (bits 9-8)
            const courseTerm = (bit >> 8) & 3;
            if (courseTerm !== 2 && courseTerm !== sessionTermBit) return;

            // Check Quarter (bits 7-6)
            const qType = getQuarterType(bit);
            if (qType !== 'across' && qType !== 'intensive' && qType !== activeQuarter) return;
            if (qType === 'intensive') return;

            if (classInfo.schedule.includes(slotStr)) {
                activeClasses.push({
                    courseId: course.id_name,
                    classId: classInfo.class_id
                });
            }
        });
        return activeClasses;
    };

    if (isGenerating) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-12">
                <Loader2 className="w-16 h-16 text-accent animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-foreground">AIが最適な時間割を構築中...</h2>
                <p className="text-muted mt-2">目標に合わせた5つの戦略を生成しています</p>
                <div className="w-64 h-2 bg-muted/20 rounded-full mt-8 overflow-hidden">
                    <div className="h-full bg-accent animate-pulse w-full"></div>
                </div>
            </div>
        );
    }

    if (error || !patternsData || patternsData.patterns.length === 0) {
        return (
            <div className="min-h-screen bg-background p-12 flex items-center justify-center">
                <div className="bg-card p-12 rounded-2xl shadow-2xl max-w-2xl w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground mb-2">生成エラー</h2>
                    <p className="text-muted text-lg leading-relaxed bg-red-50 p-4 rounded-lg">
                        {error || '時間割パターンを生成できませんでした。'}
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => setScreen(4)} className="btn-secondary">アドバイスへ戻る</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header
                title="AI提案 - 5つの戦略"
                icon={Sparkles}
                action={{
                    label: "この時間割で確定",
                    onClick: handleConfirm,
                    icon: Save
                }}
            />

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col lg:flex-row gap-6 h-[calc(100vh-80px)] overflow-hidden">
                {/* Left Col: Pattern Navigation */}
                <div className="w-full lg:w-1/4 flex flex-col space-y-3 overflow-y-auto pr-2 pb-6 custom-scrollbar">
                    <h3 className="font-bold text-foreground text-lg mb-2 sticky top-0 bg-background z-10 py-2">戦略を選択</h3>
                    <AnimatePresence mode="wait">
                        {patternsData.patterns.map((p, idx) => {
                            const isActive = activePatternIndex === idx;
                            return (
                                <motion.button
                                    key={idx}
                                    onClick={() => handleTabChange(idx)}
                                    className={`text-left p-4 rounded-xl border transition-all ${isActive ? 'bg-accent/10 border-accent/40 text-foreground ring-1 ring-accent/20' : 'bg-card text-foreground border-border hover:border-accent/40'}`}
                                >
                                    <div className="font-bold mb-1 flex items-center justify-between text-md">
                                        {p.name}
                                        {isActive && <Sparkles className="w-4 h-4 text-accent" />}
                                    </div>
                                    <div className={`text-xs leading-relaxed ${isActive ? 'text-foreground/80 font-medium' : 'text-muted'}`}>{p.description}</div>
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Right Col: Grid Preview & Manual Tweaks */}
                <div className="w-full lg:w-3/4 flex flex-col h-full overflow-hidden">

                    {/* Preview Area */}
                    <div className="bg-card rounded-t-xl shadow-sm border border-border border-b-0 flex flex-col h-1/2 min-h-[300px]">
                        <div className="p-3 border-b border-border flex justify-between items-center">
                            <h2 className="font-bold text-foreground text-sm flex items-center">
                                <CalendarIcon className="w-4 h-4 mr-2 text-accent" />
                                プレビュー: {activePattern?.name}
                            </h2>
                            <div className="flex bg-muted/50 p-1 rounded-md">
                                {termQuarters.map(q => (
                                    <button
                                        key={q.val}
                                        onClick={() => setActiveQuarter(q.val as 'odd' | 'even')}
                                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${activeQuarter === q.val ? 'bg-background text-foreground shadow-sm border border-border/50' : 'text-muted hover:text-foreground'}`}
                                    >
                                        {q.label}表示
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar p-2">
                            <table className="w-full border-collapse relative h-full min-w-[500px]">
                                <thead>
                                    <tr>
                                        <th className="sticky top-0 w-8 border border-border bg-card p-1 text-muted text-[10px] font-medium z-10">時限</th>
                                        {days.map(d => (
                                            <th key={d} className="sticky top-0 border border-border bg-accent/10 backdrop-blur p-1 text-foreground text-xs font-bold w-1/5 z-10">{d}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {periods.map(p => (
                                        <tr key={p}>
                                            <td className="border border-border bg-card/50 p-1 text-center text-muted text-[11px] font-medium">{p}</td>
                                            {days.map(d => {
                                                const cells = getPreviewCellClasses(d, p);
                                                const hasConflict = cells.length > 1;
                                                return (
                                                    <td key={`${d}-${p}`} className={`border p-0.5 h-16 align-top transition-colors ${hasConflict ? 'border-red-400 bg-red-50/50' : 'border-border'}`}>
                                                        <div className="flex flex-col gap-0.5 h-full overflow-y-auto custom-scrollbar">
                                                            {cells.map((c, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`text-[10px] p-1.5 rounded-sm shadow-sm leading-tight border ${hasConflict ? 'bg-red-100 text-red-900 border-red-200' : 'bg-background border-border bg-opacity-80'}`}
                                                                >
                                                                    <div className="font-bold truncate text-foreground flex items-center gap-1">
                                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSubjectColor(c.courseId)?.match(/text-(\w+)-/)?.[1] || 'gray' }}></div>
                                                                        {c.courseId}
                                                                    </div>
                                                                    <div className="text-[9px] text-muted truncate mt-0.5">{c.classId}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Manual Override Editor Section */}
                    <div className="bg-background border border-border rounded-b-xl shadow-inner flex flex-col h-1/2 min-h-[250px] overflow-hidden">
                        <div className="p-3 border-b border-border bg-muted/10 flex justify-between items-center sticky top-0 z-10">
                            <h3 className="font-bold text-foreground text-sm flex items-center">
                                <Settings2 className="w-4 h-4 mr-2 text-muted" />
                                手動微調整 (クラス変更)
                            </h3>
                            <span className="text-xs text-muted font-medium bg-background px-2 py-0.5 rounded border border-border">
                                リアルタイム反映
                            </span>
                        </div>

                        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-muted/5">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {state.selectedCourses.map(course => {
                                    const currentAssigned = editableAssignments[course.id_name];
                                    return (
                                        <div key={course.id_name} className="bg-card border border-border rounded-lg p-3 shadow-sm hover:border-accent/40 transition-colors">
                                            <div className="font-bold text-sm text-foreground mb-1 truncate" title={course.id_name}>
                                                <span className="text-muted mr-1 font-mono text-xs">{course.id_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Edit3 className="w-3.5 h-3.5 text-muted shrink-0" />
                                                <select
                                                    className="flex-1 bg-background border border-border rounded-md px-2 py-1.5 text-xs font-semibold text-foreground focus:ring-1 focus:ring-accent outline-none"
                                                    value={currentAssigned || ''}
                                                    onChange={(e) => handleAssignmentChange(course.id_name, e.target.value)}
                                                >
                                                    <option value="" disabled>クラスを選択</option>
                                                    {course.classes.map(c => (
                                                        <option key={c.class_id} value={c.class_id}>
                                                            {c.class_id} ({c.schedule.join(', ')})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};
