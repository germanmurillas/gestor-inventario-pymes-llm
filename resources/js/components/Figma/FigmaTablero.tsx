import React from 'react';
import { LayoutGrid, FileText, Folder, DollarSign, Clock, Package } from 'lucide-react';

const FigmaTablero = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Resumen de inventario */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Resumen de inventario</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1 shadow-sm border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-[#EFEEF8] p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <FileText size={20} className="text-gray-600" />
                        <div className="text-xs font-medium text-gray-500"># de productos</div>
                    </div>
                    <div className="bg-[#EFEEF8] p-6 flex flex-col items-center justify-center text-center space-y-2 border-l border-r border-gray-200">
                        <Folder size={20} className="text-gray-600" />
                        <div className="text-xs font-medium text-gray-500"># de carpetas</div>
                    </div>
                    <div className="bg-[#EFEEF8] p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <DollarSign size={20} className="text-gray-600" />
                        <div className="text-xs font-medium text-gray-500"># Valor Total</div>
                    </div>
                </div>
            </div>

            {/* Actividad reciente */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Actividad reciente</h3>
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                   <div className="divide-y divide-gray-100">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-gray-300 rounded-sm"></div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold">Title</div>
                                        <div className="text-xs text-gray-400">Description</div>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 font-medium">9:41 AM</div>
                            </div>
                        ))}
                   </div>
                   <button className="w-full py-3 text-xs font-bold text-gray-400 hover:text-black border-t border-gray-100 transition-colors">
                       Ver toda la Actividad
                   </button>
                </div>
            </div>

            {/* Productos Recientes */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Productos Recientes</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex items-center justify-center aspect-video">
                            {/* Placeholder Icon */}
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-20"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                    ))}
                </div>
            </div>

            {/* Nivel de Inventario */}
            <div className="space-y-4 pb-10">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Nivel de Inventario</h3>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 border border-gray-200 rounded flex items-center justify-center">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="opacity-20"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                </div>
                                <div className="text-sm font-medium">Producto {i}</div>
                            </div>
                            <div className="text-sm font-bold text-gray-500"># cantidad</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FigmaTablero;
