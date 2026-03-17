import React from 'react';
import { useAppContext } from '../AppContext';
import { ChevronRight, ChevronLeft, CalendarClock, AlertTriangle } from 'lucide-react';

export const ConditionScreen: React.FC = () => {
    const { state, updateConditions, setScreen } = useAppContext();

    return (
        <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
            <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-indigo-600 p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 w-24 h-24 rounded-full blur-2xl"></div>
                    <CalendarClock className="w-10 h-10 mx-auto mb-3 text-indigo-100 relative z-10" />
                    <h2 className="text-xl font-bold relative z-10">時間割の条件設定</h2>
                    <p className="text-indigo-100 text-sm mt-1 relative z-10">
                        こんにちは、{state.userProfile.nickname}さん。新学期の条件を教えてください。
                    </p>
                </div>

                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">対象学年</label>
                            <select
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none"
                                value={state.timetableConditions.targetGrade}
                                onChange={(e) => updateConditions({ targetGrade: parseInt(e.target.value, 10) })}
                            >
                                {[1, 2, 3, 4, 5, 6].map(g => (
                                    <option key={g} value={g}>{g}年生</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">学期 (期)</label>
                            <select
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none"
                                value={state.timetableConditions.term}
                                onChange={(e) => updateConditions({ term: e.target.value as any })}
                            >
                                <option value="first">前期</option>
                                <option value="second">後期</option>
                            </select>
                        </div>
                    </div>

// Removed quarter selection for V2

                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-md font-semibold text-gray-800 flex items-center">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
                                    再履修科目はありますか？
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">過去に単位を落とした科目がある場合はチェックしてください</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={state.timetableConditions.hasRetake}
                                    onChange={(e) => updateConditions({ hasRetake: e.target.checked })}
                                />
                                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                            </label>
                        </div>

                        {state.timetableConditions.hasRetake && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4 animate-in fade-in slide-in-from-top-4">
                                <p className="text-sm text-amber-800 font-medium mb-3">未取得科目リスト（モック）</p>
                                <div className="space-y-2">
                                    <label className="flex items-center space-x-3 p-2 hover:bg-amber-100/50 rounded-lg cursor-pointer transition-colors">
                                        <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                        <span className="text-sm text-gray-700">PR01 プログラミング入門 (1年)</span>
                                    </label>
                                    <label className="flex items-center space-x-3 p-2 hover:bg-amber-100/50 rounded-lg cursor-pointer transition-colors">
                                        <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                        <span className="text-sm text-gray-700">MA00 基礎数学 (1年)</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between pt-4">
                        <button
                            onClick={() => setScreen(1)}
                            className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors flex items-center"
                        >
                            <ChevronLeft className="w-5 h-5 mr-1" />
                            戻る
                        </button>
                        <button
                            onClick={() => setScreen(3)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-xl shadow-md transition-all flex items-center group shadow-indigo-200/50"
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
