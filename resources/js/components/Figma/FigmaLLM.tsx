import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, User, Bot, Search, Plus, Filter, Loader2 } from 'lucide-react';
import axios from 'axios';

const FigmaLLM = () => {
    const [sessions, setSessions] = useState<any[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [activeSessionTitle, setActiveSessionTitle] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([
        { id: 1, role: 'bot', content: 'Bienvenido Germán. Soy el motor RAG de Pymetory. ¿Qué quieres auditar hoy del inventario?' },
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchSessions = async () => {
        try {
            const res = await axios.get('/chat-sessions');
            if (res.data.sessions) {
                setSessions(res.data.sessions);
            }
        } catch (err) {
            // Silence fallback
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleSelectSession = async (sessionId: string, sessionTitle: string) => {
        setActiveSessionId(sessionId);
        setActiveSessionTitle(sessionTitle);
        setIsThinking(true);
        try {
            const res = await axios.get(`/chat-sessions/${sessionId}`);
            if (res.data.messages) {
                const loaded: any[] = [];
                res.data.messages.forEach((item: any, idx: number) => {
                    loaded.push({
                        id: idx * 2 + 2,
                        role: 'user',
                        content: item.prompt
                    });
                    loaded.push({
                        id: idx * 2 + 3,
                        role: 'bot',
                        content: item.response
                    });
                });
                setMessages(loaded.length > 0 ? loaded : [
                    { id: 1, role: 'bot', content: 'Bienvenido Germán. Soy el motor RAG de Pymetory. ¿Qué quieres auditar hoy del inventario?' },
                ]);
            }
        } catch (err) {
            // Error handling
        } finally {
            setIsThinking(false);
        }
    };

    const handleNewChat = () => {
        setActiveSessionId(null);
        setActiveSessionTitle(null);
        setMessages([
            { id: 1, role: 'bot', content: 'Bienvenido Germán. Soy el motor RAG de Pymetory. ¿Qué quieres auditar hoy del inventario?' },
        ]);
        setInput('');
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isThinking]);

    const handleSendMessage = async () => {
        if (!input.trim() || isThinking) return;

        const userMessage = { id: Date.now(), role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsThinking(true);

        try {
            const response = await axios.post('/chat-rag', { 
                prompt: currentInput,
                session_id: activeSessionId,
                session_title: activeSessionTitle
            });
            const botMessage = { 
                id: Date.now() + 1, 
                role: 'bot', 
                content: response.data.response || 'El sistema no devolvió una respuesta clara.' 
            };
            setMessages(prev => [...prev, botMessage]);

            if (!activeSessionId && response.data.session_id) {
                setActiveSessionId(response.data.session_id);
                setActiveSessionTitle(response.data.session_title);
                fetchSessions();
            }
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

    const filteredSessions = sessions.filter(s => 
        (s.session_title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-full gap-8 animate-in fade-in duration-500">
            {/* Chat List Sidebar (Mockup 10 Left) */}
            <aside className="w-80 border-r border-slate-700/30 pr-8 space-y-6 flex flex-col h-full">
                 <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold uppercase tracking-tight">Chat Pymetory</h2>
                     <button onClick={handleNewChat} className="p-2 hover:bg-slate-800/30 rounded-lg transition-colors border border-slate-700/30 shadow-sm" title="Nuevo Chat">
                         <Plus size={18} />
                     </button>
                 </div>

                 <div className="relative">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar auditoría..." 
                        className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-700/30 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                     />
                 </div>

                 <div className="space-y-2 flex-1 overflow-y-auto">
                     {filteredSessions.map((s) => (
                         <div 
                            key={s.session_id} 
                            onClick={() => handleSelectSession(s.session_id, s.session_title)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                activeSessionId === s.session_id 
                                ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                : 'bg-slate-900/80 backdrop-blur-xl border-gray-100 hover:border-slate-700/30'
                            }`}
                         >
                             <div className="text-sm font-bold truncate text-slate-800">{s.session_title || 'Nueva Consulta'}</div>
                             <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1 truncate">
                                {s.last_activity ? new Date(s.last_activity).toLocaleDateString() : 'Auditoría FEFO'}
                             </div>
                         </div>
                     ))}
                     {filteredSessions.length === 0 && (
                         <div className="text-center p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">No hay chats previos</div>
                     )}
                 </div>
            </aside>

            {/* Chat Window (Mockup 10 Center) */}
            <div className="flex-1 flex flex-col bg-slate-900/80 backdrop-blur-xl border border-slate-700/30 rounded-xl overflow-hidden shadow-sm">
                <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-800/50/30">
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
                            <div className={`max-w-[80%] p-4 rounded-xl text-sm ${msg.role === 'user' ? 'bg-[#111111] text-white shadow-md' : 'bg-slate-800/30 text-[#111111] border border-slate-700/30'}`}>
                                <div className="font-bold text-[10px] mb-1 uppercase opacity-50 tracking-widest">{msg.role === 'user' ? 'Germán' : 'Pymetory LLM'}</div>
                                <div className="leading-relaxed whitespace-pre-wrap font-mono text-[13px]">{msg.content}</div>
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800/50 border border-gray-100 p-4 rounded-xl flex items-center gap-3">
                                <Loader2 size={16} className="animate-spin text-black" />
                                <span className="text-xs font-bold uppercase tracking-widest opacity-40">Escaneando Lotes...</span>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-4 border-t border-gray-100 bg-slate-800/50/50">
                    <div className="relative">
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                            placeholder="Ej: ¿Qué lotes vencen esta semana?" 
                            className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-700/30 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black min-h-[50px] max-h-[150px] resize-none"
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
