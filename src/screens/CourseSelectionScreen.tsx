import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { MOCK_COURSES } from '../data';
import type { CourseData } from '../types';
import { filterByBit, getTargetGrades, getPeriodLabel, isRetakeCourse } from '../timetableGenerator';
import { BookOpen, ChevronLeft, ChevronRight, X, Info } from 'lucide-react';

export const CourseSelectionScreen: React.FC = () => {
    const { state, setScreen, toggleSelectedCourse, pinClass } = useAppContext();
    const [selectedCourseForModal, setSelectedCourseForModal] = useState<CourseData | null>(null);

    const availableCourses = useMemo(() => {
        const baseFiltered = filterByBit(MOCK_COURSES, {
            selectedGrade: state.timetableConditions.targetGrade,
            term: state.timetableConditions.term,
            isReRegistrationOnly: state.timetableConditions.hasRetake
        });

        // 単位を落とした（ポイントが0の）科目を対象学年が違っても追加する
        const targetTermBit = state.timetableConditions.term === 'second' ? 1 : state.timetableConditions.term === 'full' ? 2 : 0;

        const failedCourses = MOCK_COURSES.filter(c => {
            // 既に基本フィルターに含まれているならスキップ
            if (baseFiltered.some(bc => bc.id_name === c.id_name)) return false;

            // 成績情報を取得
            const gradeInfo = state.grades[c.id_name];
            if (!gradeInfo) return false;

            // ポイントが0か判定
            const scale = state.userProfile.gradingScale.find(s => s.label === gradeInfo.grade);
            if (!scale || scale.point !== 0) return false;

            // 学期（前期／後期など）が一致しているか判定
            const checkTermMatch = (bit: number | undefined) => {
                if (bit === undefined) return false;
                const courseTerm = (bit >> 8) & 3;
                return (courseTerm === targetTermBit) || (courseTerm === 2);
            };

            return checkTermMatch(c.target_bit) || c.classes.some(cls => checkTermMatch(cls.target_bit));
        });

        return [...baseFiltered, ...failedCourses];
    }, [state.timetableConditions, state.grades, state.userProfile.gradingScale]);

    const handleProceed = () => {
        if (state.selectedCourses.length === 0) {
            alert('気になった科目を1つ以上選択してください');
            return;
        }
        setScreen(4); // Go to AI Senpai
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="bg-card border-b border-border sticky top-0 z-20 px-6 py-4 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-foreground flex items-center">
                        <BookOpen className="w-6 h-6 mr-2 text-accent" />
                        受講可能科目リスト
                    </h1>
                    <p className="text-sm text-muted mt-1">
                        興味のある科目をチェックして下さい。クラス調整は後で行います。
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right mr-4 text-sm">
                        <span className="text-muted">選択中: </span>
                        <span className="font-bold text-accent text-lg">{state.selectedCourses.length}</span> <span className="text-muted">科目</span>
                    </div>

                    <button
                        onClick={handleProceed}
                        className="btn-primary flex items-center group cursor-pointer"
                    >
                        AI先輩に相談する
                        <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto p-6">
                <div className="animate-in fade-in">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {availableCourses.map(course => {
                            const displayBit = course.target_bit ?? course.classes[0]?.target_bit ?? 0;
                            const isSelected = state.selectedCourses.some(c => c.id_name === course.id_name);
                            const retake = isRetakeCourse(displayBit);
                            const gradesArr = getTargetGrades(displayBit);
                            const periodLabel = getPeriodLabel(displayBit);
                            return (
                                <div key={course.id_name}
                                    className={`rounded-xl shadow-sm border transition-all cursor-pointer ${isSelected ? 'bg-accent/10 border-accent ring-1 ring-accent/50' : 'bg-card border-border hover:border-accent/50 hover:shadow-md'}`}
                                    onClick={() => toggleSelectedCourse(course)}
                                >
                                    <div className="p-5 flex justify-between items-start">
                                        <div className="flex items-start">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 mt-1 text-accent rounded border-border focus:ring-accent pointer-events-none"
                                                checked={isSelected}
                                                readOnly
                                            />
                                            <div className="ml-3">
                                                {retake && (
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 mb-1">
                                                        再履修対象
                                                    </span>
                                                )}
                                                <h3 className="font-bold text-lg text-foreground leading-tight mb-1">{course.id_name}</h3>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                                        対象: {gradesArr.length === 6 ? '全学年' : `${gradesArr.join(',')}年`}
                                                    </span>
                                                    <span className="bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                                        {periodLabel}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted mt-2">
                                                    {course.classes.length}種類のクラスが開講
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-card/50 border-t border-border p-3 flex justify-between items-center text-sm">
                                        <span className="bg-background px-2 py-1 rounded-md text-muted font-medium text-xs">{course.credits} 単位</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedCourseForModal(course); }}
                                            className="flex items-center text-accent hover:text-accent/80 font-medium text-xs"
                                        >
                                            <Info className="w-4 h-4 mr-1" /> 詳細を見る
                                        </button>
                                    </div>
                                </div>
                            )
                        })}

                        {availableCourses.length === 0 && (
                            <div className="col-span-full text-center py-20 text-muted">
                                <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted/50" />
                                <p>条件に一致する科目がありません。</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={() => setScreen(2)}
                            className="btn-ghost flex items-center"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            戻る
                        </button>
                    </div>
                </div>
            </main>

            {/* Course Detail Modal */}
            {selectedCourseForModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h3 className="font-bold text-lg text-gray-800">{selectedCourseForModal.id_name}</h3>
                            <button
                                onClick={() => setSelectedCourseForModal(null)}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-6">
                                <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">概要</h4>
                                <p className="text-gray-600 text-sm leading-relaxed">{selectedCourseForModal.outline}</p>
                            </div>

                            {selectedCourseForModal.grading && (
                                <div className="mb-6">
                                    <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">成績評価の割合</h4>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">試験 (Exam)</span>
                                            <span className="font-semibold text-gray-800">{selectedCourseForModal.grading.exam}%</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">レポート (Report)</span>
                                            <span className="font-semibold text-gray-800">{selectedCourseForModal.grading.report}%</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">その他 (Others)</span>
                                            <span className="font-semibold text-gray-800">{selectedCourseForModal.grading.others}%</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">受講クラス制限</h4>
                                <p className="text-xs text-gray-500 mb-3">AIによる自動割り当てではなく、特定のクラスを指定したい場合は選択してください。</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${!state.pinnedClasses[selectedCourseForModal.id_name] ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="classSelection"
                                            checked={!state.pinnedClasses[selectedCourseForModal.id_name]}
                                            onChange={() => pinClass(selectedCourseForModal.id_name, null)}
                                            className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                        />
                                        <div className="ml-3 flex-1">
                                            <span className="block text-sm font-medium text-gray-900">おまかせ (AI自動割り当て)</span>
                                        </div>
                                    </label>

                                    {selectedCourseForModal.classes.map(cls => (
                                        <label key={cls.class_id} className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${state.pinnedClasses[selectedCourseForModal.id_name] === cls.class_id ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                                            <input
                                                type="radio"
                                                name="classSelection"
                                                checked={state.pinnedClasses[selectedCourseForModal.id_name] === cls.class_id}
                                                onChange={() => pinClass(selectedCourseForModal.id_name, cls.class_id)}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                            />
                                            <div className="ml-3 flex-1">
                                                <span className="block text-sm font-medium text-gray-900">{cls.class_id}</span>
                                                <span className="block text-xs text-gray-500 mt-1">{cls.schedule.join(', ')}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
