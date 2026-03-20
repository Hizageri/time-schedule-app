import React from 'react';
import { useAppContext } from '../AppContext';
import { CheckCircle, Save, ChevronLeft } from 'lucide-react';

export const ReflectionScreen: React.FC = () => {
    const { state, saveGrade, setScreen, updateConditions } = useAppContext();

    // Local state for grades if we want to batch save them
    // For simplicity we use the context directly via saveGrade

    const handleComplete = () => {
        // Advanced the selected term logic or reset classes etc.
        updateConditions({
            term: state.timetableConditions.term === 'first' ? 'second' : 'first',
            targetGrade: state.timetableConditions.term === 'second' ? Math.min(6, state.timetableConditions.targetGrade + 1) : state.timetableConditions.targetGrade
        });
        // Go back to condition screen to plan next term
        setScreen(2);
    };

    const uniqueCourses = Array.from(new Set(state.committedClasses.map(c => c.courseId)));

    return (
        <div className="min-h-screen bg-background p-12 flex flex-col items-center justify-center">
            <div className="max-w-3xl w-full bg-card rounded-2xl shadow-lg border border-border overflow-hidden">

                <div className="p-8 border-b border-border bg-card/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-foreground flex items-center mb-2">
                            <CheckCircle className="w-7 h-7 mr-3 text-accent" />
                            学期の振り返り・成績入力
                        </h2>
                        <p className="text-muted text-sm">
                            お疲れ様でした！次の時間割を作成する前に、今学期の成績と感想（難易度など）を記録しましょう。このデータはAIコンサルの精度向上に使われます。
                        </p>
                    </div>
                </div>

                <div className="p-8">
                    {uniqueCourses.length === 0 ? (
                        <div className="text-center py-10 text-muted">
                            <p>選んだ科目がありません。</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {uniqueCourses.map(courseId => {
                                const defaultGrade = state.userProfile.gradingScale.length > 0 ? state.userProfile.gradingScale[0].label : 'S';
                                const currentGrade = state.grades[courseId] || { grade: defaultGrade, classDifficulty: 3, testDifficulty: 3 };

                                return (
                                    <div key={courseId} className="bg-card/50 rounded-xl p-5 border border-border">
                                        <h3 className="font-bold text-foreground text-lg mb-4">{courseId}</h3>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">成績</label>
                                                <select
                                                    className="w-full px-3 py-2 rounded-md border border-border focus:ring-1 focus:ring-accent outline-none bg-card"
                                                    value={currentGrade.grade}
                                                    onChange={(e) => saveGrade(courseId, { ...currentGrade, grade: e.target.value })}
                                                >
                                                    {state.userProfile.gradingScale.map((g, idx) => (
                                                        <option key={idx} value={g.label}>{g.label}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">授業の難易度 (1-5)</label>
                                                <input
                                                    type="range" min="1" max="5"
                                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-accent mt-2"
                                                    value={currentGrade.classDifficulty}
                                                    onChange={(e) => saveGrade(courseId, { ...currentGrade, classDifficulty: parseInt(e.target.value) })}
                                                />
                                                <div className="text-center text-sm font-medium mt-1 text-accent">{currentGrade.classDifficulty}</div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">テストの難易度 (1-5)</label>
                                                <input
                                                    type="range" min="1" max="5"
                                                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-accent mt-2"
                                                    value={currentGrade.testDifficulty}
                                                    onChange={(e) => saveGrade(courseId, { ...currentGrade, testDifficulty: parseInt(e.target.value) })}
                                                />
                                                <div className="text-center text-sm font-medium mt-1 text-accent">{currentGrade.testDifficulty}</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-10 border-t border-border pt-6">
                        <button
                            onClick={() => setScreen(5)}
                            className="btn-ghost flex items-center"
                        >
                            <ChevronLeft className="w-5 h-5 mr-1" />
                            キャンセル
                        </button>

                        <button
                            onClick={handleComplete}
                            className="btn-primary flex items-center"
                        >
                            <Save className="w-5 h-5 mr-2" />
                            保存して次の学期へ
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
