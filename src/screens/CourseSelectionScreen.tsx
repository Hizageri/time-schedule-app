import React, { useState, useMemo } from 'react';
import { useAppContext } from '../AppContext';
import { MOCK_COURSES } from '../data';
import { calculateStudentBit, canTakeClass } from '../types';
import type { CourseData } from '../types';
import { BookOpen, ChevronLeft, ChevronRight, X, Info } from 'lucide-react';

export const CourseSelectionScreen: React.FC = () => {
    const { state, setScreen, toggleSelectedCourse } = useAppContext();
    const [selectedCourseForModal, setSelectedCourseForModal] = useState<CourseData | null>(null);

    const studentBit = useMemo(() => {
        return calculateStudentBit(
            state.timetableConditions.targetGrade,
            state.timetableConditions.term,
            state.timetableConditions.hasRetake
        );
    }, [state.timetableConditions]);

    const availableCourses = useMemo(() => {
        // In V3, target_bit is at the root of CourseData
        const validCourses = MOCK_COURSES.filter(course => canTakeClass(course.target_bit, studentBit));

        // Sort by proximity to target grade
        const targetG = state.timetableConditions.targetGrade;
        const getMinGrade = (bit: number) => {
            for (let i = 0; i < 6; i++) {
                if ((bit & (1 << i)) > 0) return i + 1;
            }
            return 1;
        };

        return validCourses.sort((a, b) => {
            const minA = getMinGrade(a.target_bit);
            const minB = getMinGrade(b.target_bit);
            const distA = Math.abs(minA - targetG);
            const distB = Math.abs(minB - targetG);
            return distA - distB;
        });
    }, [studentBit]);

    const handleProceed = () => {
        if (state.selectedCourses.length === 0) {
            alert('気になった科目を1つ以上選択してください');
            return;
        }
        setScreen(4); // Go to AI Senpai
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-6 py-4 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center">
                        <BookOpen className="w-6 h-6 mr-2 text-indigo-600" />
                        受講可能科目リスト
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        興味のある科目をチェックして下さい。クラス調整は後で行います。
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right mr-4 text-sm">
                        <span className="text-gray-500">選択中: </span>
                        <span className="font-bold text-indigo-600 text-lg">{state.selectedCourses.length}</span> <span className="text-gray-500">科目</span>
                    </div>

                    <button
                        onClick={handleProceed}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-lg shadow-sm transition-all flex items-center group cursor-pointer"
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
                            const isSelected = state.selectedCourses.some(c => c.id_name === course.id_name);
                            return (
                                <div key={course.id_name}
                                    className={`rounded-xl shadow-sm border transition-all cursor-pointer ${isSelected ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400' : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md'}`}
                                    onClick={() => toggleSelectedCourse(course)}
                                >
                                    <div className="p-5 flex justify-between items-start">
                                        <div className="flex items-start">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 mt-1 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 pointer-events-none"
                                                checked={isSelected}
                                                readOnly
                                            />
                                            <div className="ml-3">
                                                <h3 className="font-bold text-lg text-gray-800 leading-tight mb-1">{course.id_name}</h3>
                                                <div className="text-xs text-gray-500">
                                                    {course.classes.length}種類のクラスが開講
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white/50 border-t border-gray-100 p-3 flex justify-between items-center text-sm">
                                        <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-600 font-medium text-xs">{course.credits} 単位</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedCourseForModal(course); }}
                                            className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                                        >
                                            <Info className="w-4 h-4 mr-1" /> 詳細を見る
                                        </button>
                                    </div>
                                </div>
                            )
                        })}

                        {availableCourses.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-500">
                                <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>条件に一致する科目がありません。</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8">
                        <button
                            onClick={() => setScreen(2)}
                            className="px-6 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-white transition-colors flex items-center bg-transparent"
                        >
                            <ChevronLeft className="w-5 h-5 mr-1" />
                            条件設定に戻る
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
                                <div>
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
