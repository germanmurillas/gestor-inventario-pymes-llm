import React, { useState } from 'react';
import { LayoutGrid, Box, Plus, Folder, Bell, Settings, ArrowRightLeft, ChevronRight, X } from 'lucide-react';
import FigmaMovements from './FigmaMovements';
import FigmaForms from './FigmaForms';

const FigmaInventario = () => {
    const [viewMode, setViewMode] = useState<'GRID' | 'DETAIL' | 'FORM'>('GRID');
    const [showModal, setShowModal] = useState(false);

    if (viewMode === 'DETAIL') {
        return <FigmaMovements onBack={() => setViewMode('GRID')} />;
    }

    if (viewMode === 'FORM') {
        return <FigmaForms onBack={() => setViewMode('GRID')} />;
    }

    return (
        <div className="flex gap-8 h-full animate-in fade-in duration-500 relative">
            {/* Modal de Producto (Mockup 6) */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold uppercase tracking-tight">Vista Previa de Producto</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-10 flex gap-8">
                            <div className="w-48 h-48 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center">
                                <Box size={64} className="opacity-10" />
                            </div>
                            <div className="flex-1 space-y-6">
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Precio Unitario</div>
                                    <div className="text-2xl font-bold mt-1 tracking-tighter">$ 50.00</div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Cantidad</label>
                                        <div className="text-sm font-bold border border-gray-200 rounded px-3 py-1 bg-white">100 KG</div>
                                     </div>
                                     <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Lote</label>
                                        <div className="text-sm font-bold border border-gray-200 rounded px-3 py-1 bg-white">#8492</div>
                                     </div>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed italic">"Descripción breve del producto analizado por el sistema de auditoría Pymetory."</p>
                                <button className="w-full bg-black text-white py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
                                    Editar Información
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Folder Sidebar (Mockup 5 Left) */}
            <aside className="w-64 space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-black font-bold cursor-pointer hover:opacity-70 transition-opacity">
                        <Box size={24} />
                        <span className="text-sm">Todo el inventario</span>
                    </div>
                    
                    <div className="pl-6 space-y-4 font-medium uppercase tracking-tight">
                        <div className="flex items-center gap-2 text-gray-500 font-bold cursor-pointer hover:text-black transition-colors">
                            <Folder size={20} />
                            <span className="text-xs">Inventario Disponible</span>
                        </div>

                        <div className="pl-6 space-y-4 border-l border-gray-200 ml-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-2 text-gray-400 hover:text-black cursor-pointer transition-colors">
                                    <Folder size={18} />
                                    <span className="text-xs">Bodega {i}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Area (Mockup 5 Right) */}
            <div className="flex-1 space-y-8">
                {/* Top Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <Box size={14} />
                        <span>Todo el Inventario</span>
                        <ChevronRight size={12} />
                        <span>Inventario Disponible</span>
                        <ChevronRight size={12} />
                        <span className="text-black">Bodega 1</span>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={() => setViewMode('FORM')}
                            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded shadow-sm text-[11px] font-bold uppercase hover:bg-gray-50 transition-all"
                        >
                            <Plus size={14} />
                            <span>Nuevo Producto</span>
                        </button>
                        <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded shadow-sm text-[11px] font-bold uppercase hover:bg-gray-50 transition-all">
                            <Folder size={14} />
                            <span>Nueva Carpeta</span>
                        </button>
                    </div>
                </div>

                {/* Grid (Mockup 5 Center) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                            <div 
                                onClick={() => setShowModal(true)}
                                className="aspect-square bg-gray-50 flex items-center justify-center border-b border-gray-200 cursor-pointer overflow-hidden relative"
                            >
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="opacity-10 group-hover:scale-110 transition-transform"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span className="text-[10px] font-bold uppercase bg-white px-3 py-1 shadow-sm border border-gray-100 rounded">Vista Previa</span>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="cursor-pointer" onClick={() => setViewMode('DETAIL')}>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Body</div>
                                    <div className="text-sm font-bold mt-1 uppercase tracking-tight">Producto {i}</div>
                                    <div className="text-[11px] font-bold text-gray-400 mt-1 uppercase"># CANTIDAD: 124 KG</div>
                                </div>
                                <div className="flex items-center justify-end gap-5 border-t border-gray-100 pt-4">
                                    <Bell size={18} className="text-gray-400 hover:text-black cursor-pointer transition-colors" />
                                    <ArrowRightLeft size={18} onClick={() => setViewMode('DETAIL')} className="text-gray-400 hover:text-black cursor-pointer transition-colors" />
                                    <Settings size={18} className="text-gray-400 hover:text-black cursor-pointer transition-colors" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FigmaInventario;
