import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { Calendar as CalendarIcon, Award, User, PlusCircle, Edit3, Save } from 'lucide-react';
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
        return state.committedClasses.filter(c => getQuarterType(c.targetBit ?? 0) === 'intensive' || c.schedule.includes('TBD'));
    };

    const gpaData = useMemo(() => {
        let totalCredits = 0;
        let totalEarnedCredits = 0;
        let totalPoints = 0;

        Object.entries(state.grades).forEach(([courseId, gradeInfo]) => {
            const course = MOCK_COURSES.find(c => c.id_name === courseId);
            if (!course) return;
            const credits = course.credits;
            const scale = state.userProfile.gradingScale.find(s => s.label === gradeInfo.grade);
            const point = scale ? scale.point : 0;

            totalCredits += credits;
            if (point > 0) totalEarnedCredits += credits;
            totalPoints += point * credits;
        });

        const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
        return { gpa, totalCredits, totalEarnedCredits };
    }, [state.grades, state.userProfile.gradingScale]);

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
                                            <div key={idx} className="bg-purple-100 border border-purple-200 text-purple-800 text-sm px-3 py-2 rounded-lg font-medium">
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
                        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                            <h2 className="font-bold text-foreground text-lg flex items-center">
                                <Award className="w-5 h-5 mr-3 text-accent" />
                                成績データ
                            </h2>
                            <div className="bg-background px-4 py-2 rounded-lg border border-border text-center shadow-sm">
                                <div className="text-xs text-muted font-bold mb-1 uppercase tracking-wider">現在のGPA</div>
                                <div className="text-2xl font-black text-accent leading-none">{gpaData.gpa}</div>
                                <div className="text-xs text-muted mt-2 font-medium">修得単位: <span className="text-foreground">{gpaData.totalEarnedCredits} / {gpaData.totalCredits}</span></div>
                            </div>
                        </div>
                        {Object.keys(state.grades).length === 0 ? (
                            <p className="text-gray-500 text-sm">成績データはまだありません。</p>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(state.grades).map(([courseId, g]) => (
                                    <div key={courseId} className="border border-gray-100 rounded-lg p-4 flex justify-between items-center">
                                        <div className="font-medium text-gray-800">{courseId}</div>
                                        <div className="flex space-x-6 text-sm">
                                            <div>成績: <span className="font-bold text-indigo-600">{g.grade}</span></div>
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
                        onClick={() => setScreen(7)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg shadow-indigo-300 transition-transform hover:scale-105 flex items-center group"
                    >
                        <PlusCircle className="w-6 h-6 mr-2" />
                        <span className="font-semibold pr-2">次学期の時間割を作る</span>
                    </button>
                </div>
            </main>
        </div>
    );
};
