import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../logic/AppContext';
import { Header } from '../ui/Header';
import { Button } from '../ui/Button';
import { MessageSquare, Send, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChatMessage } from '../logic/types';

export const ChatbotScreen: React.FC = () => {
    const { state, setScreen } = useAppContext();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Welcome message from AI先輩
    const getWelcomeMessage = (): ChatMessage => ({
        role: 'model',
        content: `おい、後輩 (${state.userProfile.nickname || '名無し'})。何か聞きたいことでもあるのか？
会津のクソ過酷な冬の乗り越え方から、あの科目の噂、楽単情報まで、俺が知ってることなら教えてやるよ。
「おすすめの教養科目は？」とか「プログラミングが不安なんだけど…」とか、何でもいいから話しかけてこい。`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    // Initialize welcome message on mount
    useEffect(() => {
        setMessages([getWelcomeMessage()]);
    }, []);

    // Auto scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userText = input;
        setInput('');

        const userMsg: ChatMessage = {
            role: 'user',
            content: userText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        // Update state with user message
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setIsLoading(true);

        try {
            // Call BFF API Endpoint
            const response = await fetch('/api/chatbot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userText,
                    history: messages.slice(-6) // Limit history to last 6 messages (3 turns) to save tokens
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const errorDetail = data.error || `HTTP ${response.status} ${response.statusText}`;
                console.error('[Chatbot Error Detail]:', errorDetail);
                throw new Error(errorDetail);
            }

            const aiMsg: ChatMessage = {
                role: 'model',
                content: data.response,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (error: any) {
            console.error('Chat error:', error);
            const errorDetailMsg = error?.message ? ` (${error.message})` : '';
            const errorMsg: ChatMessage = {
                role: 'model',
                content: `…チッ、通信エラーか？AI先輩のサーバーが会津の雪で凍りついたみたいだ。時間をおいてもう一回話しかけてくれ。${errorDetailMsg}`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = () => {
        if (window.confirm('AI先輩との会話履歴をクリアしていいか？')) {
            setMessages([getWelcomeMessage()]);
        }
    };

    // Helper to format line breaks and list items in AI responses
    const formatMessageContent = (text: string) => {
        return text.split('\n').map((line, index) => {
            // Handle bullet points
            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return (
                    <li key={index} className="ml-4 list-disc text-sm my-0.5">
                        {line.trim().substring(2)}
                    </li>
                );
            }
            // Handle numbered lists
            const numListMatch = line.trim().match(/^(\d+)\.\s(.*)/);
            if (numListMatch) {
                return (
                    <li key={index} className="ml-4 list-decimal text-sm my-0.5">
                        {numListMatch[2]}
                    </li>
                );
            }
            // Normal paragraphs
            return line.trim() === '' ? (
                <div key={index} className="h-2" />
            ) : (
                <p key={index} className="text-sm leading-relaxed mb-1 min-h-[1rem]">
                    {line}
                </p>
            );
        });
    };

    return (
        <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
            {/* Top Navbar */}
            <Header
                title="AI先輩トーク"
                subtitle="会津大の裏情報なら任せろ"
                icon={MessageSquare}
                action={{
                    label: "ダッシュボードに戻る",
                    onClick: () => setScreen(6),
                    icon: ArrowLeft,
                    variant: 'outline'
                }}
            />

            {/* Main Chat Area */}
            <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col h-[calc(100vh-73px)] relative bg-card/40 backdrop-blur-md border-x border-border">
                {/* Chat Header Actions */}
                <div className="px-6 py-3 border-b border-border bg-card/60 flex justify-between items-center z-10">
                    <span className="text-xs font-semibold text-muted flex items-center">
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                        AI先輩 オンライン (冬眠中)
                    </span>
                    <button
                        onClick={handleClearHistory}
                        className="text-xs text-muted hover:text-red-500 flex items-center gap-1.5 transition-colors py-1 px-2.5 rounded-lg hover:bg-red-500/10"
                        title="履歴をリセット"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        会話をクリア
                    </button>
                </div>

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                    <AnimatePresence initial={false}>
                        {messages.map((msg, i) => {
                            const isUser = msg.role === 'user';
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {/* Avatar */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md flex-shrink-0
                                            ${isUser 
                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' 
                                                : 'bg-gradient-to-br from-orange-500 to-amber-600 text-white'}`}
                                        >
                                            {isUser ? 'ME' : '先輩'}
                                        </div>

                                        {/* Bubble Container */}
                                        <div>
                                            <div className={`p-4 rounded-2xl shadow-sm border ${
                                                isUser
                                                    ? 'bg-blue-600 text-white border-blue-700 rounded-tr-none'
                                                    : 'bg-card text-foreground border-border rounded-tl-none'
                                                }`}
                                            >
                                                {isUser ? (
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                ) : (
                                                    <ul className="space-y-0.5">
                                                        {formatMessageContent(msg.content)}
                                                    </ul>
                                                )}
                                            </div>
                                            {/* Timestamp */}
                                            <span className={`text-[10px] text-muted block mt-1 ${isUser ? 'text-right mr-1' : 'text-left ml-1'}`}>
                                                {msg.timestamp}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* AI Loading state */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start"
                        >
                            <div className="flex gap-3 items-start max-w-[80%]">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center text-xs font-bold shadow-md flex-shrink-0 animate-pulse">
                                    先輩
                                </div>
                                <div className="p-4 bg-card border border-border rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                                    <span className="text-xs text-muted">先輩が考えている...</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border bg-card/80 backdrop-blur-md">
                    <form onSubmit={handleSend} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoading}
                            placeholder={isLoading ? "先輩の返答を待て..." : "AI先輩に質問を入力..."}
                            className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 transition-all duration-200"
                        />
                        <Button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};
