import React, { useState, useMemo } from 'react';
import { Search, Filter, Box, ArrowRight, Package } from 'lucide-react';

const FigmaSearch = ({ lotes = [] }: { lotes: any[] }) => {
    const [query, setQuery] = useState('');

    const filteredResults = useMemo(() => {
        if (!query.trim()) return lotes;
        const s = query.toLowerCase();
        return lotes.filter(item => 
            item.codigo?.toLowerCase().includes(s) ||
            item.lote?.toLowerCase().includes(s) ||
            item.material?.name?.toLowerCase().includes(s)
        );
    }, [query, lotes]);

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col gap-6">
                 <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight">Buscador Inteligente</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Explora materiales, lotes y ubicaciones en tiempo real</p>
                 </div>
                 
                 {/* Search Bar */}
                 <div className="flex gap-4">
                     <div className="flex-1 relative">
                         <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <Search size={22} strokeWidth={3} />
                         </div>
                         <input 
                            type="text" 
                            placeholder="Nombre del producto, SKU, No. de Lote..." 
                            className="w-full bg-white border-2 border-slate-100 rounded-3xl pl-20 pr-6 py-6 text-xl shadow-2xl shadow-indigo-100/50 focus:outline-none focus:border-indigo-600/20 transition-all placeholder:text-slate-300 font-medium"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                         />
                     </div>
                 </div>
            </div>

            {/* Results Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {filteredResults.length} Coincidencias encontradas
                    </div>
                </div>

                {filteredResults.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {filteredResults.map((item) => (
                            <div key={item.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Package size={80} />
                                </div>
                                
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center justify-between">
                                        <div className="inline-flex px-3 py-1 bg-slate-900 text-white text-[8px] font-black rounded-full uppercase tracking-widest">
                                            {item.codigo}
                                        </div>
                                        <div className={`text-[8px] font-black uppercase tracking-widest ${item.status === 'CRITICO' ? 'text-red-500' : 'text-green-500'}`}>
                                            {item.status}
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 leading-tight uppercase truncate">{item.material?.name || 'Nombre no disponible'}</h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lote: {item.lote}</p>
                                    </div>

                                    <div className="pt-6 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Existencia</div>
                                            <div className="text-2xl font-black text-slate-900">{item.cantidad} KG</div>
                                        </div>
                                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                                            <ArrowRight size={18} strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-32 flex flex-col items-center justify-center space-y-6 text-slate-300">
                        <Package size={120} strokeWidth={1} className="opacity-20" />
                        <div className="text-center">
                            <p className="text-xl font-black uppercase tracking-tighter text-slate-400">Sin resultados para "{query}"</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest">Verifica el SKU o el número de lote</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FigmaSearch;
