import React, { useState } from 'react';
import { LayoutGrid, Box, Plus, Folder, Bell, Settings, ArrowRightLeft, ChevronRight, X } from 'lucide-react';
import FigmaMovements from './FigmaMovements';
import FigmaForms from './FigmaForms';

const FigmaInventario = ({ lotes = [] }: { lotes?: any[] }) => {
    const [viewMode, setViewMode] = useState<'GRID' | 'DETAIL' | 'FORM'>('GRID');
    const [showModal, setShowModal] = useState(false);
    const [selectedLote, setSelectedLote] = useState<any>(null);

    const openPreview = (lote: any) => {
        setSelectedLote(lote);
        setShowModal(true);
    };

    if (viewMode === 'DETAIL') {
        return <FigmaMovements onBack={() => setViewMode('GRID')} />;
    }

    if (viewMode === 'FORM') {
        return <FigmaForms onBack={() => setViewMode('GRID')} />;
    }

    return (
        <div className="flex gap-8 h-full animate-in fade-in duration-500 relative">
            {/* Modal de Producto (Mockup 6) */}
            {showModal && selectedLote && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 className="font-bold uppercase tracking-tight">Vista Previa: {selectedLote.codigo}</h3>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-10 flex gap-8">
                            <div className="w-48 h-48 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center relative overflow-hidden">
                                <Box size={64} className="opacity-10" />
                                {selectedLote.status === 'CRITICO' && (
                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-tighter">
                                        Crítico
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 space-y-6">
                                <div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Vencimiento</div>
                                    <div className={`text-2xl font-bold mt-1 tracking-tighter ${selectedLote.status === 'CRITICO' ? 'text-red-600' : 'text-black'}`}>
                                        {selectedLote.vencimiento}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Cantidad</label>
                                        <div className="text-sm font-bold border border-gray-200 rounded px-3 py-1 bg-white">{selectedLote.cantidad} KG</div>
                                     </div>
                                     <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Lote</label>
                                        <div className="text-sm font-bold border border-gray-200 rounded px-3 py-1 bg-white">#{selectedLote.lote}</div>
                                     </div>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed italic">"Producto auditado por el sistema Pymetory. Prioridad de despacho: {selectedLote.status === 'CRITICO' ? 'Inmediata (FEFO)' : 'Normal'}."</p>
                                <button className="w-full bg-black text-white py-3 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity">
                                    Gestionar Movimiento
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
                            {['Bodega A', 'Bodega B', 'Cuarentena'].map((name) => (
                                <div key={name} className="flex items-center gap-2 text-gray-400 hover:text-black cursor-pointer transition-colors">
                                    <Folder size={18} />
                                    <span className="text-xs">{name}</span>
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
                        <span className="text-black">Plan de Auditoría</span>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={() => setViewMode('FORM')}
                            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded shadow-sm text-[11px] font-bold uppercase hover:bg-gray-50 transition-all"
                        >
                            <Plus size={14} />
                            <span>Nuevo Ingreso</span>
                        </button>
                    </div>
                </div>

                {/* Grid (Mockup 5 Center) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {lotes.length > 0 ? lotes.map((lote) => (
                        <div key={lote.id} className={`bg-white border ${lote.status === 'CRITICO' ? 'border-red-200 bg-red-50/10' : 'border-gray-200'} rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group relative`}>
                            {lote.status === 'CRITICO' && (
                                <div className="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                                    Crítico
                                </div>
                            )}
                            <div 
                                onClick={() => openPreview(lote)}
                                className="aspect-square bg-gray-50 flex items-center justify-center border-b border-gray-200 cursor-pointer overflow-hidden relative"
                            >
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" className={`opacity-10 group-hover:scale-110 transition-transform ${lote.status === 'CRITICO' ? 'text-red-500' : 'text-black'}`}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span className="text-[10px] font-bold uppercase bg-white px-3 py-1 shadow-sm border border-gray-100 rounded">Auditar Lote</span>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="cursor-pointer" onClick={() => openPreview(lote)}>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{lote.codigo}</div>
                                    <div className="text-sm font-bold mt-1 uppercase tracking-tight">Lote #{lote.lote}</div>
                                    <div className={`text-[11px] font-bold mt-1 uppercase ${lote.status === 'CRITICO' ? 'text-red-500' : 'text-gray-400'}`}>
                                        # CANTIDAD: {lote.cantidad} KG
                                    </div>
                                    <div className="text-[9px] font-medium text-gray-400 uppercase mt-1">Vence: {lote.vencimiento}</div>
                                </div>
                                <div className="flex items-center justify-end gap-5 border-t border-gray-100 pt-4">
                                    <Bell size={18} className={`${lote.status === 'CRITICO' ? 'text-red-400 animate-pulse' : 'text-gray-400'} hover:text-black cursor-pointer transition-colors`} />
                                    <ArrowRightLeft size={18} onClick={() => setViewMode('DETAIL')} className="text-gray-400 hover:text-black cursor-pointer transition-colors" />
                                    <Settings size={18} className="text-gray-400 hover:text-black cursor-pointer transition-colors" />
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            <Box size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium uppercase tracking-widest opacity-40">No hay lotes activos en el sistema</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FigmaInventario;
