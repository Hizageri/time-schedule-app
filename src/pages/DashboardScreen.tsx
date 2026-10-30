import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { CalendarIcon, Award, Settings2, Save, X, User, RefreshCcw, Edit3, Info, Flame } from 'lucide-react';
import { Header } from '../ui/Header';
import { MOCK_COURSES } from '../data';
import { isPassingGradePoint } from '../utils/grades';
import { getLatestPeriod } from '../utils/timetable';
import { getQuarterType, isInSessionTerm } from '../utils/targetBit';
import { getSelectablePeriods } from '../config/universityConfig';
import { PROFILE_TEXT_MAX_LENGTH } from '../config/inputLimits';
import { MONTH_OPTIONS, formatYearMonth, getYearOptions, toYearMonthDraft, validateStudentPeriod } from '../utils/studentPeriod';
import type { YearMonthDraft } from '../utils/studentPeriod';

export const DashboardScreen: React.FC = () => {
    const { state, setScreen, updateProfile, updateSettings, removeCommittedClass, startNewSemester, user, logout } = useAppContext();
    const [activeTab, setActiveTab] = useState<'timetable' | 'grades' | 'profile'>('timetable');

    const handleRemoveClass = (courseId: string, classId: string) => {
        removeCommittedClass(courseId, classId);
    };

    const handleStartNewSemester = () => {
        const confirmed = window.confirm("現在の時間割と成績をリセットし、新学期の準備をしますか？（取得済みの単位は記録されます）");
        if (confirmed) {
            startNewSemester();
        }
    };

    // Quarter Toggle State
    const termQuarters = state.timetableConditions.term === 'first'
        ? [{ val: 'odd', label: 'Q1' }, { val: 'even', label: 'Q2' }]
        : [{ val: 'odd', label: 'Q3' }, { val: 'even', label: 'Q4' }];
    const [activeQuarter, setActiveQuarter] = useState<'odd' | 'even'>('odd');

    // Profile Edit State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editNickname, setEditNickname] = useState(state.userProfile.nickname);
    const [editDreamJob, setEditDreamJob] = useState(state.userProfile.dreamJob);
    const [editMaxPeriods, setEditMaxPeriods] = useState(state.timetableSettings.maxPeriods);
    const [editEnrollment, setEditEnrollment] = useState<YearMonthDraft>(toYearMonthDraft(state.userProfile.enrollmentYearMonth));
    const [editGraduation, setEditGraduation] = useState<YearMonthDraft>(toYearMonthDraft(state.userProfile.expectedGraduationYearMonth));
    const [showPeriodErrors, setShowPeriodErrors] = useState(false);
    const periodResult = validateStudentPeriod(editEnrollment, editGraduation);
    const currentYear = new Date().getFullYear();

    const handleStartEditProfile = () => {
        setEditNickname(state.userProfile.nickname);
        setEditDreamJob(state.userProfile.dreamJob);
        setEditMaxPeriods(state.timetableSettings.maxPeriods);
        setEditEnrollment(toYearMonthDraft(state.userProfile.enrollmentYearMonth));
        setEditGraduation(toYearMonthDraft(state.userProfile.expectedGraduationYearMonth));
        setShowPeriodErrors(false);
        setIsEditingProfile(true);
    };

    const handleSaveProfile = () => {
        // 年月が通らないときは、ほかの項目も含めて何も保存せずに編集を続ける
        if (!periodResult.ok) {
            setShowPeriodErrors(true);
            return;
        }
        updateProfile({
            nickname: editNickname,
            dreamJob: editDreamJob,
            enrollmentYearMonth: periodResult.enrollmentYearMonth,
            expectedGraduationYearMonth: periodResult.expectedGraduationYearMonth
        });
        updateSettings({ maxPeriods: editMaxPeriods });
        setIsEditingProfile(false);
    };

    const periodRows: { label: string; value: string; draft: YearMonthDraft; setDraft: (draft: YearMonthDraft) => void; error?: string }[] = [
        { label: '入学年月', value: state.userProfile.enrollmentYearMonth, draft: editEnrollment, setDraft: setEditEnrollment, error: periodResult.ok ? undefined : periodResult.enrollmentError },
        { label: '卒業予定年月', value: state.userProfile.expectedGraduationYearMonth, draft: editGraduation, setDraft: setEditGraduation, error: periodResult.ok ? undefined : periodResult.graduationError },
    ];

    const days = ['月', '火', '水', '木', '金', '土'].slice(0, state.timetableSettings.workingDays);
    const periods = Array.from({ length: state.timetableSettings.maxPeriods }, (_, i) => i + 1);
    // 確定した授業のいちばん遅い時限（表示の範囲の外にあれば知らせる）
    const latestCommittedPeriod = getLatestPeriod(state.committedClasses.map(c => c.schedule ?? []));

    const getCellClasses = (day: string, period: number) => {
        const slotStr = `${day}-${period}`;

        return state.committedClasses.filter(c => {
            const bit = c.targetBit ?? 0;
            if (!isInSessionTerm(bit, state.timetableConditions.term)) return false;

            const qType = getQuarterType(bit);
            // Match active quarter OR if it's "across" (通年/またぎ)
            if (qType !== 'across' && qType !== 'intensive' && qType !== activeQuarter) return false;
            if (qType === 'intensive') return false; // Intensives go below
            return (c.schedule ?? []).includes(slotStr);
        });
    };

    const getIntensiveClasses = () => {

        return state.committedClasses.filter(c => {
            const bit = c.targetBit ?? 0;
            if (!isInSessionTerm(bit, state.timetableConditions.term)) return false;

            return getQuarterType(bit) === 'intensive' || (c.schedule ?? []).includes('TBD') || !(c.schedule ?? []).some(s => s.includes('-'));
        });
    };

    // Manual GPA State
    const [calcGpaData, setCalcGpaData] = useState<{ gpa: string, details: Record<string, number>, totalCredits: number, earnedCredits: number } | null>(null);
    const [isGpaSimulatorOpen, setIsGpaSimulatorOpen] = useState(false);
    const [simulatedCreditCounts, setSimulatedCreditCounts] = useState<Record<string, number>>({});

    const handleOpenGpaSimulator = () => {
        const initialCounts: Record<string, number> = {};
        state.userProfile.gradingScale.forEach(s => initialCounts[s.label] = 0);

        Object.entries(state.grades).forEach(([courseId, gradeInfo]) => {
            const course = MOCK_COURSES.find(c => c.id_name === courseId);
            if (!course) return;
            const credits = course.credits;
            if (initialCounts[gradeInfo.grade] !== undefined) {
                initialCounts[gradeInfo.grade] += credits;
            }
        });

        setSimulatedCreditCounts(initialCounts);
        setIsGpaSimulatorOpen(true);
        setCalcGpaData(null);
    };

    const handleCalculateGpa = () => {
        let totalCredits = 0;
        let totalEarnedCredits = 0;
        let totalPoints = 0;
        const details: Record<string, number> = {};

        state.userProfile.gradingScale.forEach(s => {
            const count = simulatedCreditCounts[s.label] || 0;
            details[s.label] = count;
            totalCredits += count;
            totalPoints += count * s.point;
            if (isPassingGradePoint(s.point)) {
                totalEarnedCredits += count;
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
            <Header
                title="ダッシュボード"
                subtitle={`${state.userProfile.nickname} さん`}
                icon={CalendarIcon}
                action={{
                    label: "成績を入力して次学期へ",
                    onClick: () => setScreen(7),
                    icon: Flame
                }}
            />

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

                            {latestCommittedPeriod > state.timetableSettings.maxPeriods && (
                                <div className="mx-2 mt-2 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium">
                                    {latestCommittedPeriod}限の授業が表示の範囲（{state.timetableSettings.maxPeriods}限まで）の外にあります。プロフィールで最大時限を変えられます
                                </div>
                            )}

                            {/* Timetable Grid View (Forced Grid on all devices with horizontal scroll on mobile) */}
                            <div className="w-full overflow-x-auto overflow-y-auto custom-scrollbar p-2 max-h-[70vh]">
                                <table className="w-full border-collapse relative min-w-[500px]" style={{ fontSize: 'clamp(10px, 2vw, 14px)' }}>
                                    <thead>
                                        <tr>
                                            <th className="sticky top-0 z-10 w-12 border border-border bg-card p-1 text-muted text-xs font-medium">時限</th>
                                            {days.map(d => (
                                                <th key={d} className={`sticky top-0 z-10 border border-border p-1 text-xs font-bold ${d === '土' ? 'bg-blue-50 text-blue-800' : 'bg-accent/10 text-foreground backdrop-blur'}`}>{d}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {periods.map(p => (
                                            <tr key={p}>
                                                <td className="border border-border bg-card p-1 text-center text-muted font-medium text-xs">{p}限</td>
                                                {days.map(d => {
                                                    const cellClasses = getCellClasses(d, p);
                                                    return (
                                                        <td key={`${d}-${p}`} className="border border-border p-1 h-16 align-top">
                                                            {cellClasses.map((c, idx) => (
                                                                <div key={idx} className="relative group bg-blue-100 border border-blue-200 text-blue-800 text-xs p-2 rounded mb-1 shadow-sm">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveClass(c.courseId, c.classId);
                                                                        }}
                                                                        className="absolute top-1 right-1 p-0.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors cursor-pointer"
                                                                        title="この授業を削除"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                    <div className="font-bold pr-3">{c.courseId}</div>
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
                                <button onClick={handleOpenGpaSimulator} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow-sm transition-transform hover:scale-105 flex items-center text-sm font-semibold">
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
                                <p className="text-sm text-muted mb-4">現在の成績データから算出した各評価の単位数です。数値を変更してシミュレーションできます。</p>
                                <div className="space-y-3 mb-4">
                                    {state.userProfile.gradingScale.map((g) => (
                                        <div key={g.label} className="flex justify-between items-center bg-card p-3 rounded-lg border border-border">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground text-sm">{g.label}</span>
                                                <span className="text-xs text-muted">({g.point} pt)</span>
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    className="px-3 py-1.5 rounded-md border border-border focus:ring-1 focus:ring-accent outline-none bg-background text-sm font-semibold w-24 text-right"
                                                    value={simulatedCreditCounts[g.label]?.toString() || '0'}
                                                    onChange={(e) => setSimulatedCreditCounts(prev => ({ ...prev, [g.label]: Math.max(0, parseFloat(e.target.value) || 0) }))}
                                                />
                                                <span className="ml-2 text-sm text-muted">単位</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center mb-6 px-2">
                                    <span className="font-bold text-muted">合計:</span>
                                    <span className="font-black text-accent text-lg">
                                        {Object.values(simulatedCreditCounts).reduce((a, b) => a + b, 0)} <span className="text-sm text-muted font-bold">単位</span>
                                    </span>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button onClick={() => setIsGpaSimulatorOpen(false)} className="btn-ghost text-sm py-2">キャンセル</button>
                                    <button
                                        onClick={handleCalculateGpa}
                                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow-sm transition-transform hover:scale-105 flex items-center text-sm font-semibold"
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

                        {/* Start New Semester Section */}
                        <div className="mt-8 pt-6 border-t-2 border-red-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-red-50/50 p-5 rounded-2xl border border-red-200">
                            <div>
                                <h4 className="font-bold text-red-900 text-base flex items-center">
                                    <RefreshCcw className="w-5 h-5 mr-2 text-red-600" />
                                    学期の切り替え・新学期へ進む
                                </h4>
                                <p className="text-xs text-red-700 mt-1 font-medium">
                                    今学期の成績記録を完了し、修得単位を保存した上で新学期の時間割作成へ進みます。
                                </p>
                            </div>
                            <button
                                onClick={handleStartNewSemester}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-3 rounded-xl shadow-md transition-transform hover:scale-105 shrink-0 flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                この学期を終了して新学期へ進む
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in max-w-2xl relative">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="font-bold text-gray-800 flex items-center">
                                    <User className="w-5 h-5 mr-2 text-indigo-500" />
                                    プロフィール情報
                                </h2>
                                {!isEditingProfile ? (
                                    <button
                                        onClick={handleStartEditProfile}
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
                                                maxLength={PROFILE_TEXT_MAX_LENGTH}
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
                                                maxLength={PROFILE_TEXT_MAX_LENGTH}
                                                onChange={(e) => setEditDreamJob(e.target.value)}
                                            />
                                        ) : (
                                            <span className="font-medium text-gray-800">{state.userProfile.dreamJob || '未設定'}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 border-b border-gray-100 pb-3 items-center">
                                    <div className="text-gray-500 text-sm">最大時限</div>
                                    <div className="col-span-2">
                                        {isEditingProfile ? (
                                            <select
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                value={editMaxPeriods}
                                                onChange={(e) => setEditMaxPeriods(Number(e.target.value))}
                                            >
                                                {getSelectablePeriods().map(p => (
                                                    <option key={p} value={p}>{p}限まで</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="font-medium text-gray-800">{state.timetableSettings.maxPeriods}限まで</span>
                                        )}
                                    </div>
                                </div>
                                {periodRows.map(({ label, value, draft, setDraft, error }) => (
                                    <div key={label} className="grid grid-cols-3 border-b border-gray-100 pb-3 items-center">
                                        <div className="text-gray-500 text-sm">{label}</div>
                                        <div className="col-span-2">
                                            {isEditingProfile ? (
                                                <>
                                                    <div className="flex gap-2">
                                                        <select
                                                            aria-label={`${label}の年`}
                                                            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                            value={draft.year}
                                                            onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                                                        >
                                                            <option value="">年</option>
                                                            {getYearOptions(currentYear, draft.year).map(y => (
                                                                <option key={y} value={y}>{y}年</option>
                                                            ))}
                                                        </select>
                                                        <select
                                                            aria-label={`${label}の月`}
                                                            className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                                            value={draft.month}
                                                            onChange={(e) => setDraft({ ...draft, month: e.target.value })}
                                                        >
                                                            <option value="">月</option>
                                                            {MONTH_OPTIONS.map(m => (
                                                                <option key={m} value={m}>{m}月</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {showPeriodErrors && error && (
                                                        <p className="mt-1 text-xs text-red-600">{error}</p>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="font-medium text-gray-800">{formatYearMonth(value)}</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
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
                                <div className="grid grid-cols-3 border-b border-gray-100 pb-3 items-center">
                                    <div className="text-gray-500 text-sm">連携アカウント</div>
                                    <div className="col-span-2 font-medium text-gray-800 flex items-center justify-between">
                                        <span className="truncate">{user?.email || 'Googleログイン済み'}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (logout) {
                                                    logout();
                                                }
                                            }}
                                            className="text-xs text-red-600 hover:text-red-800 font-bold border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                                        >
                                            ログアウト
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* これまで取得した単位一覧 */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-in fade-in max-w-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 text-base flex items-center">
                                    <Award className="w-5 h-5 mr-2 text-emerald-600" />
                                    これまで取得した単位一覧
                                </h3>
                                <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                                    {state.earnedCredits?.length || 0} 科目修得済み
                                </span>
                            </div>

                            {(!state.earnedCredits || state.earnedCredits.length === 0) ? (
                                <p className="text-sm text-gray-400 py-4 text-center">まだ過去の修得単位記録はありません。</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto custom-scrollbar">
                                    {state.earnedCredits.map((item, idx) => (
                                        <div key={idx} className="bg-emerald-50/70 border border-emerald-200 p-2.5 rounded-lg flex items-center justify-between text-xs">
                                            <span className="font-bold text-emerald-950 truncate" title={item.courseName}>
                                                {item.courseName}
                                            </span>
                                            <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold shrink-0 ml-2">
                                                修得済
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

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
