import React from 'react';
import { Search, Filter, Box, ArrowRight } from 'lucide-react';

const FigmaSearch = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-6">
                 <h2 className="text-xl font-bold uppercase tracking-tight">Buscar en Inventario</h2>
                 
                 {/* Search Bar (Mockup 7 Top) */}
                 <div className="flex gap-4">
                     <div className="flex-1 relative">
                         <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                         <input 
                            type="text" 
                            placeholder="Nombre del producto, ID, Lote..." 
                            className="w-full bg-white border border-gray-200 rounded-lg pl-12 pr-4 py-4 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                            defaultValue="Auditoría"
                         />
                     </div>
                     <button className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-4 rounded-lg shadow-sm font-bold text-sm hover:bg-gray-50 transition-all">
                        <Filter size={18} />
                        <span>Filtros</span>
                     </button>
                 </div>
            </div>

            {/* Results Grid (Mockup 7 Center) */}
            <div className="space-y-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Resultados encontrados (12)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                            <div className="aspect-square bg-gray-50 rounded mb-4 flex items-center justify-center border border-gray-100">
                                <Box size={32} className="opacity-10" />
                            </div>
                            <div className="text-xs font-bold text-gray-400 mb-1 uppercase">Bodega {i}</div>
                            <div className="text-sm font-bold truncate uppercase">Sustancia {i} v2</div>
                            <div className="mt-4 flex items-center justify-between text-[#111111]/40 group-hover:text-black transition-colors">
                                <span className="text-[10px] font-bold uppercase tracking-widest">Ver Detalles</span>
                                <ArrowRight size={14} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FigmaSearch;
