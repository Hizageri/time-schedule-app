import React from 'react';
import { useAppContext } from '../AppContext';
import { Sparkles, Briefcase, GraduationCap, ChevronRight } from 'lucide-react';

export const ProposalScreen: React.FC = () => {
    const { state, setScreen } = useAppContext();

    const dreamJob = state.userProfile.dreamJob || '未設定';
    const hasJob = dreamJob !== '未設定';

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6 flex flex-col items-center justify-center">
            <div className="max-w-3xl w-full">

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8 border border-indigo-100 flex flex-col animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-indigo-600 p-8 text-white flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 bg-white/10 w-40 h-40 rounded-full blur-3xl"></div>
                        <div className="bg-white/20 p-4 rounded-full mb-4 relative z-10">
                            <Sparkles className="w-10 h-10 text-indigo-100" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2 relative z-10">AI先輩のアドバイス</h2>
                        <p className="text-indigo-200 text-sm flex items-center justify-center relative z-10">
                            <Briefcase className="w-4 h-4 mr-1" /> 目標: {dreamJob}
                        </p>
                    </div>

                    <div className="p-8">
                        <div className="mb-8">
                            <p className="text-lg text-gray-700 leading-relaxed font-medium">
                                「{state.userProfile.nickname}さん、科目選択お疲れ様！
                                今回気になるとして選んだ {state.selectedCourses.length} 科目、なかなか良いバランスだね。
                                {hasJob ? `${dreamJob}を目指す観点から見ると、特に重要な科目がいくつか含まれているよ。` : '基礎をしっかり固められる構成になっていると思うよ。'}」
                            </p>
                        </div>

                        {state.selectedCourses.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 mb-6">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                                    <GraduationCap className="w-5 h-5 mr-2 text-indigo-500" />
                                    注目科目ピックアップ
                                </h3>
                                <div className="space-y-4">
                                    {state.selectedCourses.slice(0, 2).map((course, idx) => (
                                        <div key={idx} className="flex flex-col md:flex-row md:items-start gap-4 p-4 bg-white rounded-lg border border-indigo-50 shadow-sm">
                                            <div className="bg-indigo-100 text-indigo-800 font-bold px-3 py-1 rounded text-sm whitespace-nowrap self-start mt-1">
                                                {course.id_name}
                                            </div>
                                            <p className="text-gray-600 text-sm leading-relaxed">
                                                {idx === 0
                                                    ? `この科目は${hasJob ? dreamJob + 'にとって必須の論理的思考力' : '今後の専門科目への理解'}を深める基礎になるよ。しっかり取り組もう！`
                                                    : `これは実践的なスキルが身につくね。早めに課題に着手するのが単位取得のコツだよ。`}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center mt-8">
                            <button
                                onClick={() => setScreen(5)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-10 rounded-xl shadow-lg shadow-indigo-200 transition-transform hover:scale-105 flex items-center group"
                            >
                                この科目で時間割を組む
                                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
