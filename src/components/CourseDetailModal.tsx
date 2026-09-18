import React from 'react';
import type { CourseData } from '../logic/types';
import { useAppContext } from '../logic/AppContext';
import { X, BookOpen, Star, MessageSquare, BarChart2, CheckCircle2, PlusCircle, AlertCircle, Clock } from 'lucide-react';

export interface CourseDetailModalProps {
    course: CourseData | null;
    isOpen: boolean;
    color: string;
    onClose: () => void;
    onSelect: (course: CourseData) => void;
    isSelected?: boolean;
}

// 12-bit evaluation code parser helper
export function parseReviewBit(rb: number) {
    return {
        difficulty: (rb >> 0) & 7,
        workload: (rb >> 3) & 7,
        test: (rb >> 6) & 7,
        attendance: (rb >> 9) & 7,
    };
}

// Helper function to return Tailwind background color class based on score (1-5) for Heatmap design
export function getScoreColor(score: number): string {
    if (score <= 2) return 'bg-emerald-400';
    if (score === 3) return 'bg-amber-400';
    return 'bg-red-500';
}

// Helper function to return text color for score badges
export function getScoreTextColor(score: number): string {
    if (score <= 2) return 'text-emerald-700';
    if (score === 3) return 'text-amber-700';
    return 'text-red-700';
}

// Helper function to return badge styling
export function getScoreBadgeStyle(score: number): string {
    if (score <= 2) return 'bg-emerald-50 border-emerald-200 text-emerald-700';
    if (score === 3) return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-red-50 border-red-200 text-red-700';
}

// Helper for score descriptions
const getScoreLabel = (type: 'difficulty' | 'workload' | 'test' | 'attendance', value: number): string => {
    if (value === 0) return 'データなし';
    switch (type) {
        case 'difficulty':
            if (value <= 2) return '比較的分かりやすい';
            if (value === 3) return '標準的';
            return 'やや難解';
        case 'workload':
            if (value <= 2) return '少なめ・負担軽';
            if (value === 3) return '適度';
            return '課題量多め';
        case 'test':
            if (value <= 2) return '定期テスト楽';
            if (value === 3) return '標準';
            return 'テスト重要・要対策';
        case 'attendance':
            if (value <= 2) return '点呼少なめ';
            if (value === 3) return '時々確認';
            return '毎回の出席重視';
    }
};

