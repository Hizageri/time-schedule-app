// 画面4（コマどり先輩のアドバイス）の裏側の処理：AI 相談の呼び出し、残す科目の選択と確定
import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateConsultation } from '../services/aiApi';
import type { ConsultationResponse } from '../services/aiApi';

export function useConsultation(): {
    loading: boolean;
    isComplete: boolean;
    error: string | null;
    consultation: ConsultationResponse | null;
    selectedToKeep: Record<string, boolean>;
    toggleCourse: (courseId: string) => void;
    handleFinalize: () => void;
} {
    const { state, setState, setScreen } = useAppContext();

    const [loading, setLoading] = useState(true);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [consultation, setConsultation] = useState<ConsultationResponse | null>(null);
    const [selectedToKeep, setSelectedToKeep] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchAI = async () => {
            try {
                if (state.selectedCourses.length === 0) {
                    setLoading(false);
                    return;
                }
                const res = await generateConsultation(state.userProfile, state.selectedCourses);
                setConsultation(res);

                const initialChecks: Record<string, boolean> = {};
                res.courseFeedbacks.forEach(c => initialChecks[c.courseId] = true);
                setSelectedToKeep(initialChecks);

                setIsComplete(true);
                setTimeout(() => {
                    setLoading(false);
                }, 400);
            } catch (err) {
                console.error(err);
                setError((err as { message?: string }).message || 'AIからの応答の取得に失敗しました。APIキーが設定されているか確認してください。');
                setLoading(false);
            }
        };

        fetchAI();
    }, []);

    const toggleCourse = (courseId: string) => {
        setSelectedToKeep(prev => ({ ...prev, [courseId]: !prev[courseId] }));
    };

    const handleFinalize = () => {
        const finalized = state.selectedCourses.filter(c => {
            const matchingKey = Object.keys(selectedToKeep).find(key => c.id_name.includes(key) || key.includes(c.id_name));
            return matchingKey ? selectedToKeep[matchingKey] : true;
        });
        setState(prev => ({ ...prev, selectedCourses: finalized }));
        setScreen(5); // GeneratorScreen
    };

    return { loading, isComplete, error, consultation, selectedToKeep, toggleCourse, handleFinalize };
}
