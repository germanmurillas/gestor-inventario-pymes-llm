import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Cpu, User } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    timestamp: Date;
}

export default function TerminalRAG() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'ai',
            content: 'Terminal RAG Inicializada. Conectado al Vector DB de la Bodega Central. ¿Qué lote o producto deseas auditar?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
        setInput('');
        setIsTyping(true);

        try {
            // Se utiliza el enrutamiento interno de Laravel (protegido por CSRF gracias a Cookie)
            // Se asume el uso del middleware web por esto se apunta directo a /chat-rag
            const token = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const res = await fetch('/chat-rag', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token
                },
                body: JSON.stringify({ prompt: userMsg })
            });
            const data = await res.json();
            
            setMessages(prev => [...prev, {
                role: 'ai',
                content: data.response || "> ERROR DE LECTURA ESTRUCTURAL",
                timestamp: new Date()
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: "> PANIC: El servidor LLM no ha respondido. Verifica que la ruta /chat-rag exista.",
                timestamp: new Date()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#111111] text-[#E8E4DD] rounded-xl overflow-hidden border border-[#E8E4DD]/10 shadow-2xl font-mono">
            {/* Header Terminal */}
            <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-[#E8E4DD]/10">
                <div className="flex items-center gap-3">
                    <Terminal size={18} className="text-[#E63B2E]" />
                    <span className="text-sm font-bold tracking-widest uppercase">Pymetory // LLM_Audit_Core</span>
                </div>
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#E8E4DD]/20"></div>
                    <div className="w-3 h-3 rounded-full bg-[#E8E4DD]/20"></div>
                    <div className="w-3 h-3 rounded-full bg-[#E63B2E] animate-pulse"></div>
                </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center border ${msg.role === 'ai' ? 'bg-[#E63B2E]/10 border-[#E63B2E]/30 text-[#E63B2E]' : 'bg-[#E8E4DD]/10 border-[#E8E4DD]/30 text-[#E8E4DD]'}`}>
                            {msg.role === 'ai' ? <Cpu size={16} /> : <User size={16} />}
                        </div>
                        <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            <div className="text-xs opacity-50 mb-1">
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap ${msg.role === 'ai' ? 'text-[#E8E4DD]' : 'text-[#E8E4DD]/80'}`}>
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded bg-[#E63B2E]/10 border border-[#E63B2E]/30 flex items-center justify-center text-[#E63B2E]">
                            <Cpu size={16} />
                        </div>
                        <div className="flex items-center">
                            <span className="text-[#E63B2E] animate-pulse">_ processing_query</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-4 bg-black border-t border-[#E8E4DD]/10">
                <div className="relative flex items-center">
                    <span className="absolute left-4 text-[#E63B2E] font-bold">{'>'}</span>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ingresa tu consulta sobre el stock en lenguaje natural..."
                        className="w-full bg-[#111111] text-[#E8E4DD] pl-10 pr-12 py-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E63B2E]/50 border border-[#E8E4DD]/10 placeholder-[#E8E4DD]/30 transition-all"
                        disabled={isTyping}
                    />
                    <button 
                        type="submit" 
                        disabled={isTyping || !input.trim()}
                        className="absolute right-2 p-2 rounded hover:bg-[#E8E4DD]/10 text-[#E8E4DD] disabled:opacity-50 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
}
