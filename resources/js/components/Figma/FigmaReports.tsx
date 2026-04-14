import React from 'react';
import { BarChart3, TrendingUp, AlertTriangle, DollarSign, Clock, LayoutGrid } from 'lucide-react';

const FigmaReports = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-8">
                 <BarChart3 size={24} className="opacity-50" />
                 <h2 className="text-xl font-bold uppercase tracking-tight">Reportes</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. Resumen Anual */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <TrendingUp size={14} />
                        <span>Resumen Anual de Ventas</span>
                    </div>
                    <div className="h-24 flex items-end gap-1 px-2">
                        {[40, 70, 45, 90, 65, 80, 50, 85].map((h, i) => (
                            <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-gray-100 rounded-t-sm"></div>
                        ))}
                    </div>
                </div>

                {/* 2. Valor Total */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <DollarSign size={14} />
                        <span>Valor total de inventario</span>
                    </div>
                    <div className="text-3xl font-bold tracking-tighter">$ 245,000.00</div>
                    <div className="text-xs text-green-500 font-bold">+ 12% vs mes anterior</div>
                </div>

                {/* 3. Lotes Materia Prima */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <LayoutGrid size={14} />
                        <span>Lotes materia prima</span>
                    </div>
                    <div className="text-4xl font-bold">124</div>
                    <div className="text-xs text-gray-400">Total de lotes activos</div>
                </div>

                {/* 4. Proximos a vencer */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4 border-l-4 border-l-red-400">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-widest">
                        <AlertTriangle size={14} />
                        <span>Productos próximos a vencer</span>
                    </div>
                    <div className="text-4xl font-bold text-red-500">12</div>
                    <div className="text-xs text-red-400 font-bold">Requiere acción inmediata</div>
                </div>

                {/* 5. Movimientos */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <Clock size={14} />
                        <span>Movimientos de stock</span>
                    </div>
                    <div className="text-4xl font-bold">1,450</div>
                    <div className="text-xs text-gray-400">En los últimos 30 días</div>
                </div>

                {/* 6. Eficiencia */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <TrendingUp size={14} />
                        <span>Eficiencia operativa</span>
                    </div>
                    <div className="text-4xl font-bold">94.2%</div>
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-black w-[94.2%] transition-all"></div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FigmaReports;
