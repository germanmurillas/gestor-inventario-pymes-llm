import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, User, Bot, Search, Plus, Filter, Loader2, ChevronDown } from 'lucide-react';
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
    const [ragInfo, setRagInfo] = useState<{model:string,source:string,key_name:string}>({model:'—',source:'local',key_name:'Ollama Local'});
    const [selectedModel, setSelectedModel] = useState('gemma3:4b');
    const [selectedSource, setSelectedSource] = useState('local');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [models, setModels] = useState<{local:string[],opencode:string[]}>({local:[],opencode:[]});
    // FIX-UI: true cuando la seleccion NO se pudo persistir => el pill se marca en rojo
    // en vez de mostrar un modelo que el backend no usa.
    const [modelDirty, setModelDirty] = useState(false);
    const [canChangeModel, setCanChangeModel] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    // FIX-UI: el dropdown solo se cerraba al elegir un modelo; quedaba tapando
    // el texto de la respuesta del chat si el usuario hacía click en otro lado.
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!dropdownOpen) return;
        const onDocClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setDropdownOpen(false); };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onEsc);
        };
    }, [dropdownOpen]);

    const changeModel = async (source: string, model: string) => {
        const prevSource = selectedSource;
        const prevModel  = selectedModel;
        setSelectedSource(source);
        setSelectedModel(model);
        setDropdownOpen(false);
        try {
            const r = await axios.put('/settings', { settings: { llm_modelo: model, llm_source: source } });
            // FIX-UI: el endpoint puede responder 200 sin haber escrito nada -> verificar
            if (r.data?.success === false) throw new Error(r.data?.message || 'no persistido');
            setModelDirty(false);
        } catch (e: any) {
            // FIX-UI: antes 'catch {}' se comía el 403 (PUT /settings es role:admin)
            // y el pill quedaba mintiendo. Ahora revertimos y avisamos en la UI.
            setSelectedSource(prevSource);
            setSelectedModel(prevModel);
            setModelDirty(true);
            const motivo = e?.response?.status === 403
                ? 'Solo un administrador puede cambiar el modelo LLM.'
                : (e?.response?.data?.message || 'No se pudo guardar la selección.');
            setMessages(prev => [...prev, { id: Date.now() + 2, role: 'bot', content: `> AVISO: ${motivo} El motor sigue usando ${prevSource} · ${prevModel}.` }]);
        }
    };

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
        axios.get('/api/llm-models').then(r => {
            setModels(r.data);
            // FIX-UI: antes se pintaba local[0] (p.ej. qwen3:30b) como modelo activo,
            // aunque settings.llm_modelo fuera otro. Ahora sincronizamos con la DB.
            if (r.data.active_source) setSelectedSource(r.data.active_source);
            const activo = r.data.effective_model || r.data.active_model;
            if (activo) setSelectedModel(activo);
            setCanChangeModel(r.data.can_change_model !== false);
        }).catch(() => {});
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

            setRagInfo({ model: response.data.model || '—', source: response.data.source || 'local', key_name: response.data.key_name || '—' });
            // FIX-UI: si el backend inferenció con otro modelo (fallback, api_keys),
            // el pill se corrige solo en vez de seguir mostrando la selección teórica.
            if (response.data.model && response.data.model !== selectedModel) {
                setSelectedModel(response.data.model);
                setSelectedSource(response.data.source || selectedSource);
            }

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
                        className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-700/30 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                                : 'bg-slate-900/80 backdrop-blur-xl border-slate-700/40 hover:border-slate-600'
                            }`}
                         >
                             <div className="text-sm font-bold truncate text-slate-300">{s.session_title || 'Nueva Consulta'}</div>
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
                <header className="px-6 py-4 border-b border-slate-700/40 flex items-center justify-between bg-slate-800/40 relative z-20">
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
                                {!isThinking && ragInfo.model !== '—' && (
                                    <span className="text-[09px] font-mono text-gray-500 ml-2 truncate max-w-[280px]" title={`${ragInfo.model} · ${ragInfo.source} · ${ragInfo.key_name}`}>
                                        {ragInfo.model} <span className="text-[#E63B2E]">·</span> {ragInfo.source} <span className="text-[#E63B2E]">·</span> {ragInfo.key_name}
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* FIX-UI: ref para click-outside (cerrar al pulsar fuera) */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => canChangeModel && setDropdownOpen(!dropdownOpen)}
                                aria-haspopup="listbox"
                                aria-expanded={dropdownOpen}
                                aria-label={`Modelo activo: ${selectedSource} ${selectedModel}. Cambiar modelo`}
                                title={modelDirty ? 'No se pudo guardar la selección — el motor sigue usando el modelo anterior' : `Modelo persistido en settings: ${selectedModel}`}
                                className={`flex items-center gap-1.5 bg-slate-950 border rounded-md px-2.5 py-1 text-[10px] font-bold text-slate-200 transition-colors ${modelDirty ? 'border-[#E63B2E]' : 'border-slate-600 hover:border-slate-400'}`}
                            >
                                <span className="text-[#E63B2E] uppercase tracking-wider">{selectedSource === 'opencode' ? 'OPENCODE' : 'LOCAL'}</span>
                                <span className="text-slate-500">·</span>
                                <span className="truncate max-w-[120px]">{selectedModel}</span>
                                {modelDirty && <span className="text-[#E63B2E] font-black" aria-hidden="true">!</span>}
                                <ChevronDown size={12} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {dropdownOpen && (
                                <div
                                    role="listbox"
                                    aria-label="Seleccionar modelo LLM"
                                    className="absolute right-0 top-full mt-2 z-50 bg-[#0b0d13] border border-slate-600 rounded-lg shadow-2xl min-w-[240px] max-h-[min(60vh,420px)] overflow-y-auto custom-scrollbar"
                                >
                                    <div className="sticky top-0 z-10 bg-slate-800/95 backdrop-blur-sm text-[10px] leading-4 font-black uppercase tracking-widest text-slate-300 px-3 py-2 border-b border-slate-600">LOCAL · Ollama</div>
                                    {models.local.map(m => (
                                        <button
                                            key={m}
                                            role="option"
                                            aria-selected={selectedSource === 'local' && selectedModel === m}
                                            onClick={() => changeModel('local', m)}
                                            className={`w-full text-left px-3 py-2 text-[11px] text-slate-200 hover:bg-slate-700 transition-colors ${selectedSource === 'local' && selectedModel === m ? 'bg-slate-700 border-l-2 border-[#E63B2E] font-bold' : ''}`}
                                        >{m}</button>
                                    ))}
                                    <div className="sticky z-10 bg-slate-800/95 backdrop-blur-sm text-[10px] leading-4 font-black uppercase tracking-widest text-slate-300 px-3 py-2 border-y border-slate-600">OPENCODE · Remoto · $0</div>
                                    {models.opencode.map(m => (
                                        <button
                                            key={m}
                                            role="option"
                                            aria-selected={selectedSource === 'opencode' && selectedModel === m}
                                            onClick={() => changeModel('opencode', m)}
                                            className={`w-full text-left px-3 py-2 text-[11px] text-slate-200 hover:bg-slate-700 transition-colors ${selectedSource === 'opencode' && selectedModel === m ? 'bg-slate-700 border-l-2 border-[#E63B2E] font-bold' : ''}`}
                                        >{m}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div ref={scrollRef} className="flex-1 overflow-auto p-6 space-y-6 scroll-smooth">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-xl text-sm ${msg.role === 'user' ? 'pm-panel2-plain pm-accent-fg shadow-md' : 'pm-panel pm-text pm-border border shadow-sm'}`}>
                                <div className="font-bold text-[10px] mb-1 uppercase tracking-widest pm-text-muted">{msg.role === 'user' ? 'Germán' : 'Pymetory LLM'}</div>
                                <div className="leading-relaxed whitespace-pre-wrap font-mono text-sm">{msg.content}</div>
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-slate-800/50 border border-slate-700/40 p-4 rounded-xl flex items-center gap-3">
                                <Loader2 size={16} className="animate-spin text-slate-200" />
                                <span className="text-xs font-bold uppercase tracking-widest opacity-40">Escaneando Lotes...</span>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-4 border-t border-slate-700/40 bg-slate-800/40">
                    <div className="relative">
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                            placeholder="Ej: ¿Qué lotes vencen esta semana?" 
                            className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-700/30 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[50px] max-h-[150px] resize-none"
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
