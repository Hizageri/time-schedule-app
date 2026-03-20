import React from 'react';
import { useAppContext } from '../AppContext';
import { Sparkles, Briefcase, GraduationCap, ChevronRight } from 'lucide-react';

// Subject color coding function
const getSubjectColor = (courseName: string) => {
    const name = courseName.toLowerCase();
    
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

export const ProposalScreen: React.FC = () => {
    const { state, setScreen } = useAppContext();

    const dreamJob = state.userProfile.dreamJob || '未設定';
    const hasJob = dreamJob !== '未設定';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 p-12 flex flex-col items-center justify-center">
            <div className="max-w-4xl w-full space-y-8">
                {/* AI Advice Section */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col">
                    <div className="bg-slate-900 p-10 text-white flex flex-col items-center justify-center text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 bg-white/10 w-40 h-40 rounded-full blur-3xl"></div>
                        <div className="bg-white/20 p-6 rounded-full mb-4 relative z-10">
                            <div className="grid grid-cols-3 gap-1">
                                <div className="w-3 h-3 bg-white rounded-sm"></div>
                                <div className="w-3 h-3 bg-white/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-white rounded-sm"></div>
                                <div className="w-3 h-3 bg-white/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-white rounded-sm"></div>
                                <div className="w-3 h-3 bg-white/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-white rounded-sm"></div>
                                <div className="w-3 h-3 bg-white/60 rounded-sm"></div>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold mb-2 relative z-10">AI先輩のアドバイス</h2>
                        <p className="text-slate-300 text-sm flex items-center justify-center relative z-10">
                            <Briefcase className="w-5 h-5 mr-2" /> 目標: {dreamJob}
                        </p>
                    </div>

                    <div className="p-10">
                        <div className="mb-8">
                            <p className="text-xl text-slate-700 leading-relaxed font-medium">
                                「{state.userProfile.nickname}さん、科目選択お疲れ様！
                                今回気になるとして選んだ {state.selectedCourses.length} 科目、なかなか良いバランスだね。
                                {hasJob ? `${dreamJob}を目指す観点から見ると、特に重要な科目がいくつか含まれているよ。` : '基礎をしっかり固められる構成になっていると思うよ。'}」
                            </p>
                        </div>

                        {state.selectedCourses.length > 0 && (
                            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mb-8">
                                <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center">
                                    <GraduationCap className="w-6 h-6 mr-3 text-slate-600" />
                                    注目科目ピックアップ
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {state.selectedCourses.slice(0, 4).map((course, idx) => {
                                        const colorClass = getSubjectColor(course.id_name);
                                        return (
                                            <div key={idx} className={`flex flex-col gap-3 p-4 bg-white rounded-lg border ${colorClass} shadow-sm`}>
                                                <div className={`font-bold px-3 py-1 rounded text-sm whitespace-nowrap self-start`}>
                                                    {course.id_name}
                                                </div>
                                                <p className="text-slate-600 text-sm leading-relaxed">
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
                                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 px-12 rounded-xl shadow-lg transition-all flex items-center group text-lg"
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
