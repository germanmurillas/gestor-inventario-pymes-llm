import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, User, Bot, Search, Plus, Filter, Loader2 } from 'lucide-react';
import axios from 'axios';

const FigmaLLM = () => {
    const [messages, setMessages] = useState([
        { id: 1, role: 'bot', content: 'Bienvenido Germán. Soy el motor RAG de Pymetory. ¿Qué quieres auditar hoy del inventario?' },
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isThinking]);

    const handleSendMessage = async () => {
        if (!input.trim() || isThinking) return;

        const userMessage = { id: Date.now(), role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsThinking(true);

        try {
            const response = await axios.post('/chat-rag', { prompt: input });
            const botMessage = { 
                id: Date.now() + 1, 
                role: 'bot', 
                content: response.data.response || 'El sistema no devolvió una respuesta clara.' 
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (error: any) {
            const errorMessage = { 
                id: Date.now() + 1, 
                role: 'bot', 
                content: `> ERROR CRITICO: ${error.response?.data?.response || 'Falla en la comunicación con el motor LLM.'}` 
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="flex h-full gap-8 animate-in fade-in duration-500">
            {/* Chat List Sidebar (Mockup 10 Left) */}
            <aside className="w-80 border-r border-gray-200 pr-8 space-y-6">
                 <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold uppercase tracking-tight">Chat Pymetory</h2>
                     <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm">
                         <Plus size={18} />
                     </button>
                 </div>

                 <div className="relative">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input 
                        type="text" 
                        placeholder="Buscar auditoría..." 
                        className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                     />
                 </div>

                 <div className="space-y-2">
                     <div className="p-4 rounded-lg border bg-white border-gray-200 shadow-sm cursor-pointer">
                         <div className="text-sm font-bold truncate">Auditoría Stock Actual</div>
                         <div className="text-xs opacity-60 mt-1 truncate">Hoy - Analizando inventario FEFO...</div>
                     </div>
                 </div>
            </aside>

            {/* Chat Window (Mockup 10 Center) */}
            <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white">
                            <Bot size={18} />
                        </div>
                        <div>
                            <div className="text-sm font-bold">Motor RAG Pymetory</div>
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isThinking ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {isThinking ? 'Procesando RAG...' : 'En línea'}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <div ref={scrollRef} className="flex-1 overflow-auto p-6 space-y-6 scroll-smooth">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-xl text-sm ${msg.role === 'user' ? 'bg-[#111111] text-white shadow-md' : 'bg-gray-100 text-[#111111] border border-gray-200'}`}>
                                <div className="font-bold text-[10px] mb-1 uppercase opacity-50 tracking-widest">{msg.role === 'user' ? 'Germán' : 'Pymetory LLM'}</div>
                                <div className="leading-relaxed whitespace-pre-wrap font-mono text-[13px]">{msg.content}</div>
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl flex items-center gap-3">
                                <Loader2 size={16} className="animate-spin text-black" />
                                <span className="text-xs font-bold uppercase tracking-widest opacity-40">Escaneando Lotes...</span>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="relative">
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                            placeholder="Ej: ¿Qué lotes vencen esta semana?" 
                            className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black min-h-[50px] max-h-[150px] resize-none"
                            rows={1}
                        />
                        <button 
                            disabled={isThinking}
                            onClick={handleSendMessage}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black text-white p-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-20"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default FigmaLLM;
