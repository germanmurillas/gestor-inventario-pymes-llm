import React, { useState } from 'react';
import { LayoutGrid, Box, Plus, Folder, Bell, Settings, ArrowRightLeft, ChevronRight, X, Warehouse, Ruler } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import FigmaMovements from './FigmaMovements';
import FigmaForms from './FigmaForms';
import FigmaConsumeForm from './FigmaConsumeForm';

const FigmaInventario = ({ lotes = [], bodegas = [], user }: { lotes?: any[], bodegas?: any[], user?: any }) => {
    const [viewMode, setViewMode] = useState<'GRID' | 'DETAIL' | 'FORM' | 'CONSUME'>('GRID');
    const [showModal, setShowModal] = useState(false);
    const [showBodegaModal, setShowBodegaModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedLote, setSelectedLote] = useState<any>(null);
    const [selectedBodega, setSelectedBodega] = useState<any>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        code: '',
        capacity: 1000,
        description: ''
    });

    const openPreview = (lote: any) => {
        setSelectedLote(lote);
        setShowModal(true);
    };

    const submitBodega = (e: React.FormEvent) => {
        e.preventDefault();
        post('/bodegas', {
            onSuccess: () => {
                setShowBodegaModal(false);
                reset();
            }
        });
    };

    // Lógica de filtrado dinámico por bodega
    const filteredLotes = selectedBodega 
        ? lotes.filter((l: any) => l.bodega === selectedBodega.name)
        : lotes;

    if (viewMode === 'DETAIL') {
        return <FigmaMovements onBack={() => setViewMode('GRID')} />;
    }

    if (viewMode === 'FORM') {
        return <FigmaForms onBack={() => setViewMode('GRID')} initialBodega={selectedBodega} bodegas={bodegas} />;
    }

    if (viewMode === 'CONSUME') {
        return <FigmaConsumeForm onBack={() => setViewMode('GRID')} lote={selectedLote} />;
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
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => {
                                            setShowModal(false);
                                            setViewMode('CONSUME');
                                        }}
                                        className="flex-1 bg-obsidiana text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-lg shadow-gray-200"
                                    >
                                        Gestionar Movimiento
                                    </button>
                                    
                                    {user?.role === 'admin' && (
                                        <button 
                                            onClick={() => {
                                                setShowModal(false);
                                                setShowAdjustModal(true);
                                            }}
                                            className="px-6 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
                                            title="Conciliación de Stock"
                                        >
                                            Conciliar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Conciliación (Ajuste Manual) */}
            {showAdjustModal && selectedLote && (
                <AdjustModal 
                    lote={selectedLote} 
                    onClose={() => setShowAdjustModal(false)} 
                />
            )}

            {/* Modal Nueva Bodega */}
            {showBodegaModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-obsidiana/40 backdrop-blur-xl p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white/20 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight font-display">Nueva Ubicación</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Crear carpeta de inventario</p>
                            </div>
                            <button onClick={() => setShowBodegaModal(false)} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 flex items-center justify-center rounded-2xl hover:bg-slate-50 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={submitBodega} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nombre de la Bodega</label>
                                    <input 
                                        type="text" 
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        placeholder="Ej: Bodega Norte, Cuarentena..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                    {errors.name && <div className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.name}</div>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Código</label>
                                        <input 
                                            type="text" 
                                            value={data.code}
                                            onChange={e => setData('code', e.target.value.toUpperCase())}
                                            placeholder="B-001"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all uppercase"
                                        />
                                        {errors.code && <div className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.code}</div>}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Capacidad (KG)</label>
                                        <input 
                                            type="number" 
                                            value={data.capacity}
                                            onChange={e => setData('capacity', parseInt(e.target.value))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={processing}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg glow-indigo disabled:opacity-50"
                            >
                                {processing ? 'Sincronizando...' : 'Crear Ubicación'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Folder Sidebar (Mockup 5 Left) */}
            <aside className="w-64 space-y-6">
                <div className="space-y-4">
                    <div 
                        onClick={() => setSelectedBodega(null)}
                        className={`flex items-center gap-2 p-3 rounded-2xl cursor-pointer transition-all font-display group ${!selectedBodega ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-black hover:bg-slate-50'}`}
                    >
                        <Box size={20} className={!selectedBodega ? 'text-white' : 'text-indigo-600 group-hover:scale-110 transition-transform'} />
                        <span className="text-xs font-black uppercase tracking-widest">Todo el inventario</span>
                    </div>
                    
                    <div className="pl-2 space-y-4 font-black uppercase tracking-tight">
                        <div className="flex items-center justify-between group px-2">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Folder size={18} />
                                <span className="text-[10px] tracking-widest">Disponible</span>
                            </div>
                            <button 
                                onClick={() => setShowBodegaModal(true)}
                                className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                                title="Nueva Carpeta / Bodega"
                            >
                                <Plus size={14} />
                            </button>
                        </div>

                        <div className="pl-4 space-y-2 border-l-2 border-slate-100 ml-2">
                            {bodegas.length > 0 ? bodegas.map((bodega: any) => (
                                <div 
                                    key={bodega.code} 
                                    onClick={() => setSelectedBodega(bodega)}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all group ${selectedBodega?.code === bodega.code ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${selectedBodega?.code === bodega.code ? 'bg-indigo-400 animate-pulse' : 'bg-slate-200 group-hover:bg-indigo-500'} transition-colors`}></div>
                                    <span className="text-[10px] font-black tracking-widest uppercase truncate">{bodega.name}</span>
                                </div>
                            )) : (
                                <div className="text-[9px] text-slate-300 italic px-2">No hay bodegas realistas.</div>
                            )}
                            
                            {/* Visual Hint for quarantine mentioned by user */}
                            {!bodegas.find((b: any) => b.name.toLowerCase().includes('cuarentena')) && (
                                <div className="flex items-center gap-3 p-2 text-slate-300 hover:text-red-400 cursor-pointer transition-all border-t border-slate-50 pt-2 opacity-60">
                                    <Bell size={12} />
                                    <span className="text-[10px] font-bold tracking-widest uppercase">Cuarentena</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Area (Mockup 5 Right) */}
            <div className="flex-1 space-y-8">
                {/* Top Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">
                        <Box size={14} />
                        <span>Inventario</span>
                        <ChevronRight size={12} />
                        <span className="text-indigo-600 italic">{selectedBodega ? selectedBodega.name : 'Vuelo Global'}</span>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={() => setViewMode('FORM')}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg glow-indigo text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95"
                        >
                            <Plus size={14} />
                            <span>Nuevo Ingreso {selectedBodega ? `en ${selectedBodega.code}` : ''}</span>
                        </button>
                    </div>
                </div>

                {/* Grid (Mockup 5 Center) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredLotes.length > 0 ? filteredLotes.map((lote: any) => (
                        <div key={lote.id} className={`glass-morphism rounded-[2.5rem] overflow-hidden group relative transition-all duration-500 hover:-translate-y-2 ${lote.status === 'CRITICO' ? 'border-red-100/50 bg-red-50/5' : 'hover:border-indigo-100'}`}>
                            {lote.status === 'CRITICO' && (
                                <div className="absolute top-4 right-4 bg-red-600 text-white text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest animate-pulse z-10">
                                    Crítico
                                </div>
                            )}
                            <div 
                                onClick={() => openPreview(lote)}
                                className="aspect-[4/3] bg-slate-50/50 flex items-center justify-center border-b border-slate-100 cursor-pointer overflow-hidden relative"
                            >
                                <Warehouse size={64} className={`opacity-5 group-hover:scale-110 transition-all duration-700 ${lote.status === 'CRITICO' ? 'text-red-500' : 'text-indigo-600'}`} />
                                <div className="absolute inset-0 bg-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-white/50 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Auditar Detalle</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 space-y-5">
                                <div className="cursor-pointer" onClick={() => openPreview(lote)}>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none font-display">{lote.codigo}</div>
                                    <div className="text-lg font-black mt-2 text-slate-900 tracking-tight font-display">Batch #{lote.lote}</div>
                                    
                                    <div className="flex items-center gap-2 mt-4">
                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest ${lote.status === 'CRITICO' ? 'text-red-500' : 'text-slate-600'}`}>
                                            {lote.cantidad} KG DISPONIBLES
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Exp: {lote.vencimiento} · {lote.bodega}</div>
                                </div>
                                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                                    <div className="flex gap-4">
                                        <Bell size={18} className={`${lote.status === 'CRITICO' ? 'text-red-400 animate-pulse' : 'text-slate-400'} hover:text-indigo-600 cursor-pointer transition-colors`} />
                                        <ArrowRightLeft size={18} onClick={() => setViewMode('DETAIL')} className="text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" />
                                    </div>
                                    <Settings size={18} className="text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors" />
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-300 glass-morphism rounded-[3rem] border-2 border-dashed border-slate-200">
                            <Box size={56} className="mb-6 opacity-20 text-indigo-600" />
                            <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40 text-slate-900 text-center">Sin existencias en {selectedBodega?.name || 'inventario'}<br/><span className="text-[10px] font-bold">Ubicación vacía o filtrada</span></p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Subcomponente para el modal de ajuste (Conciliación)
const AdjustModal = ({ lote, onClose }: { lote: any, onClose: () => void }) => {
    const { data, setData, patch, processing, errors, reset } = useForm({
        new_quantity: lote.cantidad,
        reason: ''
    });

    const submitAdjust = (e: React.FormEvent) => {
        e.preventDefault();
        patch(`/inventory/adjust/${lote.id}`, {
            onSuccess: () => {
                onClose();
                reset();
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-obsidiana/40 backdrop-blur-xl p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl border border-white/20 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight font-display">Conciliación Física</h3>
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Ajuste de Stock: {lote.codigo}</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 bg-white border border-slate-200 text-slate-400 flex items-center justify-center rounded-2xl hover:bg-slate-50 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={submitAdjust} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div className="text-[10px] font-black text-slate-400 uppercase">Stock actual en sistema</div>
                            <div className="text-2xl font-black text-slate-900">{lote.cantidad} KG</div>
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Stock Físico Real (KG)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                value={data.new_quantity}
                                onChange={e => setData('new_quantity', parseFloat(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-xl font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                            {errors.new_quantity && <div className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.new_quantity}</div>}
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Motivo del Ajuste</label>
                            <textarea 
                                value={data.reason}
                                onChange={e => setData('reason', e.target.value)}
                                placeholder="Indica por qué cambió el stock (ej: pérdida por humedad, error de pesaje...)"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                                required
                            />
                            {errors.reason && <div className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.reason}</div>}
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={processing}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg glow-red disabled:opacity-50"
                    >
                        {processing ? 'Sincronizando...' : 'Corregir Inventario'}
                    </button>
                    <p className="text-[9px] text-slate-400 text-center italic">Esta acción registrará un movimiento de ajuste en el Kardex para auditoría.</p>
                </form>
            </div>
        </div>
    );
};

export default FigmaInventario;
