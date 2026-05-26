import React, { useState } from 'react';
import { useAppContext } from '../logic/AppContext';
import { Header } from '../ui/Header';
import { Button } from '../ui/Button';
import { Award, AlertCircle, TrendingUp, TrendingDown, Meh, Flame, Star } from 'lucide-react';
import { generateGradeReaction } from '../ai/aiService';

interface GradeInput {
  courseId: string;
  courseName: string;
  grade: string;
  credits: number;
}

export const GradeInputScreen: React.FC = () => {
  const { state, setScreen, saveGrade } = useAppContext();
  const [gradeInputs, setGradeInputs] = useState<GradeInput[]>(() => 
    state.committedClasses.map(c => ({
      courseId: c.courseId,
      courseName: c.courseId, // You might want to store full course names
      grade: state.grades[c.courseId]?.grade || '',
      credits: 2 // Default credits, you might want to store this
    }))
  );
  const [aiReaction, setAiReaction] = useState<string | null>(null);
  const [isGeneratingReaction, setIsGeneratingReaction] = useState(false);

  const handleGradeChange = (courseId: string, grade: string) => {
    setGradeInputs(prev => 
      prev.map(input => 
        input.courseId === courseId ? { ...input, grade } : input
      )
    );
  };

  const handleGenerateReaction = async () => {
    const validGrades = gradeInputs.filter(input => input.grade);
    
    if (validGrades.length === 0) {
      setAiReaction('成績を入力してからにしろよ！何も評価できるものがないじゃねえか。');
      return;
    }

    setIsGeneratingReaction(true);
    try {
      const reaction = await generateGradeReaction(state.userProfile, validGrades);
      setAiReaction(reaction);
    } catch (error) {
      setAiReaction('なんだかエラーが出たな。もう一回試してみろ。');
    } finally {
      setIsGeneratingReaction(false);
    }
  };

  const handleSaveAndContinue = () => {
    gradeInputs.forEach(input => {
      if (input.grade) {
        saveGrade(input.courseId, {
          grade: input.grade,
          classDifficulty: 3, // Default values
          testDifficulty: 3
        });
      }
    });
    setScreen(1); // Go to condition screen for next semester
  };

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'A': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'B': return <Star className="w-4 h-4 text-blue-600" />;
      case 'C': return <Meh className="w-4 h-4 text-yellow-600" />;
      case 'D': 
      case 'F': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'border-green-200 bg-green-50';
      case 'B': return 'border-blue-200 bg-blue-50';
      case 'C': return 'border-yellow-200 bg-yellow-50';
      case 'D': 
      case 'F': return 'border-red-200 bg-red-50';
      default: return 'border-border bg-card';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        title="成績入力"
        subtitle="前期の成績を入力して、AI先輩に評価してもらおう"
        icon={Award}
        action={{
          label: "次学期の時間割を作る",
          onClick: handleSaveAndContinue,
          icon: Flame
        }}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        {/* Grade Input Section */}
        <div className="space-y-4">
          <h2 className="font-bold text-foreground text-xl flex items-center border-b border-border pb-2">
            成績入力
            <span className="ml-3 text-sm font-normal text-muted bg-muted/20 px-3 py-1 rounded-full">
              取得した成績を選択してください
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gradeInputs.map((input) => (
              <div
                key={input.courseId}
                className={`p-4 rounded-xl border transition-all ${getGradeColor(input.grade)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getGradeIcon(input.grade)}
                    <span className="font-semibold text-foreground">{input.courseName}</span>
                  </div>
                  <span className="text-xs text-muted">{input.credits} 単位</span>
                </div>
                
                <select
                  value={input.grade}
                  onChange={(e) => handleGradeChange(input.courseId, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent focus:border-accent outline-none"
                >
                  <option value="">-- 成績を選択 --</option>
                  {state.userProfile.gradingScale.map(scale => (
                    <option key={scale.label} value={scale.label}>
                      {scale.label} ({scale.point} 点)
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* AI Reaction Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleGenerateReaction}
            variant="outline"
            disabled={isGeneratingReaction}
            className="flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            {isGeneratingReaction ? 'AI先輩が評価中...' : 'AI先輩に評価してもらう'}
          </Button>
        </div>

        {/* AI Reaction Display */}
        {aiReaction && (
          <div className="bg-accent/5 rounded-2xl p-6 border border-accent/10 relative">
            <div className="absolute top-4 right-4">
              <Flame className="w-6 h-6 text-accent animate-pulse" />
            </div>
            <div className="pr-10">
              <h3 className="font-bold text-foreground text-lg mb-3 flex items-center">
                AI先輩の評価
              </h3>
              <p className="text-foreground text-md leading-relaxed font-medium whitespace-pre-wrap">
                {aiReaction}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
