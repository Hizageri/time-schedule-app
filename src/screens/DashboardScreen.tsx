import React, { useState } from 'react';
import { useAppContext } from '../AppContext';
import { Calendar as CalendarIcon, Award, User, PlusCircle, Edit3, Save, X, Info, Settings2, RefreshCcw } from 'lucide-react';
import { MOCK_COURSES } from '../data';

export const DashboardScreen: React.FC = () => {
    const { state, setScreen, updateProfile } = useAppContext();
    const [activeTab, setActiveTab] = useState<'timetable' | 'grades' | 'profile'>('timetable');

    // Quarter Toggle State
    const termQuarters = state.timetableConditions.term === 'first'
        ? [{ val: 'odd', label: 'Q1' }, { val: 'even', label: 'Q2' }]
        : [{ val: 'odd', label: 'Q3' }, { val: 'even', label: 'Q4' }];
    const [activeQuarter, setActiveQuarter] = useState<'odd' | 'even'>('odd');

    // Profile Edit State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editNickname, setEditNickname] = useState(state.userProfile.nickname);
    const [editDreamJob, setEditDreamJob] = useState(state.userProfile.dreamJob);

    const handleSaveProfile = () => {
        updateProfile({ nickname: editNickname, dreamJob: editDreamJob });
        setIsEditingProfile(false);
    };

    const days = ['月', '火', '水', '木', '金', '土'].slice(0, state.timetableSettings.workingDays);
    const periods = Array.from({ length: state.timetableSettings.maxPeriods }, (_, i) => i + 1);

    // Helper to decipher quarter from target_bit (Bits 6-7)
    const getQuarterType = (bit: number): 'odd' | 'even' | 'across' | 'intensive' => {
        const qVal = (bit >> 6) & 3; // 00, 01, 10, 11
        if (qVal === 0) return 'odd';
        if (qVal === 1) return 'even';
        if (qVal === 2) return 'across';
        return 'intensive';
    };

    const getCellClasses = (day: string, period: number) => {
        const slotStr = `${day}-${period}`;
        return state.committedClasses.filter(c => {
            const qType = getQuarterType(c.targetBit ?? 0);
            // Match active quarter OR if it's "across" (通年/またぎ)
            if (qType !== 'across' && qType !== 'intensive' && qType !== activeQuarter) return false;
            if (qType === 'intensive') return false; // Intensives go below
            return c.schedule.includes(slotStr);
        });
    };

    const getIntensiveClasses = () => {
        return state.committedClasses.filter(c => getQuarterType(c.targetBit ?? 0) === 'intensive' || c.schedule.includes('TBD') || !c.schedule.some(s => s.includes('-')));
    };

    // Manual GPA State
    const [calcGpaData, setCalcGpaData] = useState<{ gpa: string, details: Record<string, number>, totalCredits: number, earnedCredits: number } | null>(null);
    const [isGpaSimulatorOpen, setIsGpaSimulatorOpen] = useState(false);
    const [simulatedGrades, setSimulatedGrades] = useState<Record<string, string>>({});

    const handleOpenGpaSimulator = () => {
        const initialGrades: Record<string, string> = {};
        Object.keys(state.grades).forEach(courseId => {
            initialGrades[courseId] = state.grades[courseId].grade;
        });
        setSimulatedGrades(initialGrades);
        setIsGpaSimulatorOpen(true);
        setCalcGpaData(null);
    };

    const handleCalculateGpa = () => {
        let totalCredits = 0;
        let totalEarnedCredits = 0;
        let totalPoints = 0;
        const details: Record<string, number> = {};

        state.userProfile.gradingScale.forEach(s => details[s.label] = 0);

        Object.entries(simulatedGrades).forEach(([courseId, gradeLabel]) => {
            const course = MOCK_COURSES.find(c => c.id_name === courseId);
            if (!course) return;
            const credits = course.credits;
            const scale = state.userProfile.gradingScale.find(s => s.label === gradeLabel);
            if (scale) {
                totalCredits += credits;
                totalPoints += scale.point * credits;
                details[scale.label] += credits;
                if (scale.point > 0) totalEarnedCredits += credits;
            }
        });

        const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
        setCalcGpaData({ gpa, details, totalCredits, earnedCredits: totalEarnedCredits });
    };

    // Intensive class modal state
    const [selectedIntensiveClass, setSelectedIntensiveClass] = useState<{ courseId: string, classId: string, schedule: string[] } | null>(null);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top Navbar */}
            <header className="bg-foreground text-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <h1 className="text-xl font-bold flex items-center">
                            <CalendarIcon className="w-6 h-6 mr-2" />
                            My Dashboard
                        </h1>
                        <div className="text-sm font-medium bg-foreground/80 px-3 py-1 rounded-full">
                            {state.userProfile.nickname} さん
                        </div>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-card border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => setActiveTab('timetable')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-200 hover:scale-105 ${activeTab === 'timetable' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-foreground hover:border-border'}`}
                        >
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            時間割
                        </button>
                        <button
                            onClick={() => setActiveTab('grades')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-200 hover:scale-105 ${activeTab === 'grades' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-foreground hover:border-border'}`}
                        >
                            <Award className="w-4 h-4 mr-2" />
                            成績
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-200 hover:scale-105 ${activeTab === 'profile' ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-foreground hover:border-border'}`}
                        >
                            <User className="w-4 h-4 mr-2" />
                            プロフィール
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                {activeTab === 'timetable' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                            <div className="p-4 border-b border-border bg-card flex justify-between items-center flex-wrap gap-4">
                                <h2 className="font-bold text-foreground flex items-center">
                                    時間割グリッド
                                    <span className="ml-3 text-xs bg-accent/10 text-accent px-2 py-1 rounded font-semibold">
                                        {state.timetableConditions.term === 'first' ? '前期' : '後期'}
                                    </span>
                                </h2>

                                {/* Quarter Toggle Controls */}
                                <div className="flex bg-muted/60 p-1 rounded-lg">
                                    {termQuarters.map(q => (
                                        <button
                                            key={q.val}
                                            onClick={() => setActiveQuarter(q.val as 'odd' | 'even')}
                                            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeQuarter === q.val ? 'bg-card text-accent shadow-sm' : 'text-muted hover:text-foreground'}`}
                                        >
                                            {q.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 overflow-x-auto overflow-y-auto max-h-[65vh]">
                                <table className="w-full min-w-[600px] border-collapse relative">
                                    <thead>
                                        <tr>
                                            <th className="sticky top-0 z-10 w-16 border border-border bg-card p-2 text-muted text-sm font-medium">時限</th>
                                            {days.map(d => (
                                                <th key={d} className={`sticky top-0 z-10 border border-border p-2 text-sm font-bold w-1/5 ${d === '土' ? 'bg-blue-50 text-blue-800' : 'bg-accent/10 text-foreground backdrop-blur'}`}>{d}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {periods.map(p => (
                                            <tr key={p}>
                                                <td className="border border-border bg-card p-2 text-center text-muted font-medium">{p}限</td>
                                                {days.map(d => {
                                                    const cellClasses = getCellClasses(d, p);
                                                    return (
                                                        <td key={`${d}-${p}`} className="border border-border p-2 h-24 align-top">
                                                            {cellClasses.map((c, idx) => (
                                                                <div key={idx} className="bg-blue-100 border border-blue-200 text-blue-800 text-xs p-2 rounded mb-1 shadow-sm">
                                                                    <div className="font-bold">{c.courseId}</div>
                                                                    <div className="text-[10px] text-blue-600 mt-1">{c.classId}</div>
                                                                </div>
                                                            ))}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {getIntensiveClasses().length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <h2 className="font-bold text-gray-800 text-sm">集中講義・その他 (Q問わず)</h2>
                                </div>
                                <div className="p-4">
                                    <div className="flex flex-wrap gap-2">
                                        {getIntensiveClasses().map((c, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-purple-100 border border-purple-200 text-purple-800 text-sm px-3 py-2 rounded-lg font-medium cursor-pointer hover:bg-purple-200 transition-colors"
                                                onClick={() => setSelectedIntensiveClass(c)}
                                            >
                                                {c.courseId} <span className="text-xs text-purple-600 ml-1">({c.classId})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'grades' && (
                    <div className="bg-card rounded-xl shadow-sm border border-border p-6 animate-in fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h2 className="font-bold text-foreground text-lg flex items-center">
                                <Award className="w-5 h-5 mr-3 text-accent" />
                                成績データ
                            </h2>
                            {!isGpaSimulatorOpen && !calcGpaData && (
                                <button onClick={handleOpenGpaSimulator} className="btn-primary flex items-center py-2 px-4 shadow-sm text-sm">
                                    <Settings2 className="w-4 h-4 mr-2" />
                                    GPAを計算する
                                </button>
                            )}
                            {calcGpaData && (
                                <div className="flex flex-col items-end gap-3">
                                    <div className="bg-background px-4 py-3 rounded-lg border border-border flex flex-col items-center shadow-sm min-w-[200px]">
                                        <div className="text-xs text-muted font-bold mb-1 uppercase tracking-wider">現在のGPA</div>
                                        <div className="text-3xl font-black text-accent leading-none mb-3">{calcGpaData.gpa}</div>
                                        <div className="w-full flex justify-between text-xs font-semibold border-b border-border pb-1 mb-2">
                                            <span className="text-muted">修得単位:</span>
                                            <span className="text-foreground">{calcGpaData.earnedCredits} / {calcGpaData.totalCredits}</span>
                                        </div>
                                        <div className="w-full grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-medium text-muted">
                                            {Object.entries(calcGpaData.details).map(([gradeLabel, count]) => (
                                                <div key={gradeLabel} className="flex justify-between">
                                                    <span>{gradeLabel}:</span>
                                                    <span className="text-foreground">{count}単位</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={handleOpenGpaSimulator} className="text-accent hover:text-accent/80 text-sm font-semibold flex items-center">
                                        <RefreshCcw className="w-4 h-4 mr-1" /> 再調整する
                                    </button>
                                </div>
                            )}
                        </div>

                        {isGpaSimulatorOpen && !calcGpaData && (
                            <div className="bg-background border border-border rounded-xl p-5 mb-6 shadow-inner animate-in fade-in slide-in-from-top-4">
                                <h3 className="font-bold text-foreground mb-4 border-b border-border pb-2">GPAシミュレーター</h3>
                                <p className="text-sm text-muted mb-4">現在の成績が表示されています。微調整して確定してください。</p>
                                <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                                    {Object.keys(state.grades).length === 0 ? (
                                        <p className="text-muted text-sm my-4 text-center">計算可能な成績データがありません。</p>
                                    ) : (
                                        Object.keys(state.grades).map(courseId => (
                                            <div key={courseId} className="flex justify-between items-center bg-card p-3 rounded-lg border border-border">
                                                <span className="font-medium text-foreground text-sm truncate pr-4">{courseId}</span>
                                                <select
                                                    className="px-3 py-1.5 rounded-md border border-border focus:ring-1 focus:ring-accent outline-none bg-background text-sm font-semibold w-24"
                                                    value={simulatedGrades[courseId] || ''}
                                                    onChange={(e) => setSimulatedGrades(prev => ({ ...prev, [courseId]: e.target.value }))}
                                                >
                                                    {state.userProfile.gradingScale.map((g, idx) => (
                                                        <option key={idx} value={g.label}>{g.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setIsGpaSimulatorOpen(false)} className="btn-ghost text-sm py-2">キャンセル</button>
                                    <button
                                        onClick={handleCalculateGpa}
                                        className="btn-primary text-sm py-2"
                                        disabled={Object.keys(state.grades).length === 0}
                                    >
                                        確定してGPAを算出
                                    </button>
                                </div>
                            </div>
                        )}
                        {Object.keys(state.grades).length === 0 ? (
                            <p className="text-muted text-sm my-10 text-center">成績データはまだありません。</p>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(state.grades).map(([courseId, g]) => (
                                    <div key={courseId} className="border border-gray-100 rounded-lg p-4 flex justify-between items-center">
                                        <div className="font-medium text-foreground">{courseId}</div>
                                        <div className="flex space-x-6 text-sm text-muted">
                                            <div>成績: <span className="font-bold text-accent">{g.grade}</span></div>
                                            <div>授業難易度: {g.classDifficulty}/5</div>
                                            <div>テスト難易度: {g.testDifficulty}/5</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in max-w-2xl relative">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="font-bold text-gray-800 flex items-center">
                                <User className="w-5 h-5 mr-2 text-indigo-500" />
                                プロフィール情報
                            </h2>
                            {!isEditingProfile ? (
                                <button
                                    onClick={() => setIsEditingProfile(true)}
                                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center transition-colors"
                                >
                                    <Edit3 className="w-4 h-4 mr-1" /> 編集する
                                </button>
                            ) : (
                                <button
                                    onClick={handleSaveProfile}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors shadow-sm"
                                >
                                    <Save className="w-4 h-4 mr-1" /> 保存する
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-3 border-b border-gray-100 pb-3 items-center">
                                <div className="text-gray-500 text-sm">ニックネーム</div>
                                <div className="col-span-2">
                                    {isEditingProfile ? (
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={editNickname}
                                            onChange={(e) => setEditNickname(e.target.value)}
                                        />
                                    ) : (
                                        <span className="font-medium text-gray-800">{state.userProfile.nickname}</span>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 border-b border-gray-100 pb-3 items-center">
                                <div className="text-gray-500 text-sm">なりたい職業</div>
                                <div className="col-span-2">
                                    {isEditingProfile ? (
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={editDreamJob}
                                            onChange={(e) => setEditDreamJob(e.target.value)}
                                        />
                                    ) : (
                                        <span className="font-medium text-gray-800">{state.userProfile.dreamJob || '未設定'}</span>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 border-b border-gray-100 pb-3 items-center">
                                <div className="text-gray-500 text-sm">大学</div>
                                <div className="col-span-2 font-medium text-gray-500">{state.userProfile.university} (変更不可)</div>
                            </div>
                            <div className="grid grid-cols-3 border-b border-gray-100 pb-3 items-center">
                                <div className="text-gray-500 text-sm">成績評価システム</div>
                                <div className="col-span-2 font-medium text-gray-800">
                                    {state.userProfile.gradingScale.map(g => g.label).join(', ')}
                                </div>
                            </div>
                            <div className="grid grid-cols-3 border-b border-gray-100 pb-3 items-center">
                                <div className="text-gray-500 text-sm">学期制</div>
                                <div className="col-span-2 font-medium text-gray-800">{state.userProfile.termSystem}</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="fixed bottom-8 right-8">
                    <button
                        onClick={() => {
                            setScreen(7);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg shadow-indigo-300 transition-transform hover:scale-105 flex items-center group"
                    >
                        <PlusCircle className="w-6 h-6 mr-2" />
                        <span className="font-semibold pr-2">次学期の時間割を作る</span>
                    </button>
                </div>
            </main>

            {/* Intensive Class Schedule Modal */}
            {selectedIntensiveClass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col">
                        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
                            <h3 className="font-bold text-foreground flex items-center text-lg">
                                <Info className="w-5 h-5 mr-2 text-accent" />
                                科目スケジュール詳細
                            </h3>
                            <button
                                onClick={() => setSelectedIntensiveClass(null)}
                                className="text-muted hover:text-foreground hover:bg-background p-1.5 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <div className="text-sm font-bold text-accent">{selectedIntensiveClass.courseId}</div>
                                <div className="text-xs text-muted mt-1">クラス: {selectedIntensiveClass.classId}</div>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-foreground mb-2 border-b border-border pb-1">開講スケジュール</h4>
                                {selectedIntensiveClass.schedule && selectedIntensiveClass.schedule.length > 0 ? (
                                    <ul className="space-y-1">
                                        {selectedIntensiveClass.schedule.map((s, idx) => (
                                            <li key={idx} className="text-sm text-muted flex items-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent mr-2"></div>
                                                {s === 'TBD' ? '未定・オンデマンド等' : s}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted">スケジュール情報は登録されていません。</p>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
                            <button
                                onClick={() => setSelectedIntensiveClass(null)}
                                className="btn-secondary text-sm px-6"
                            >
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
