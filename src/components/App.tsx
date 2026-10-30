import React from 'react';
import { AppProvider, useAppContext } from '../context/AppContext';
import { OnboardingScreen } from '../pages/OnboardingScreen';
import { ConditionScreen } from '../pages/ConditionScreen';
import { CourseSelectionScreen } from '../pages/CourseSelectionScreen';
import { ProposalScreen } from '../pages/ProposalScreen';
import { GeneratorScreen } from '../pages/GeneratorScreen';
import { DashboardScreen } from '../pages/DashboardScreen';
import { GradeInputScreen } from '../pages/GradeInputScreen';
import { ReflectionScreen } from '../pages/ReflectionScreen';
import { LoginScreen } from '../pages/LoginScreen';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertCircle, LogOut, User } from 'lucide-react';

const ScreenManager: React.FC = () => {
  const { state } = useAppContext();

  switch (state.currentScreen) {
    case 1: return <OnboardingScreen />;
    case 2: return <ConditionScreen />;
    case 3: return <CourseSelectionScreen />;
    case 4: return <ProposalScreen />;
    case 5: return <GeneratorScreen />;
    case 6: return <DashboardScreen />;
    case 7: return <GradeInputScreen />;
    case 8: return <ReflectionScreen />;
    default: return <OnboardingScreen />;
  }
};

const FloatingUserBadge: React.FC = () => {
  const { user, logout } = useAppContext();

  if (!user) return null;

  const handleLogoutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (logout) {
      logout();
    }
  };

  return (
    <div
      onClick={handleLogoutClick}
      className="fixed bottom-6 left-4 md:bottom-4 md:left-4 z-[9999] pointer-events-auto cursor-pointer select-none flex items-center gap-2 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-lg hover:shadow-xl hover:bg-red-50/80 hover:border-red-300 rounded-full px-3.5 py-1.5 transition-all duration-200 text-xs active:scale-95 group animate-in fade-in slide-in-from-bottom-2"
      title="クリックしてログアウト"
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-1.5 text-slate-700 font-medium group-hover:text-red-900">
        {user.photoURL ? (
          <img src={user.photoURL} alt="Avatar" className="w-5 h-5 rounded-full ring-1 ring-slate-300 group-hover:ring-red-300" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold text-[10px]">
            {user.email ? user.email[0].toUpperCase() : <User className="w-3 h-3" />}
          </div>
        )}
        <span className="max-w-[100px] sm:max-w-[140px] truncate hidden sm:inline font-semibold text-slate-800 group-hover:text-red-900">
          {user.displayName || user.email?.split('@')[0] || 'ユーザー'}
        </span>
      </div>

      <div className="h-3 w-[1px] bg-slate-200 group-hover:bg-red-200 mx-0.5" />

      <button
        type="button"
        onClick={handleLogoutClick}
        className="flex items-center gap-1 text-slate-500 group-hover:text-red-600 font-bold transition-colors text-[11px] pointer-events-auto cursor-pointer border-0 bg-transparent p-0 outline-none"
        title="ログアウト"
      >
        <LogOut className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-600" />
        <span className="hidden xs:inline">ログアウト</span>
      </button>
    </div>
  );
};

const AuthGate: React.FC = () => {
  const { user, authLoading, loadStatus, state } = useAppContext();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted font-medium">認証状態を確認中...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // 保存データを読み込めなかった：上書きしないよう画面は出さず、再読み込みだけを出す
  if (loadStatus === 'error') {
    return (
      <>
        <FloatingUserBadge />
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-12">
          <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
          <h2 className="text-2xl font-bold text-red-600 mb-4">保存データを読み込めなかった</h2>
          <p className="text-muted mb-8 max-w-lg text-center leading-relaxed bg-red-50 p-4 rounded-lg">
            通信の調子が悪いのかもな。お前のデータは消してねえから安心しろ。少し待ってから読み込み直してみな。
          </p>
          <button type="button" onClick={() => window.location.reload()} className="btn-secondary">再読み込み</button>
        </div>
      </>
    );
  }

  return (
    <>
      <FloatingUserBadge />
      {/* 「戻る」でエラー表示を解除し、今の画面を描き直す（モーダルなど画面内の状態は閉じた状態に戻る） */}
      <ErrorBoundary resetKey={state.currentScreen} onReset={() => {}}>
        <ScreenManager />
      </ErrorBoundary>
    </>
  );
};

const App: React.FC = () => {
  return (
    // 画面の外（認証まわりなど）で起きたエラー用。「戻る」はページを再読み込みする
    <ErrorBoundary>
      <AppProvider>
        <AuthGate />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