export const CourseDetailModal: React.FC<CourseDetailModalProps> = ({
    course,
    isOpen,
    color,
    onClose,
    onSelect,
    isSelected = false,
}) => {
    const { state, pinClass } = useAppContext();

    if (!isOpen || !course) return null;

    const reviewBitData = course.reviews_bit !== undefined && course.reviews_bit > 0
        ? parseReviewBit(course.reviews_bit)
        : null;

    const metrics = reviewBitData
        ? [
            { label: '難易度', value: reviewBitData.difficulty, key: 'difficulty' as const },
            { label: '課題量', value: reviewBitData.workload, key: 'workload' as const },
            { label: 'テスト負担', value: reviewBitData.test, key: 'test' as const },
            { label: '出席重視度', value: reviewBitData.attendance, key: 'attendance' as const },
        ]
        : [];

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-200 animate-in fade-in"
            onClick={onClose}
        >
            <div
                className="bg-card rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-border animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header: Inherits subject specific color */}
                <div className={`p-5 border-b flex justify-between items-center transition-colors ${color}`}>
                    <div className="flex items-center space-x-3 pr-4">
                        <div className="p-2 bg-white/60 backdrop-blur-md rounded-xl shadow-sm">
                            <BookOpen className="w-6 h-6 text-current" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold tracking-wider uppercase opacity-80 block">
                                科目詳細 & 口コミ
                            </span>
                            <h3 className="font-bold text-xl text-current leading-tight">
                                {course.id_name}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-current opacity-70 hover:opacity-100 cursor-pointer"
                        title="閉じる"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Modal Content Scroll Area */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 text-foreground">
                    {/* Badge & Quick Stats Header */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-3 py-1 bg-accent/10 text-accent border border-accent/20 rounded-full font-bold">
                            {course.credits} 単位
                        </span>
                        <span className="px-3 py-1 bg-secondary/10 text-foreground border border-border rounded-full font-medium">
                            {course.classes.length} 開講クラス
                        </span>
                        {isSelected && (
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold flex items-center">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 選択中
                            </span>
                        )}
                    </div>

                    {/* Section 1: Syllabus Outline */}
                    <div className="bg-background/60 rounded-xl p-4 border border-border">
                        <h4 className="text-sm font-bold text-foreground mb-2 flex items-center">
                            <BookOpen className="w-4 h-4 mr-1.5 text-accent" />
                            シラバス概要
                        </h4>
                        <p className="text-xs text-muted leading-relaxed whitespace-pre-line">
                            {course.outline || '概要情報はありません。'}
                        </p>
                    </div>

                    {/* Section 2: Senior Bit Reviews (Heatmap Visual Metrics) */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-sm font-bold text-foreground flex items-center">
                                <BarChart2 className="w-4 h-4 mr-1.5 text-accent" />
                                先輩のリアル評価 (5段階ヒートマップ)
                            </h4>
                            {/* Heatmap Legend */}
                            <div className="flex items-center space-x-2 text-[10px] font-medium text-muted">
                                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-400 mr-1" />楽(1-2)</span>
                                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-400 mr-1" />普通(3)</span>
                                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 mr-1" />大変(4-5)</span>
                            </div>
                        </div>

                        {reviewBitData ? (
                            <div className="grid grid-cols-2 gap-3">
                                {metrics.map((m) => {
                                    const scoreColor = getScoreColor(m.value);
                                    const textColor = getScoreTextColor(m.value);
                                    const badgeStyle = getScoreBadgeStyle(m.value);

                                    return (
                                        <div
                                            key={m.key}
                                            className="bg-card border border-border rounded-xl p-3 shadow-sm hover:border-accent/30 transition-colors"
                                        >
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-xs font-semibold text-muted">{m.label}</span>
                                                <span className={`text-xs font-bold ${textColor}`}>
                                                    {m.value} <span className="text-[10px] text-muted font-normal">/ 5</span>
                                                </span>
                                            </div>
                                            {/* Visual Score Bars with Heatmap Colors */}
                                            <div className="flex space-x-1.5 mb-2">
                                                {[1, 2, 3, 4, 5].map((level) => (
                                                    <div
                                                        key={level}
                                                        className={`h-2 flex-1 rounded-full transition-all ${
                                                            level <= m.value
                                                                ? scoreColor
                                                                : 'bg-slate-200'
                                                        }`}
                                                    />
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                                                    {m.value <= 2 ? '安全' : m.value === 3 ? '注意' : '高負荷'}
                                                </span>
                                                <span className="text-[11px] text-muted font-medium">
                                                    {getScoreLabel(m.key, m.value)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-muted/10 border border-border rounded-xl p-4 text-center text-xs text-muted flex items-center justify-center space-x-2">
                                <AlertCircle className="w-4 h-4 text-muted/70" />
                                <span>この科目の数値評価データは現在集計中です。</span>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Senior Text Comment / Review */}
                    <div>
                        <h4 className="text-sm font-bold text-foreground mb-3 flex items-center">
                            <MessageSquare className="w-4 h-4 mr-1.5 text-accent" />
                            先輩の口コミ・受講アドバイス
                        </h4>
                        {course.comment ? (
                            <div className="relative bg-accent/5 border border-accent/20 rounded-xl p-4">
                                <div className="flex items-start space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                                        <Star className="w-4 h-4 text-accent fill-accent" />
                                    </div>
                                    <div className="flex-1 text-xs text-foreground leading-relaxed">
                                        <span className="font-bold block text-accent text-[11px] mb-1">
                                            受講生からのコメント
                                        </span>
                                        <p className="italic">"{course.comment}"</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-muted/10 border border-border rounded-xl p-4 text-center text-xs text-muted">
                                先輩からのテキスト口コミはまだ投稿されていません。
                            </div>
                        )}
                    </div>

                    {/* Section 4: Grading Breakdown */}
                    {course.grading && (
                        <div className="bg-background/60 rounded-xl p-4 border border-border">
                            <h4 className="text-sm font-bold text-foreground mb-2">成績評価の割合</h4>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                <div className="p-2 bg-card rounded-lg border border-border">
                                    <span className="text-muted block text-[10px]">定期試験</span>
                                    <span className="font-bold text-foreground text-sm">{course.grading.exam}%</span>
                                </div>
                                <div className="p-2 bg-card rounded-lg border border-border">
                                    <span className="text-muted block text-[10px]">レポート</span>
                                    <span className="font-bold text-foreground text-sm">{course.grading.report}%</span>
                                </div>
                                <div className="p-2 bg-card rounded-lg border border-border">
                                    <span className="text-muted block text-[10px]">その他・平常点</span>
                                    <span className="font-bold text-foreground text-sm">{course.grading.others}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 5: Class Pinning Option */}
                    <div>
                        <h4 className="text-sm font-bold text-foreground mb-1 flex items-center">
                            <Clock className="w-4 h-4 mr-1.5 text-accent" />
                            受講クラス希望（オプション）
                        </h4>
                        <p className="text-[11px] text-muted mb-2">
                            特定のクラスの曜日・時限を固定したい場合に指定してください。
                        </p>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                            <label className={`flex items-center p-2.5 rounded-lg border cursor-pointer transition-colors ${!state.pinnedClasses[course.id_name] ? 'bg-accent/10 border-accent text-accent font-medium' : 'bg-card border-border hover:bg-muted/10'}`}>
                                <input
                                    type="radio"
                                    name={`classSelection-${course.id_name}`}
                                    checked={!state.pinnedClasses[course.id_name]}
                                    onChange={() => pinClass(course.id_name, null)}
                                    className="w-3.5 h-3.5 text-accent focus:ring-accent"
                                />
                                <span className="ml-2">おまかせ (AI自動割り当て)</span>
                            </label>

                            {course.classes.map(cls => (
                                <label
                                    key={cls.class_id}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${state.pinnedClasses[course.id_name] === cls.class_id ? 'bg-accent/10 border-accent text-accent font-medium' : 'bg-card border-border hover:bg-muted/10'}`}
                                >
                                    <div className="flex items-center">
                                        <input
                                            type="radio"
                                            name={`classSelection-${course.id_name}`}
                                            checked={state.pinnedClasses[course.id_name] === cls.class_id}
                                            onChange={() => pinClass(course.id_name, cls.class_id)}
                                            className="w-3.5 h-3.5 text-accent focus:ring-accent"
                                        />
                                        <span className="ml-2 font-bold">{cls.class_id}</span>
                                    </div>
                                    <span className="text-[11px] text-muted">{cls.schedule.join(', ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-muted/10 border-t border-border flex items-center justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-muted hover:text-foreground rounded-lg border border-border hover:bg-card transition-colors cursor-pointer"
                    >
                        閉じる
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onSelect(course);
                        }}
                        className={`px-5 py-2 text-xs font-bold rounded-lg shadow-sm flex items-center transition-all cursor-pointer ${
                            isSelected
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'btn-primary'
                        }`}
                    >
                        {isSelected ? (
                            <>
                                <X className="w-4 h-4 mr-1.5" /> 選択を解除する
                            </>
                        ) : (
                            <>
                                <PlusCircle className="w-4 h-4 mr-1.5" /> この教科を選択する
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
