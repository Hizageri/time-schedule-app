import React from 'react';
import { getSubjectColor } from '../logic/utils';
import { EyeOff } from 'lucide-react';

export interface MobileTimetableListProps {
    days: string[];
    periods: number[];
    getCellClasses: (day: string, period: number) => { courseId: string; classId: string; [key: string]: any }[];
    onClassClick?: (classInfo: { courseId: string; classId: string }) => void;
    onHideClass?: (courseId: string) => void;
}

export const MobileTimetableList: React.FC<MobileTimetableListProps> = ({
    days,
    periods,
    getCellClasses,
    onClassClick,
    onHideClass
}) => {
    // 曜日ごとにデータをグループ化
    const daySchedules = days.map(day => {
        const slots: { period: number; classes: { courseId: string; classId: string }[] }[] = [];

        periods.forEach(period => {
            const classes = getCellClasses(day, period);
            if (classes && classes.length > 0) {
                slots.push({ period, classes });
            }
        });

        return {
            day,
            slots,
            isOffDay: slots.length === 0
        };
    });

    return (
        <div className="block md:hidden space-y-3 p-1">
            {daySchedules.map(({ day, slots, isOffDay }) => (
                <div key={day} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                    {/* Header: Day & Status */}
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                        <div className="flex items-center space-x-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${isOffDay ? 'bg-emerald-500' : 'bg-accent'}`} />
                            <h3 className="font-bold text-base text-foreground">
                                {day}曜日
                            </h3>
                        </div>
                        {isOffDay ? (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                授業なし（全休）
                            </span>
                        ) : (
                            <span className="text-xs text-muted font-medium bg-muted/20 px-2 py-0.5 rounded-full">
                                {slots.length} コマ開講
                            </span>
                        )}
                    </div>

                    {/* Content: List of classes or Off-day badge */}
                    {isOffDay ? (
                        <div className="py-3 text-center text-xs text-muted bg-muted/10 rounded-lg border border-dashed border-border/60">
                            🎉 授業はありません (全休)
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {slots.map(({ period, classes }) => (
                                <div key={period} className="flex items-center space-x-3 p-2.5 rounded-lg bg-background border border-border">
                                    {/* Period Tag */}
                                    <div className="px-2.5 py-1.5 bg-accent/10 text-accent font-bold text-xs rounded-md shrink-0">
                                        {period}限
                                    </div>
                                    {/* Course Cards */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        {classes.map((c, idx) => {
                                            const colorClass = getSubjectColor(c.courseId);
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex justify-between items-center p-2 rounded-md border text-xs transition-opacity ${colorClass} ${onClassClick ? 'cursor-pointer hover:opacity-90' : ''}`}
                                                    onClick={() => onClassClick?.(c)}
                                                >
                                                    <span className="font-bold truncate pr-2">{c.courseId}</span>
                                                    <div className="flex items-center space-x-2 shrink-0">
                                                        <span className="text-[11px] opacity-80 font-mono">{c.classId}</span>
                                                        {onHideClass && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onHideClass(c.courseId);
                                                                }}
                                                                className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                                title="仮削除（一時退避）"
                                                            >
                                                                <EyeOff className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
