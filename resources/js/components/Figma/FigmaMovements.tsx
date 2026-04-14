import React from 'react';
import { ArrowLeft, Clock, Package, User, Hash, Calendar } from 'lucide-react';

const FigmaMovements = ({ onBack }: { onBack: () => void }) => {
    return (
        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            {/* Header (Mockup 13 Top) */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight">Detalle de Producto / Movimientos</h2>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                        <span>Lote #8492</span>
                        <span className="opacity-30">•</span>
                        <span>Bodega 1</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Product Stats (Mockup 13 Left) */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm space-y-6">
                        <div className="aspect-square bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center">
                            <Package size={64} className="opacity-10" />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nombre Completo</label>
                                <div className="text-sm font-bold uppercase mt-1">Sustancia Química Pym-01</div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cantidad</label>
                                    <div className="text-sm font-bold mt-1 uppercase">1,250 KG</div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valor</label>
                                    <div className="text-sm font-bold mt-1 uppercase">$ 4,500.00</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Movements List (Mockup 13 Right) */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">Historial de Movimientos</h3>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Tipo</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Usuario</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Fecha</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase text-[10px] tracking-widest">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${i % 2 === 0 ? 'bg-red-400' : 'bg-green-400'}`}></div>
                                                <span className="font-bold uppercase tracking-tight">{i % 2 === 0 ? 'Salida' : 'Ingreso'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-medium font-mono text-xs">user_admin_0{i}</td>
                                        <td className="px-6 py-4 text-gray-400 text-xs">1{i} Oct 2026</td>
                                        <td className="px-6 py-4 text-gray-700 font-bold">2{i}0 KG</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FigmaMovements;
