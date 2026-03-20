import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../AppContext';
import { generateTimetables } from '../timetableGenerator';
import type { GeneratedTimetable, PatternType } from '../timetableGenerator';
import { ChevronRight, Sparkles, AlertCircle, RefreshCw, Save, Calendar as CalendarIcon, Edit3 } from 'lucide-react';
import type { AppState } from '../types';

export const GeneratorScreen: React.FC = () => {
    const { state, setScreen, setCommittedClasses } = useAppContext();
    const [patterns, setPatterns] = useState<GeneratedTimetable[]>([]);
    const [activePattern, setActivePattern] = useState<PatternType>('balance');
    const [isGenerating, setIsGenerating] = useState(true);

    // For manual edits within the preview
    const [editableClasses, setEditableClasses] = useState<AppState['committedClasses']>([]);

    // Q1/Q2 toggler specifically for previewing the timetable
    const termQuarters = state.timetableConditions.term === 'first'
        ? [{ val: 'odd', label: 'Q1' }, { val: 'even', label: 'Q2' }]
        : [{ val: 'odd', label: 'Q3' }, { val: 'even', label: 'Q4' }];
    const [activeQuarter, setActiveQuarter] = useState<'odd' | 'even'>('odd');

    useEffect(() => {
        setIsGenerating(true);
        // Simulate a small delay for "AI processing" effect
        setTimeout(() => {
            const results = generateTimetables(state);
            setPatterns(results);
            if (results.length > 0) {
                setEditableClasses(results[0].classes);
            }
            setIsGenerating(false);
        }, 800);
    }, [state]);

    const handleTabChange = (p: PatternType) => {
        setActivePattern(p);
        const match = patterns.find(pt => pt.patternId === p);
        if (match) {
            setEditableClasses(JSON.parse(JSON.stringify(match.classes)));
        }
    };

    const handleConfirm = () => {
        setCommittedClasses(editableClasses);
        setScreen(6); // Go to Dashboard
    };

    const patternLabels: Record<PatternType, { label: string, desc: string }> = useMemo(() => ({
        'balance': { label: 'AIおすすめ (バランス型)', desc: '偏りが少なく最も理想的な配置' },
        'full-day-off': { label: '全休クリエイト型', desc: '授業が全くない日を最大限作る' },
        'zero-first-period': { label: '脱・1限型 (朝ゆったり)', desc: '1限目（朝）の授業を極力減らす' },
        'night-shift': { label: '夜バイト優先型', desc: '夕方以降のスケジュールを空ける' },
        'zero-gaps': { label: '空きコマ・ゼロ型', desc: '授業間の長時間の空きを減らす' }
    }), []);

    // Helper to decipher quarter from target_bit (Bits 6-7)
    const getQuarterType = (bit: number): 'odd' | 'even' | 'across' | 'intensive' => {
        const qVal = (bit >> 6) & 3;
        if (qVal === 0) return 'odd';
        if (qVal === 1) return 'even';
        if (qVal === 2) return 'across';
        return 'intensive';
    };

    // Subject color coding function
    const getSubjectColor = (courseId: string) => {
        const name = courseId.toLowerCase();
        
        // Mathematics
        if (name.includes('数学') || name.includes('統計') || name.includes('確率') || name.includes('代数')) {
            return 'bg-blue-100 text-blue-900 border-l-4 border-blue-500';
        }
        
        // English
        if (name.includes('英語') || name.includes('英会') || name.includes('コミュニケーション')) {
            return 'bg-yellow-100 text-yellow-900 border-l-4 border-yellow-500';
        }
        
        // Science
        if (name.includes('物理') || name.includes('化学') || name.includes('生物') || name.includes('科学')) {
            return 'bg-green-100 text-green-900 border-l-4 border-green-500';
        }
        
        // Programming
        if (name.includes('プログラミング') || name.includes('情報') || name.includes('コンピュータ')) {
            return 'bg-purple-100 text-purple-900 border-l-4 border-purple-500';
        }
        
        // Humanities
        if (name.includes('歴史') || name.includes('文学') || name.includes('哲学') || name.includes('経済')) {
            return 'bg-orange-100 text-orange-900 border-l-4 border-orange-500';
        }
        
        // Default color
        return 'bg-slate-100 text-slate-900 border-l-4 border-slate-500';
    };

    // Cell Rendering
    const days = ['月', '火', '水', '木', '金', '土'].slice(0, state.timetableSettings.workingDays);
    const periods = Array.from({ length: state.timetableSettings.maxPeriods }, (_, i) => i + 1);

    const getPreviewCellClasses = (day: string, period: number) => {
        const slotStr = `${day}-${period}`;
        return editableClasses.filter(c => {
            const qType = getQuarterType(c.targetBit ?? 0);
            if (qType !== 'across' && qType !== 'intensive' && qType !== activeQuarter) return false;
            if (qType === 'intensive') return false;
            return c.schedule.includes(slotStr);
        });
    };

    if (isGenerating) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 flex items-center justify-center p-12">
                <div className="text-center space-y-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl shadow-2xl flex items-center justify-center mx-auto">
                        <div className="grid grid-cols-3 gap-1">
                            <div className="w-3 h-3 bg-white rounded-sm animate-pulse"></div>
                            <div className="w-3 h-3 bg-white/60 rounded-sm animate-pulse"></div>
                            <div className="w-3 h-3 bg-white rounded-sm animate-pulse"></div>
                            <div className="w-3 h-3 bg-white/60 rounded-sm animate-pulse"></div>
                            <div className="w-3 h-3 bg-white rounded-sm animate-pulse"></div>
                            <div className="w-3 h-3 bg-white/60 rounded-sm animate-pulse"></div>
                            <div className="w-3 h-3 bg-white rounded-sm animate-pulse"></div>
                            <div className="w-3 h-3 bg-white/60 rounded-sm animate-pulse"></div>
                            <div className="w-3 h-3 bg-white rounded-sm animate-pulse"></div>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-700">AIが最適な時間割を構築中...</h2>
                </div>
            </div>
        );
    }

    if (patterns.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 p-12 flex items-center justify-center">
                <div className="bg-white p-12 rounded-2xl shadow-2xl max-w-2xl w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">スケジュールの衝突</h2>
                    <p className="text-slate-600 text-lg leading-relaxed">
                        選択した科目の間で、どうしても時限が重なってしまうため時間割を組むことができません。いくつか科目を絞ってみてください。
                    </p>
                    <button
                        onClick={() => setScreen(3)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center mx-auto"
                    >
                        <ChevronRight className="w-5 h-5 mr-1 rotate-180" />
                        科目選択に戻る
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 flex flex-col">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-8 py-4 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <Sparkles className="w-6 h-6 mr-3 text-slate-700" />
                        AI Timetable - 5つの戦略
                    </h1>
                </div>
                <button
                    onClick={handleConfirm}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-10 rounded-xl shadow-lg transition-all flex items-center group text-lg"
                >
                    <Save className="w-5 h-5 mr-2" />
                    この時間割で確定
                </button>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col lg:flex-row gap-6">
                {/* Left Col: Pattern Navigation */}
                <div className="w-full lg:w-1/4 flex flex-col space-y-4">
                    <h3 className="font-bold text-slate-800 text-lg mb-3">戦略を選択</h3>
                    <AnimatePresence mode="wait">
                        {patterns.map((p, idx) => {
                            const info = patternLabels[p.patternId];
                            const isActive = activePattern === p.patternId;
                            return (
                                <motion.button
                                    key={idx}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={() => handleTabChange(p.patternId)}
                                    className={`text-left p-4 rounded-xl border transition-all ${isActive ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 border-transparent transform scale-105' : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400 hover:shadow-md'}`}
                                    whileHover={{ scale: isActive ? 1.05 : 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="font-bold mb-1 flex items-center justify-between">
                                        {info.label}
                                        {isActive && <motion.div
                                            initial={{ rotate: 0 }}
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Sparkles className="w-4 h-4 text-slate-300" />
                                        </motion.div>}
                                    </div>
                                    <div className={`text-sm ${isActive ? 'text-slate-200' : 'text-slate-600'}`}>{info.desc}</div>
                                </motion.button>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Right Col: Grid Preview */}
                <div className="w-full lg:w-3/4">
                    <motion.div 
                        className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-200px)]"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h2 className="font-bold text-slate-900 text-lg flex items-center">
                                <CalendarIcon className="w-5 h-5 mr-2" />
                                {patternLabels[activePattern].label} プレビュー
                            </h2>
                            {/* Quarter Toggle Controls */}
                            <div className="flex bg-slate-200/80 p-1 rounded-lg">
                                {termQuarters.map(q => (
                                    <motion.button
                                        key={q.val}
                                        onClick={() => setActiveQuarter(q.val as 'odd' | 'even')}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${activeQuarter === q.val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {q.label}表示
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
                            <table className="w-full min-w-[600px] border-collapse relative h-full">
                                <thead>
                                    <tr>
                                        <th className="sticky top-0 w-12 border border-slate-200 bg-slate-100 p-2 text-slate-600 text-xs font-medium z-10">時限</th>
                                        {days.map(d => (
                                            <th key={d} className="sticky top-0 border border-slate-200 bg-slate-50/90 backdrop-blur p-2 text-slate-800 text-sm font-bold w-1/5 z-10">{d}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="h-full">
                                    {periods.map(p => (
                                        <tr key={p} className="h-full">
                                            <td className="border border-slate-200 bg-slate-50 p-2 text-center text-slate-600 text-xs font-medium">{p}</td>
                                            {days.map(d => {
                                                const cells = getPreviewCellClasses(d, p);
                                                const hasConflict = cells.length > 1;
                                                return (
                                                    <td key={`${d}-${p}`} className={`border p-1 h-20 align-top transition-colors ${hasConflict ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                                                        {cells.map((c, idx) => (
                                                            <motion.div 
                                                                key={idx} 
                                                                className={`text-[11px] p-2 rounded shadow-sm leading-tight transition-transform cursor-pointer ${hasConflict ? 'bg-red-100 text-red-900 border-red-200 border' : (() => {
                                                                    const colorClass = getSubjectColor(c.courseId);
                                                                    return colorClass;
                                                                })()}`}
                                                                initial={{ scale: 0.8, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                transition={{ delay: idx * 0.05 }}
                                                                whileHover={{ scale: 1.05, y: -2 }}
                                                                whileTap={{ scale: 0.95 }}
                                                            >
                                                                <div className="font-bold truncate">{c.courseId}</div>
                                                                <div className="text-[10px] opacity-75 mt-0.5">{c.classId}</div>
                                                            </motion.div>
                                                        ))}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </main>
        </div>
    );
};
