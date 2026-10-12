import React from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
    children: ReactNode;
    /** 「戻る」を押したときの処理。省略時はページを再読み込みする */
    onReset?: () => void;
    /** この値が変わったらエラー表示を解除する（例：currentScreen） */
    resetKey?: unknown;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

// 描画中のエラーで画面が真っ白にならないよう、コマどり先輩のエラー画面に差し替える
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] 画面の描画中にエラーが発生しました:', error, info.componentStack);
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps) {
        if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
            this.setState({ hasError: false });
        }
    }

    handleReset = () => {
        if (this.props.onReset) {
            this.setState({ hasError: false });
            this.props.onReset();
        } else {
            window.location.reload();
        }
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-12">
                <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
                <h2 className="text-2xl font-bold text-red-600 mb-4">おっと、何かがぶっ壊れたみてえだ</h2>
                <p className="text-muted mb-8 max-w-lg text-center leading-relaxed bg-red-50 p-4 rounded-lg">
                    お前のせいじゃねえから安心しろ。いったん戻って、もう一回やり直してみな。
                </p>
                <button onClick={this.handleReset} className="btn-secondary">戻る</button>
            </div>
        );
    }
}
