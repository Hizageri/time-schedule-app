import React from 'react';
import { useAppContext } from '../AppContext';
import { ChevronRight, ChevronLeft, CalendarClock } from 'lucide-react';

export const ConditionScreen: React.FC = () => {
    const { state, updateConditions, setScreen } = useAppContext();

    return (
        <div className="min-h-screen bg-background p-12 flex items-center justify-center">
            <div className="max-w-xl w-full bg-card rounded-2xl shadow-lg border border-border overflow-hidden">
                <div className="bg-foreground p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
                    <CalendarClock className="w-10 h-10 mx-auto mb-3 text-background/80 relative z-10" />
                    <h2 className="text-xl font-bold relative z-10">時間割の条件設定</h2>
                    <p className="text-background/70 text-sm mt-1 relative z-10">
                        こんにちは、{state.userProfile.nickname}さん。新学期の条件を教えてください。
                    </p>
                </div>

                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">対象学年</label>
                            <select
                                className="w-full px-4 py-3 rounded-lg border border-border focus:ring-2 focus:ring-accent focus:border-accent shadow-sm outline-none bg-card"
                                value={state.timetableConditions.targetGrade}
                                onChange={(e) => updateConditions({ targetGrade: parseInt(e.target.value, 10) })}
                            >
                                {[1, 2, 3, 4, 5, 6].map(g => (
                                    <option key={g} value={g}>{g}年生</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-foreground mb-2">学期 (期)</label>
                            <select
                                className="w-full px-4 py-3 rounded-lg border border-border focus:ring-2 focus:ring-accent focus:border-accent shadow-sm outline-none bg-card"
                                value={state.timetableConditions.term}
                                onChange={(e) => updateConditions({ term: e.target.value as any })}
                            >
                                <option value="first">前期</option>
                                <option value="second">後期</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-between pt-4">
                        <button
                            onClick={() => setScreen(1)}
                            className="px-6 py-3 rounded-xl border border-border text-muted font-medium hover:bg-card transition-colors flex items-center"
                        >
                            <ChevronLeft className="w-5 h-5 mr-1" />
                            戻る
                        </button>
                        <button
                            onClick={() => setScreen(3)}
                            className="bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all flex items-center group shadow-accent/20"
                        >
                            科目選択へ
                            <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
