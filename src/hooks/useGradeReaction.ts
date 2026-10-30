// 画面7（成績入力）の AI の呼び出し：成績へのコマどり先輩のリアクション
import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { generateGradeReaction } from '../services/aiApi';
import type { GradeInput, GradeReactionResponse } from '../services/aiApi';

export function useGradeReaction(): {
  aiReaction: GradeReactionResponse | null;
  isGeneratingReaction: boolean;
  /** 成績が入っている科目だけを送る。1つもなければ AI を呼ばずに「未評価」を出す */
  generateReaction: (gradeInputs: GradeInput[]) => Promise<void>;
} {
  const { state } = useAppContext();
  const [aiReaction, setAiReaction] = useState<GradeReactionResponse | null>(null);
  const [isGeneratingReaction, setIsGeneratingReaction] = useState(false);

  const generateReaction = async (gradeInputs: GradeInput[]) => {
    const validGrades = gradeInputs.filter(input => input.grade);
    
    if (validGrades.length === 0) {
      setAiReaction({
        title: '未評価',
        message: '成績を入力してからにしろよ！何も評価できるものがないじゃねえか。'
      });
      return;
    }

    setIsGeneratingReaction(true);
    try {
      const reaction = await generateGradeReaction(state.userProfile, validGrades);
      setAiReaction(reaction);
    } catch (error) {
      setAiReaction({
        title: 'エラー',
        message: 'なんだかエラーが出たな。もう一回試してみろ。'
      });
    } finally {
      setIsGeneratingReaction(false);
    }
  };

  return { aiReaction, isGeneratingReaction, generateReaction };
}
