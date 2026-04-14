import React from 'react';
import { Tag, Box, Filter, Plus } from 'lucide-react';

const FigmaLabels = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Tag size={24} className="opacity-50" />
                    <h2 className="text-xl font-bold uppercase tracking-tight">Etiquetas / Tags</h2>
                </div>
                <button className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-lg shadow-sm font-bold text-sm hover:opacity-90 transition-opacity">
                    <Plus size={18} />
                    <span>Nueva Etiqueta</span>
                </button>
            </div>

            {/* Labels Filter Row (Mockup 8 Top) */}
            <div className="flex flex-wrap gap-2">
                {['Todo', 'Crítico', 'Vencimiento Próximo', 'Químicos', 'Sólidos', 'Metales'].map((label, i) => (
                    <button 
                        key={i} 
                        className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${i === 2 ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-gray-200 text-gray-500 hover:border-black hover:text-black'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Grid with Labels (Mockup 8 Center) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pt-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow relative">
                        <div className="absolute top-4 right-4 flex gap-1">
                            <span className={`w-2 h-2 rounded-full ${i % 3 === 0 ? 'bg-red-500' : 'bg-green-500'}`}></span>
                        </div>
                        <div className="aspect-square bg-gray-50 rounded mb-4 flex items-center justify-center border border-gray-100">
                            <Box size={32} className="opacity-10" />
                        </div>
                        <div className="space-y-2">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Etiqueta: {i % 2 === 0 ? 'Químico' : 'Vence Próx'}</div>
                            <div className="text-sm font-bold truncate uppercase tracking-tight">Material Ref {i}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FigmaLabels;
