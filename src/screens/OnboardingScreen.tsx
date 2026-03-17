import React from 'react';
import { useAppContext } from '../AppContext';
import { ChevronRight, GraduationCap, Plus, Trash2 } from 'lucide-react';

export const OnboardingScreen: React.FC = () => {
    const { state, updateProfile, updateSettings, setScreen } = useAppContext();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (state.userProfile.nickname.trim() === '') {
            alert('ニックネームを入力してください');
            return;
        }
        setScreen(2);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4">
            <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl p-8 max-w-md w-full border border-white">
                <div className="flex justify-center mb-6">
                    <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-8">
                    次世代時間割 AI <span className="text-indigo-600">Senpai</span>
                </h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ニックネーム</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm outline-none"
                            placeholder="例: 会津 太郎"
                            value={state.userProfile.nickname}
                            onChange={(e) => updateProfile({ nickname: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">大学</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-lg border border-gray-100 bg-gray-50 text-gray-500 shadow-sm outline-none select-none cursor-not-allowed"
                            value="会津大学"
                            disabled
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">なりたい職業 (目標)</label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm outline-none"
                            placeholder="例: AIエンジニア、データサイエンティスト"
                            value={state.userProfile.dreamJob}
                            onChange={(e) => updateProfile({ dreamJob: e.target.value })}
                        />
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">成績評価設定 (ラベルとGPAポイント)</label>
                        <div className="space-y-2 mb-3">
                            {state.userProfile.gradingScale.map((grade, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="ラベル (例: S)"
                                        className="w-1/2 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        value={grade.label}
                                        onChange={(e) => {
                                            const newScale = [...state.userProfile.gradingScale];
                                            newScale[index].label = e.target.value;
                                            updateProfile({ gradingScale: newScale });
                                        }}
                                    />
                                    <input
                                        type="number"
                                        placeholder="ポイント (例: 4)"
                                        className="w-1/3 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        value={grade.point}
                                        onChange={(e) => {
                                            const newScale = [...state.userProfile.gradingScale];
                                            newScale[index].point = Number(e.target.value);
                                            updateProfile({ gradingScale: newScale });
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newScale = state.userProfile.gradingScale.filter((_, i) => i !== index);
                                            updateProfile({ gradingScale: newScale });
                                        }}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                updateProfile({ gradingScale: [...state.userProfile.gradingScale, { label: '', point: 0 }] });
                            }}
                            className="flex items-center text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-1" /> 追加する
                        </button>
                    </div>

                    <div className="border-t border-gray-100 pt-6 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">稼働曜日</label>
                            <select
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm outline-none"
                                value={state.timetableSettings.workingDays}
                                onChange={(e) => updateSettings({ workingDays: Number(e.target.value) })}
                            >
                                <option value={5}>月〜金 (5日間)</option>
                                <option value={6}>月〜土 (6日間)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">最大時限数</label>
                            <select
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors shadow-sm outline-none"
                                value={state.timetableSettings.maxPeriods}
                                onChange={(e) => updateSettings({ maxPeriods: Number(e.target.value) })}
                            >
                                {[5, 6, 7, 8, 9, 10].map(p => (
                                    <option key={p} value={p}>{p}限まで</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center group"
                    >
                        次へ進む
                        <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>
            </div>
        </div>
    );
};
