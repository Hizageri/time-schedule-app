import React from 'react';
import { useAppContext } from '../AppContext';
import { ChevronRight } from 'lucide-react';

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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-gray-50 p-12">
            <div className="w-full max-w-2xl space-y-16">
                {/* Icon Section */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl shadow-2xl flex items-center justify-center">
                            <div className="grid grid-cols-3 gap-1">
                                <div className="w-3 h-3 bg-white rounded-sm"></div>
                                <div className="w-3 h-3 bg-white/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-white rounded-sm"></div>
                                <div className="w-3 h-3 bg-white/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-white rounded-sm"></div>
                                <div className="w-3 h-3 bg-white/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-white rounded-sm"></div>
                                <div className="w-3 h-3 bg-white/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-white rounded-sm"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="text-center space-y-8">
                    {/* Title */}
                    <div className="space-y-4">
                        <h1 className="text-6xl font-bold text-slate-900 tracking-tight">
                            AI Timetable
                        </h1>
                        <p className="text-xl text-slate-600 font-light leading-relaxed max-w-lg mx-auto">
                            最適な時間割を数秒で生成します。
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">ニックネーム</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm outline-none text-lg"
                                placeholder="例: 会津 太郎"
                                value={state.userProfile.nickname}
                                onChange={(e) => updateProfile({ nickname: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">大学</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 shadow-sm outline-none select-none cursor-not-allowed text-lg"
                                value="会津大学"
                                disabled
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">なりたい職業 (目標)</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm outline-none text-lg"
                                placeholder="例: AIエンジニア、データサイエンティスト"
                                value={state.userProfile.dreamJob}
                                onChange={(e) => updateProfile({ dreamJob: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">稼働曜日</label>
                                <select
                                    className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm outline-none text-lg"
                                    value={state.timetableSettings.workingDays}
                                    onChange={(e) => updateSettings({ workingDays: Number(e.target.value) })}
                                >
                                    <option value={5}>月〜金 (5日間)</option>
                                    <option value={6}>月〜土 (6日間)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">最大時限数</label>
                                <select
                                    className="w-full px-6 py-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-sm outline-none text-lg"
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
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-5 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center group text-lg"
                        >
                            次へ進む
                            <ChevronRight className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
