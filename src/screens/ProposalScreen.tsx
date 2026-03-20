import React, { useEffect, useState } from 'react';
import { useAppContext } from '../AppContext';
import { Briefcase, ChevronRight, Loader2, CheckSquare, Square, AlertCircle, Quote } from 'lucide-react';
import { generateConsultation } from '../services/aiService';
import type { ConsultationResponse } from '../services/aiService';

export const ProposalScreen: React.FC = () => {
    const { state, setState, setScreen } = useAppContext();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [consultation, setConsultation] = useState<ConsultationResponse | null>(null);
    const [selectedToKeep, setSelectedToKeep] = useState<Record<string, boolean>>({});

    const dreamJob = state.userProfile.dreamJob || '未設定';

    useEffect(() => {
        const fetchAI = async () => {
            try {
                if (state.selectedCourses.length === 0) {
                    setLoading(false);
                    return;
                }
                const res = await generateConsultation(state.userProfile, state.selectedCourses);
                setConsultation(res);

                const initialChecks: Record<string, boolean> = {};
                res.courseFeedbacks.forEach(c => initialChecks[c.courseId] = true);
                setSelectedToKeep(initialChecks);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'AIからの応答の取得に失敗しました。APIキーが設定されているか確認してください。');
            } finally {
                setLoading(false);
            }
        };

        fetchAI();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleCourse = (courseId: string) => {
        setSelectedToKeep(prev => ({ ...prev, [courseId]: !prev[courseId] }));
    };

    const handleFinalize = () => {
        const finalized = state.selectedCourses.filter(c => {
            // AIが "MA01" のように省略して返却した場合でもマッチするようにする
            const matchingKey = Object.keys(selectedToKeep).find(key => c.id_name.includes(key) || key.includes(c.id_name));
            // 見つかった場合はそのチェック状態を使用。見つからなければ安全のため残す(true)
            return matchingKey ? selectedToKeep[matchingKey] : true;
        });
        setState(prev => ({ ...prev, selectedCourses: finalized }));
        setScreen(5); // GeneratorScreen
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-12">
                <Loader2 className="w-16 h-16 text-accent animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-foreground">AI先輩が分析中...</h2>
                <p className="text-muted mt-2">目標「{dreamJob}」に向けて選択科目を評価しています</p>
            </div>
        );
    }

    if (error || !consultation) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-12">
                <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
                <h2 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h2>
                <p className="text-muted mb-8 max-w-lg text-center leading-relaxed bg-red-50 p-4 rounded-lg">{error}</p>
                <div className="flex gap-4">
                    <button onClick={() => setScreen(3)} className="btn-secondary">戻る</button>
                    <button onClick={() => setScreen(5)} className="btn-primary">AIをスキップして進む</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-12 flex flex-col items-center">
            <div className="max-w-4xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 relative">

                {/* Header */}
                <div className="bg-slate-900/90 backdrop-blur p-8 rounded-2xl text-white flex flex-col border border-border/50 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 bg-accent/20 w-40 h-40 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 bg-blue-500/20 w-40 h-40 rounded-full blur-3xl pointer-events-none"></div>

                    <h2 className="text-3xl font-black mb-2 relative z-10 tracking-tight">AI先輩のアドバイス</h2>
                    <p className="text-background/80 text-sm flex items-center relative z-10 font-medium">
                        <Briefcase className="w-4 h-4 mr-2" /> 目標: {dreamJob}
                    </p>
                </div>

                {/* Overall Feedback */}
                <div className="bg-card rounded-2xl p-6 md:p-8 border border-border shadow-sm relative">
                    <Quote className="absolute top-6 left-6 w-10 h-10 text-accent/10 -rotate-12" />
                    <p className="text-foreground text-lg leading-relaxed font-medium relative z-10 pl-4 py-2">
                        {consultation.overallFeedback}
                    </p>
                </div>

                {/* Course Checklist */}
                <div className="space-y-4">
                    <h3 className="font-bold text-foreground text-xl flex items-center border-b border-border pb-2">
                        選別リスト
                        <span className="ml-3 text-sm font-normal text-muted bg-muted/20 px-3 py-1 rounded-full">
                            履修しない科目はチェックを外してください
                        </span>
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                        {consultation.courseFeedbacks.map((fb, idx) => {
                            const isChecked = selectedToKeep[fb.courseId];
                            return (
                                <div
                                    key={idx}
                                    onClick={() => toggleCourse(fb.courseId)}
                                    className={`p-5 rounded-xl border transition-all cursor-pointer flex gap-4 items-start ${isChecked ? 'bg-card border-accent/40 shadow-sm' : 'bg-muted/10 border-border opacity-60 grayscale-[0.5]'}`}
                                >
                                    <div className="mt-1 flex-shrink-0">
                                        {isChecked ? (
                                            <CheckSquare className="w-6 h-6 text-accent" />
                                        ) : (
                                            <Square className="w-6 h-6 text-muted" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-lg text-foreground mb-1 flex items-center gap-3">
                                            <span className="px-2 py-0.5 bg-background border border-border rounded text-xs text-muted font-mono">{fb.courseId}</span>
                                            {fb.courseName}
                                        </div>
                                        <p className="text-muted/90 text-sm leading-relaxed">
                                            {fb.comment}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-between items-center bg-card p-6 rounded-2xl border border-border shadow-sm sticky bottom-6 z-20">
                    <button
                        onClick={() => setScreen(3)}
                        className="btn-ghost text-muted hover:text-foreground"
                    >
                        科目選択に戻る
                    </button>
                    <button
                        onClick={handleFinalize}
                        className="btn-primary flex items-center group shadow-md hover:shadow-lg py-3 px-8 text-base"
                        disabled={Object.values(selectedToKeep).filter(Boolean).length === 0}
                    >
                        チェックした科目で時間割を組む
                        <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

            </div>
        </div>
    );
};
