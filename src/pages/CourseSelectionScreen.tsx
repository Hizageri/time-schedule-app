import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { MOCK_COURSES } from '../data';
import type { CourseData } from '../types';
import { filterByBit, isRetakeCandidate } from '../utils/courseFilter';
import { isCoursePassed, isCourseFailed } from '../utils/grades';
import { getTargetGrades, getPeriodLabel } from '../utils/targetBit';
import { BookOpen, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { getSubjectColor } from '../utils/subjectColor';
import { CourseDetailModal } from '../components/CourseDetailModal';
import { MAX_SELECTED_COURSES } from '../config/inputLimits';

export const CourseSelectionScreen: React.FC = () => {
    const { state, setScreen, toggleSelectedCourse } = useAppContext();
    const [selectedCourseForModal, setSelectedCourseForModal] = useState<CourseData | null>(null);

    // 今の学年の科目（currentCourses）と、下の学年でまだ合格していない科目（earlierCourses）に分けて出す
    const { currentCourses, earlierCourses } = useMemo(() => {
        const baseFiltered = filterByBit(MOCK_COURSES, {
            selectedGrade: state.timetableConditions.targetGrade,
            term: state.timetableConditions.term,
            isReRegistrationOnly: state.timetableConditions.hasRetake,
            userGrades: state.grades,
            earnedCredits: state.earnedCredits,
            gradingScale: state.userProfile.gradingScale
        });

        // 再履修・未履修の自動抽出
        const targetTermBit = state.timetableConditions.term === 'second' ? 1 : state.timetableConditions.term === 'full' ? 2 : 0;

        const reRegistrationCourses = MOCK_COURSES.filter(c => {
            // 既に基本フィルターに含まれているならスキップ
            if (baseFiltered.some(bc => bc.id_name === c.id_name)) return false;

            // 共通ユーティリティで判定
            const isCandidate = isRetakeCandidate(
                c,
                state.grades,
                state.earnedCredits,
                state.userProfile.gradingScale,
                state.timetableConditions.targetGrade
            );
            if (!isCandidate) return false;

            // 学期（前期／後期など）が一致しているか判定
            const checkTermMatch = (b: number | undefined) => {
                if (b === undefined) return false;
                const courseTerm = (b >> 8) & 3;
                return (courseTerm === targetTermBit) || (courseTerm === 2);
            };

            return checkTermMatch(c.target_bit) || c.classes.some(cls => checkTermMatch(cls.target_bit));
        });

        // 既に合格済みのものは filterByBit や isRetakeCandidate 側で除外済み
        return { currentCourses: baseFiltered, earlierCourses: reRegistrationCourses };
    }, [state.timetableConditions, state.grades, state.earnedCredits, state.userProfile.gradingScale]);

    const userYear = state.timetableConditions.targetGrade;
    const termLabel = state.timetableConditions.term === 'second' ? '後期' : state.timetableConditions.term === 'full' ? '通年' : '前期';
    const earlierYearsLabel = userYear - 1 <= 1 ? '1年' : `1〜${userYear - 1}年`;

    const renderCourseCard = (course: CourseData) => {
        const displayBit = course.target_bit ?? course.classes[0]?.target_bit ?? 0;
        const isSelected = state.selectedCourses.some(c => c.id_name === course.id_name);

        const gradesArr = getTargetGrades(displayBit);
        // 再履修：成績が不合格（ポイント 0）の科目。未履修：対象学年がすべて今の学年より下で、まだ合格していない科目
        const failed = isCourseFailed(course.id_name, state.grades, state.userProfile.gradingScale);
        const lowerYearOnly = gradesArr.length > 0 && Math.max(...gradesArr) < userYear;

        const periodLabel = getPeriodLabel(displayBit);
        const colorClass = getSubjectColor(course.id_name);
        return (
            <div key={course.id_name}
                className={`rounded-xl shadow-sm border transition-all cursor-pointer ${colorClass} ${isSelected ? 'ring-2 ring-accent border-transparent scale-[1.02]' : 'hover:shadow-md hover:opacity-90'}`}
                onClick={() => setSelectedCourseForModal(course)}
            >
                <div className="p-5 flex justify-between items-start">
                    <div className="flex items-start">
                        <input
                            type="checkbox"
                            className="w-5 h-5 mt-1 text-accent rounded border-border focus:ring-accent cursor-pointer"
                            checked={isSelected}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleToggleCourse(course);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="ml-3">
                            {failed ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 mb-1">
                                    再履修
                                </span>
                            ) : lowerYearOnly && (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 mb-1">
                                    未履修（{gradesArr.join(',')}年の科目）
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
                        className="flex items-center text-accent hover:text-accent/80 font-medium text-xs cursor-pointer"
                    >
                        <Info className="w-4 h-4 mr-1" /> 詳細・口コミを見る
                    </button>
                </div>
            </div>
        );
    };

    // まだ選んでいない科目を選ぼうとして、すでに上限まで選んでいるときは、選ばずに知らせる（カードのチェックと詳細モーダルで共通）
    const handleToggleCourse = (course: CourseData) => {
        const isSelected = state.selectedCourses.some(c => c.id_name === course.id_name);
        if (!isSelected && state.selectedCourses.length >= MAX_SELECTED_COURSES) {
            alert(`一度に選べるのは ${MAX_SELECTED_COURSES} 科目までです`);
            return;
        }
        toggleSelectedCourse(course);
    };

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
                        科目カードをクリックするとシラバス詳細や先輩の口コミを確認できます。
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right mr-4 text-sm">
                        <span className="text-muted">選択単位数: </span>
                        <span className="font-bold text-accent text-lg">
                            {state.selectedCourses.reduce((sum, c) => {
                                const isPassed = isCoursePassed(c.id_name, state.grades, state.earnedCredits, state.userProfile.gradingScale);
                                return sum + (isPassed ? 0 : c.credits);
                            }, 0)}
                        </span> <span className="text-muted">単位 (今期新規)</span>
                    </div>

                    <button
                        onClick={handleProceed}
                        className="btn-primary flex items-center group cursor-pointer"
                    >
                        コマどり先輩に相談する
                        <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-6xl w-full mx-auto p-6">
                <div className="animate-in fade-in">
                    {/* 見落とされやすいので、下の学年でまだ合格していない科目を先に出す */}
                    {earlierCourses.length > 0 && (
                        <section className="mb-10">
                            <h2 className="text-lg font-bold text-foreground">下の学年でまだ合格していない科目</h2>
                            <p className="text-sm text-muted mt-1 mb-4">
                                {earlierYearsLabel}が対象の{termLabel}・通年の科目のうち、まだ合格していないものです。今の学期の時間割に入れられます。
                            </p>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {earlierCourses.map(renderCourseCard)}
                            </div>
                        </section>
                    )}

                    {earlierCourses.length > 0 && currentCourses.length > 0 && (
                        <h2 className="text-lg font-bold text-foreground mb-4">{userYear}年{termLabel}の科目</h2>
                    )}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {currentCourses.map(renderCourseCard)}

                        {currentCourses.length === 0 && earlierCourses.length === 0 && (
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

            {/* Course Detail Modal Component */}
            <CourseDetailModal
                course={selectedCourseForModal}
                isOpen={!!selectedCourseForModal}
                color={selectedCourseForModal ? getSubjectColor(selectedCourseForModal.id_name) : ''}
                onClose={() => setSelectedCourseForModal(null)}
                onSelect={handleToggleCourse}
                isSelected={selectedCourseForModal ? state.selectedCourses.some(c => c.id_name === selectedCourseForModal.id_name) : false}
            />
        </div>
    );
};

