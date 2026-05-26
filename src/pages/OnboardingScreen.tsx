import React from 'react';
import { useAppContext } from '../logic/AppContext';
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
        <div className="min-h-screen flex items-center justify-center bg-background p-12">
            <div className="w-full max-w-2xl space-y-16">
                {/* Icon Section */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="w-24 h-24 bg-gradient-to-br from-foreground to-foreground/80 rounded-2xl shadow-2xl flex items-center justify-center">
                            <div className="grid grid-cols-3 gap-1">
                                <div className="w-3 h-3 bg-background rounded-sm"></div>
                                <div className="w-3 h-3 bg-background/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-background rounded-sm"></div>
                                <div className="w-3 h-3 bg-background/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-background rounded-sm"></div>
                                <div className="w-3 h-3 bg-background/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-background rounded-sm"></div>
                                <div className="w-3 h-3 bg-background/60 rounded-sm"></div>
                                <div className="w-3 h-3 bg-background rounded-sm"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="text-center space-y-8">
                    {/* Title */}
                    <div className="space-y-4">
                        <h1 className="text-6xl font-bold text-foreground tracking-tight">
                            AI Timetable
                        </h1>
                        <p className="text-xl text-muted font-light leading-relaxed max-w-lg mx-auto">
                            最適な時間割を数秒で生成します。
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">ニックネーム</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 rounded-xl border border-border focus:ring-2 focus:ring-accent focus:border-accent transition-all shadow-sm outline-none text-lg bg-card placeholder:text-muted/60"
                                placeholder="例: 会津 太郎"
                                value={state.userProfile.nickname}
                                onChange={(e) => updateProfile({ nickname: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted mb-2">
                                大学
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full px-6 py-4 rounded-xl border-2 border-border bg-white text-foreground font-bold shadow-sm select-none cursor-not-allowed text-lg transition-all"
                                    value="会津大学"
                                    disabled
                                />
                                {/* 右側に鍵アイコンなどを置くと「固定」がより伝わる */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">なりたい職業 (目標)</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 rounded-xl border border-border focus:ring-2 focus:ring-accent focus:border-accent transition-all shadow-sm outline-none text-lg bg-card placeholder:text-muted/60"
                                placeholder="例: AIエンジニア、データサイエンティスト"
                                value={state.userProfile.dreamJob}
                                onChange={(e) => updateProfile({ dreamJob: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">稼働曜日</label>
                                <select
                                    className="w-full px-6 py-4 rounded-xl border border-border focus:ring-2 focus:ring-accent focus:border-accent transition-all shadow-sm outline-none text-lg bg-card"
                                    value={state.timetableSettings.workingDays}
                                    onChange={(e) => updateSettings({ workingDays: Number(e.target.value) })}
                                >
                                    <option value={5}>月〜金 (5日間)</option>
                                    <option value={6}>月〜土 (6日間)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">最大時限数</label>
                                <select
                                    className="w-full px-6 py-4 rounded-xl border border-border focus:ring-2 focus:ring-accent focus:border-accent transition-all shadow-sm outline-none text-lg bg-card"
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
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5 px-8 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center group text-lg"
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
