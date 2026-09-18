import React, { useState, useEffect } from 'react';
import { Sparkles, Pickaxe, MessageSquareQuote } from 'lucide-react';

export interface LoadingSenpaiProps {
    isComplete?: boolean;
}

const SENPAI_TIPS = [
    "会津の冬を舐めるな。防水の長靴は11月中に必ず買っておけよ！",
    "空きコマの食堂は戦場だ。11時台か13時以降に時間をずらして飯を喰え。",
    "課題を週末まで溜め込むな。日曜深夜に地獄を見るのはお前だぞ。",
    "大雪の日の朝一コマは自分との戦いだ。目覚ましは3個かけろ！",
    "図書館の集中スペースは天国だ。家で集中できないなら迷わず行け。",
    "先輩の過去問と口演資料は神の恵みだ。日頃から人間関係を大切にしとけよ！",
    "プログラミングのバグは寝て起きると直ることがある。無駄に徹夜で粘るな！"
];

export const LoadingSenpai: React.FC<LoadingSenpaiProps> = ({ isComplete = false }) => {
    const [tipIndex, setTipIndex] = useState(0);
    const [fadeState, setFadeState] = useState<'in' | 'out'>('in');
    const [progress, setProgress] = useState(0);

    // Tips rotation interval (every 2.8s)
    useEffect(() => {
        const interval = setInterval(() => {
            setFadeState('out');
            setTimeout(() => {
                setTipIndex((prev) => (prev + 1) % SENPAI_TIPS.length);
                setFadeState('in');
            }, 300);
        }, 2800);

        return () => clearInterval(interval);
    }, []);

    // Fake progress bar logic (Minecraft style chunky progress)
    useEffect(() => {
        if (isComplete) {
            setProgress(100);
            return;
        }

        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 92) return prev; // Hold at ~92% until complete
                const bump = Math.floor(Math.random() * 8) + 4; // Add 4-11%
                return Math.min(prev + bump, 92);
            });
        }, 350);

        return () => clearInterval(progressInterval);
    }, [isComplete]);

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-gray-800 relative overflow-hidden select-none font-mono">
            {/* Retro Pixel Background Overlay Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-60 pointer-events-none" />

            <div className="max-w-lg w-full bg-white border-4 border-gray-800 p-8 shadow-[6px_6px_0_0_rgba(31,41,55,1)] relative z-10 flex flex-col items-center text-center">
                {/* Header Badge */}
                <div className="flex items-center space-x-2 bg-emerald-50 border-2 border-emerald-600 px-4 py-1.5 mb-6 shadow-sm">
                    <Pickaxe className="w-5 h-5 text-emerald-600 animate-bounce" />
                    <span className="font-bold text-emerald-800 text-sm tracking-wider">
                        crafting....
                    </span>
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                </div>

                {/* Main Title */}
                <h2 className="text-xl font-black text-gray-900 mb-2 tracking-wide">
                    AI先輩が分析・計算中！
                </h2>
                <p className="text-xs text-gray-600 mb-8">
                    目標に合わせた最適なプランをAI先輩が計算中だ...
                </p>

                {/* Tip Callout Box */}
                <div className="w-full bg-gray-50 border-2 border-gray-800 p-4 mb-8 min-h-[96px] flex flex-col justify-center items-center relative shadow-sm">
                    <div className="absolute -top-3 left-4 bg-gray-800 text-white px-2 py-0.5 text-[10px] font-bold flex items-center">
                        <MessageSquareQuote className="w-3 h-3 mr-1 text-emerald-300" />
                        先輩からのアドバイス
                    </div>
                    <p
                        className={`text-xs text-gray-800 leading-relaxed font-bold transition-opacity duration-300 ${
                            fadeState === 'in' ? 'opacity-100' : 'opacity-0'
                        }`}
                    >
                        "{SENPAI_TIPS[tipIndex]}"
                    </p>
                </div>

                {/* Minecraft-Style Chunky Progress Bar (Light Green Fill) */}
                <div className="w-full space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-700 px-1">
                        <span>GENERATING...</span>
                        <span className="text-emerald-700 font-extrabold">{progress}%</span>
                    </div>

                    {/* Outer Bar (Square, Thick Border, No Rounded Corners) */}
                    <div className="w-full h-7 bg-gray-100 border-4 border-gray-800 p-0.5 relative">
                        {/* Fill Bar (Light Green Block) */}
                        <div
                            className="h-full bg-green-400 border-r-2 border-gray-800 transition-all duration-300 relative overflow-hidden"
                            style={{ width: `${progress}%` }}
                        >
                            {/* Pixel Grid Pattern inside progress fill */}
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_50%,rgba(0,0,0,0.08)_50%)] bg-[size:8px_100%]" />
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-[10px] text-gray-500">
                    ※ 画面を閉じずにお待ちください
                </div>
            </div>
        </div>
    );
};
