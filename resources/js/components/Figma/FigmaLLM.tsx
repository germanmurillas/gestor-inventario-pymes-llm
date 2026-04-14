import React, { useState } from 'react';
import { MessageSquare, Send, User, Bot, Search, Plus, Filter } from 'lucide-react';

const FigmaLLM = () => {
    const [messages, setMessages] = useState([
        { id: 1, role: 'user', content: '¿Cuáles son los productos con stock crítico?' },
        { id: 2, role: 'bot', content: 'Analizando inventario... Actualmente tienes 12 productos con stock crítico (menos del 10% de su capacidad ideal). Los más urgentes son: Lote #8492 (Vence en 48h) y Producto A (Stock: 5 unidades).' },
        { id: 3, role: 'user', content: 'Genera un resumen del valor total por bodega.' },
        { id: 4, role: 'bot', content: 'Generando reporte... \nBodega 1: $120,000 \nBodega 2: $85,000 \nBodega 3: $40,000 \nTotal Global: $245,000.' },
    ]);

    return (
        <div className="flex h-full gap-8 animate-in fade-in duration-500">
            {/* Chat List Sidebar (Mockup 10 Left) */}
            <aside className="w-80 border-r border-gray-200 pr-8 space-y-6">
                 <div className="flex items-center justify-between">
                     <h2 className="text-xl font-bold uppercase tracking-tight">Chat LLM</h2>
                     <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm">
                         <Plus size={18} />
                     </button>
                 </div>

                 <div className="relative">
                     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                     <input 
                        type="text" 
                        placeholder="Buscar conversaciones..." 
                        className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                     />
                 </div>

                 <div className="space-y-2">
                     {[1, 2, 3].map((i) => (
                         <div key={i} className={`p-4 rounded-lg border transition-all cursor-pointer ${i === 1 ? 'bg-white border-gray-200 shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}>
                             <div className="text-sm font-bold truncate">Auditoría Stock Crítico {i > 1 ? `#${i}` : ''}</div>
                             <div className="text-xs opacity-60 mt-1 truncate">Hoy - Analizando inventario...</div>
                         </div>
                     ))}
                 </div>
            </aside>

            {/* Chat Window (Mockup 10 Center) */}
            <div className="flex-1 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <header className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white">
                            <Bot size={18} />
                        </div>
                        <div>
                            <div className="text-sm font-bold">Asistente Pymetory</div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">En línea</span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-6 space-y-6">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-xl text-sm ${msg.role === 'user' ? 'bg-[#111111] text-white shadow-md' : 'bg-gray-100 text-[#111111]'}`}>
                                <div className="font-bold text-[10px] mb-1 uppercase opacity-50 tracking-widest">{msg.role}</div>
                                <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <footer className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="relative">
                        <textarea 
                            placeholder="Escribe un comando o pregunta..." 
                            className="w-full bg-white border border-gray-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black min-h-[50px] resize-none"
                            rows={1}
                        />
                        <button className="absolute right-3 top-1/2 -translate-y-1/2 bg-black text-white p-2 rounded-lg hover:opacity-90 transition-opacity">
                            <Send size={16} />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default FigmaLLM;
