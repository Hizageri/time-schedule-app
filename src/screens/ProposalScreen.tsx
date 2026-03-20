import React from 'react';
import { useAppContext } from '../AppContext';
import { Briefcase, GraduationCap, ChevronRight } from 'lucide-react';
import { getSubjectColor } from '../utils';

export const ProposalScreen: React.FC = () => {
    const { state, setScreen } = useAppContext();

    const dreamJob = state.userProfile.dreamJob || '未設定';
    const hasJob = dreamJob !== '未設定';

    return (
        <div className="min-h-screen bg-background p-12 flex flex-col items-center justify-center">
            <div className="max-w-4xl w-full space-y-8">
                {/* AI Advice Section */}
                <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border flex flex-col">
                    <div className="bg-slate-900/90 backdrop-blur p-10 text-white flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 bg-white/10 w-40 h-40 rounded-full blur-3xl"></div>
                        <div className="bg-white/20 p-6 rounded-full mb-4 relative z-10">
                            <div className="grid grid-cols-3 gap-1">
                                <div className="w-3 h-3 bg-background rounded-sm"></div>
                                <div className="w-3 h-3 bg-background/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-background rounded-sm"></div>
                                <div className="w-3 h-3 bg-background/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-background rounded-sm"></div>
                                <div className="w-3 h-3 bg-background/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-background rounded-sm"></div>
                                <div className="w-3 h-3 bg-background/60 rounded-sm"></div>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 relative z-10">AI先輩のアドバイス</h2>
                        <p className="text-background/80 text-sm flex items-center justify-center relative z-10">
                            <Briefcase className="w-5 h-5 mr-2" /> 目標: {dreamJob}
                        </p>
                    </div>

                    <div className="p-10">
                        <div className="mb-8">
                            <p className="text-xl text-foreground leading-relaxed font-medium">
                                「{state.userProfile.nickname}さん、科目選択お疲れ様！
                                今回気になるとして選んだ {state.selectedCourses.length} 科目、なかなか良いバランスだね。
                                {hasJob ? `${dreamJob}を目指す観点から見ると、特に重要な科目がいくつか含まれているよ。` : '基礎をしっかり固められる構成になっていると思うよ。'}」
                            </p>
                        </div>

                        {state.selectedCourses.length > 0 && (
                            <div className="bg-card rounded-xl p-6 border border-border mb-8">
                                <h3 className="font-bold text-foreground text-lg mb-4 flex items-center">
                                    <GraduationCap className="w-6 h-6 mr-3 text-muted" />
                                    注目科目ピックアップ
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {state.selectedCourses.slice(0, 4).map((course, idx) => {
                                        const colorClass = getSubjectColor(course.id_name);
                                        return (
                                            <div key={idx} className={`flex flex-col gap-3 p-4 bg-background rounded-lg border ${colorClass} shadow-sm`}>
                                                <div className={`font-bold px-3 py-1 rounded text-sm whitespace-nowrap self-start`}>
                                                    {course.id_name}
                                                </div>
                                                <p className="text-muted text-sm leading-relaxed">
                                                    {idx === 0
                                                        ? `この科目は${hasJob ? dreamJob + 'にとって必須の論理的思考力' : '今後の専門科目への理解'}を深める基礎になるよ。しっかり取り組もう！`
                                                        : `これは実践的なスキルが身につくね。早めに課題に着手するのが単位取得のコツだよ。`}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center">
                            <button
                                onClick={() => setScreen(5)}
                                className="btn-primary flex items-center group text-lg py-4 px-12"
                            >
                                この科目で時間割を組む
                                <ChevronRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
