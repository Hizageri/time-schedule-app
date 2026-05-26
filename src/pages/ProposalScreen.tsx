import React, { useEffect, useState } from 'react';
import { useAppContext } from '../logic/AppContext';
import { Quote, CheckSquare, Square, AlertCircle, Loader2 } from 'lucide-react';
import { Header } from '../ui/Header';
import { generateConsultation } from '../api/aiService';
import type { ConsultationResponse } from '../api/aiService';

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
    }, []);

    const toggleCourse = (courseId: string) => {
        setSelectedToKeep(prev => ({ ...prev, [courseId]: !prev[courseId] }));
    };

    const handleFinalize = () => {
        const finalized = state.selectedCourses.filter(c => {
            const matchingKey = Object.keys(selectedToKeep).find(key => c.id_name.includes(key) || key.includes(c.id_name));
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
        <div className="min-h-screen bg-background flex flex-col">
            <Header
                title="AI先輩のアドバイス"
                subtitle={`目標: ${dreamJob}`}
                icon={Quote}
                action={{
                    label: "時間割を自動生成",
                    onClick: handleFinalize
                }}
            />

            <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4">
                {/* Overall Feedback */}
                <div className="bg-accent/5 rounded-2xl p-6 border border-accent/10 relative">
                    <p className="text-foreground text-md leading-relaxed font-medium">
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

                    <div className="grid grid-cols-1 gap-4 pb-12">
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
            </main>
        </div>
    );
};
