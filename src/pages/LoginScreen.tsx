import React, { useState } from 'react';
import { useAppContext } from '../logic/AppContext';
import { GraduationCap, Calculator, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';

export const LoginScreen: React.FC = () => {
    const { loginWithGoogle } = useAppContext();
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        setIsLoggingIn(true);
        setErrorMsg(null);
        try {
            await loginWithGoogle();
        } catch (err: any) {
            console.error("Login failed:", err);
            setErrorMsg("ログインに失敗しました。Firebaseの設定やネットワーク接続を確認してください。");
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-[100dvh] w-full bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-800 flex flex-col justify-between relative overflow-hidden px-6 py-8 md:py-12 max-w-md mx-auto shadow-2xl md:my-6 md:rounded-[40px] md:min-h-[844px] md:border md:border-slate-200">
            
            {/* Background Geometric & Blurred Decorations */}
            <div className="absolute -top-24 -left-20 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-accent/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -top-10 -right-24 w-72 h-72 bg-gradient-to-bl from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Bar / Status Header Placeholder */}
            <div className="relative z-10 flex justify-between items-center text-xs font-semibold text-slate-400 pt-2 px-1">
                <span>会津大学 (U-Aizu)</span>
                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5" /> 公式シラバス対応
                </span>
            </div>

            {/* Hero Section (Center Content) */}
            <div className="relative z-10 my-auto space-y-8 py-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
                
                {/* Logo & Title */}
                <div className="text-center space-y-3">
                    <div className="inline-flex p-4 bg-gradient-to-tr from-accent via-emerald-500 to-teal-400 text-white rounded-3xl shadow-xl shadow-accent/25 ring-8 ring-accent/10">
                        <GraduationCap className="w-12 h-12 stroke-[2.25]" />
                    </div>
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                            AI TIME TABLE <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-600 text-sm font-extrabold bg-accent/10 px-3 py-1 rounded-full border border-accent/20 align-middle">v2.0</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5">
                            AI先輩と組む、最適な履修と時間割
                        </p>
                    </div>
                </div>

                {/* Feature Highlights List */}
                <div className="space-y-3.5 px-2">
                    <div className="flex items-center gap-3.5 bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md">
                        <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                            <Calculator className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-slate-900 text-sm">履修計画と単位の自動計算</div>
                            <div className="text-[11px] text-slate-500">卒業要件やGPA算出をミスなくリアルタイム計算</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5 bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md">
                        <div className="p-2.5 bg-accent/15 text-accent rounded-xl shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-slate-900 text-sm">AI先輩による時間割フィードバック</div>
                            <div className="text-[11px] text-slate-500">先輩のリアル口コミと夢に繋がる履修指導</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3.5 bg-white/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/80 shadow-xs transition-all hover:shadow-md">
                        <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-slate-900 text-sm">マルチデバイスでいつでも同期</div>
                            <div className="text-[11px] text-slate-500">PC・スマホ間をクラウド連携で自動バックアップ</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Banner */}
            {errorMsg && (
                <div className="relative z-10 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-2xl text-center shadow-xs">
                    {errorMsg}
                </div>
            )}

            {/* Action Section (Bottom Floating / Anchored) */}
            <div className="relative z-10 w-full space-y-3 pb-2 pt-4 border-t border-slate-100/80">
                <button
                    onClick={handleGoogleLogin}
                    disabled={isLoggingIn}
                    className="w-full max-w-sm mx-auto bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-full shadow-xl shadow-slate-900/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                >
                    {isLoggingIn ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                        </svg>
                    )}
                    <span className="text-sm font-semibold tracking-wide">Google でつづける</span>
                </button>

                <p className="text-center text-[11px] text-slate-400 font-medium">
                    会津大生専用・安全なクラウド自動保存
                </p>
            </div>
        </div>
    );
};
