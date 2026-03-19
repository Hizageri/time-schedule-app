import React, { useState, useEffect, useMemo } from 'react';
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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center animate-pulse">
                    <RefreshCw className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-spin" />
                    <h2 className="text-xl font-bold text-gray-700">AIが最適な時間割を構築中...</h2>
                </div>
            </div>
        );
    }

    if (patterns.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="bg-white p-8 rounded-xl shadow-md max-w-lg w-full text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">スケジュールの衝突</h2>
                    <p className="text-gray-600 mb-6">
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-6 py-4 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center">
                        <Sparkles className="w-6 h-6 mr-2 text-indigo-600" />
                        AI 提案時間割 5パターン
                    </h1>
                </div>
                <button
                    onClick={handleConfirm}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-2 px-8 rounded-xl shadow-md transition-all flex items-center group"
                >
                    <Save className="w-5 h-5 mr-2" />
                    この時間割で確定
                </button>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col lg:flex-row gap-6">
                {/* Left Col: Pattern Navigation */}
                <div className="w-full lg:w-1/4 flex flex-col space-y-3">
                    <h3 className="font-bold text-gray-700 ml-1 mb-1">コンセプトを選択</h3>
                    {patterns.map((p, idx) => {
                        const info = patternLabels[p.patternId];
                        const isActive = activePattern === p.patternId;
                        return (
                            <button
                                key={idx}
                                onClick={() => handleTabChange(p.patternId)}
                                className={`text-left p-4 rounded-xl border transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 border-transparent transform scale-105' : 'bg-white text-gray-800 border-gray-200 hover:border-indigo-300 hover:shadow-md'}`}
                            >
                                <div className="font-bold mb-1 flex items-center justify-between">
                                    {info.label}
                                    {isActive && <Sparkles className="w-4 h-4 text-indigo-300" />}
                                </div>
                                <div className={`text-xs ${isActive ? 'text-indigo-100' : 'text-gray-500'}`}>{info.desc}</div>
                            </button>
                        );
                    })}

                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
                        <p className="font-bold flex items-center mb-1"><Edit3 className="w-4 h-4 mr-1" /> 微調整も可能</p>
                        プレビュー内で特定のクラスを変えたい場合は、あとでダッシュボードからでも修正可能です。(V3モック)
                    </div>
                </div>

                {/* Right Col: Grid Preview */}
                <div className="w-full lg:w-3/4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <h2 className="font-bold text-indigo-900 flex items-center">
                                <CalendarIcon className="w-5 h-5 mr-2" />
                                {patternLabels[activePattern].label} プレビュー
                            </h2>
                            {/* Quarter Toggle Controls */}
                            <div className="flex bg-gray-200/80 p-1 rounded-lg">
                                {termQuarters.map(q => (
                                    <button
                                        key={q.val}
                                        onClick={() => setActiveQuarter(q.val as 'odd' | 'even')}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeQuarter === q.val ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {q.label}表示
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 max-h-[70vh]">
                            <table className="w-full min-w-[600px] border-collapse relative">
                                <thead>
                                    <tr>
                                        <th className="sticky top-0 w-12 border border-gray-200 bg-gray-100 p-2 text-gray-500 text-xs font-medium z-10">時限</th>
                                        {days.map(d => (
                                            <th key={d} className="sticky top-0 border border-gray-200 bg-indigo-50/90 backdrop-blur p-2 text-indigo-800 text-sm font-bold w-1/5 z-10">{d}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {periods.map(p => (
                                        <tr key={p}>
                                            <td className="border border-gray-200 bg-gray-50 p-2 text-center text-gray-500 text-xs font-medium">{p}</td>
                                            {days.map(d => {
                                                const cells = getPreviewCellClasses(d, p);
                                                const hasConflict = cells.length > 1;
                                                return (
                                                    <td key={`${d}-${p}`} className={`border p-1 h-20 align-top transition-colors ${hasConflict ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                        {cells.map((c, idx) => (
                                                            <div key={idx} className={`text-[11px] p-2 rounded shadow-sm leading-tight transition-transform hover:scale-105 cursor-pointer ${hasConflict ? 'bg-red-100 text-red-900 border-red-200 border' : 'bg-gradient-to-br from-indigo-100 to-blue-50 border border-indigo-200 text-indigo-900'}`}>
                                                                <div className="font-bold truncate">{c.courseId}</div>
                                                                <div className="text-[10px] opacity-75 mt-0.5">{c.classId}</div>
                                                            </div>
                                                        ))}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
