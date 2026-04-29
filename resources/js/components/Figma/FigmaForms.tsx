import React, { useEffect } from 'react';
import { ArrowLeft, Save, Info, Package, DollarSign, Calendar, Tag, Loader2 } from 'lucide-react';
import { useForm } from '@inertiajs/react';

const FigmaForms = ({ onBack, initialBodega = null, bodegas = [] }: { onBack: () => void, initialBodega?: any, bodegas?: any[] }) => {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        code: '',
        bodega_id: initialBodega?.id || (bodegas[0]?.id || ''),
        stock_initial: 0,
        expiration_date: '',
        batch_number: '',
        description: ''
    });

    // Sincronizar bodega inicial si cambia
    useEffect(() => {
        if (initialBodega) {
            setData('bodega_id', initialBodega.id);
        }
    }, [initialBodega]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/inventory/material', {
            onSuccess: () => {
                reset();
                onBack();
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto pb-20">
            {/* Header (Mockup 14 Top) */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button 
                        type="button"
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold uppercase tracking-tight">Registro de Nuevo Producto</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Alta de materiales en Kardex</p>
                    </div>
                </div>
                <button 
                    type="submit"
                    disabled={processing}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-2xl shadow-lg glow-indigo font-bold text-sm hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                >
                    {processing ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span>{processing ? 'Guardando...' : 'Guardar Producto'}</span>
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-sm space-y-10">
                {errors.error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-pulse">
                        <Tag size={16} />
                        <span>{errors.error}</span>
                    </div>
                )}
                {/* Form Sections (Mockup 14) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    
                    {/* General Info */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                            <Info size={14} />
                            <span>Información General</span>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-tight">Nombre del Producto</label>
                                <input 
                                    type="text" 
                                    required
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="Ej: Harina de Trigo Especial" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                />
                                {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-tight">Código</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={data.code}
                                        onChange={e => setData('code', e.target.value.toUpperCase())}
                                        placeholder="MAT-00X" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all uppercase" 
                                    />
                                    {errors.code && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.code}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-tight">Lote Interno</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={data.batch_number}
                                        onChange={e => setData('batch_number', e.target.value)}
                                        placeholder="L-0000" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                    />
                                    {errors.batch_number && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.batch_number}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-tight">Ubicación / Bodega</label>
                                <select 
                                    required
                                    value={data.bodega_id}
                                    onChange={e => setData('bodega_id', e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                                >
                                    <option value="">Seleccione una bodega...</option>
                                    {bodegas.map((b: any) => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                                    ))}
                                </select>
                                {errors.bodega_id && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.bodega_id}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-tight">Descripción del Material</label>
                                <textarea 
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    placeholder="Detalles sobre el proveedor o uso comercial..." 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none transition-all" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stock & Timeline */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                            <Package size={14} />
                            <span>Existencias Iniciales</span>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-tight">Stock Inicial</label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        required
                                        min="0"
                                        step="0.01"
                                        value={data.stock_initial}
                                        onChange={e => setData('stock_initial', parseFloat(e.target.value))}
                                        placeholder="0.00" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" 
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-tighter">KG</span>
                                </div>
                                {errors.stock_initial && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.stock_initial}</p>}
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-700 uppercase tracking-tight">Fecha de Vencimiento (FEFO)</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="date" 
                                        required
                                        value={data.expiration_date}
                                        onChange={e => setData('expiration_date', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" 
                                    />
                                </div>
                                {errors.expiration_date && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.expiration_date}</p>}
                                <p className="text-[9px] text-slate-400 italic">Crítico para el cálculo de salida prioritaria.</p>
                            </div>

                            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50 space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                    <Tag size={14} />
                                    <span>Previsualización de Lote</span>
                                </div>
                                <div className="text-[10px] text-indigo-900/60 leading-relaxed font-bold uppercase tracking-tight">
                                    Al guardar, el sistema generará automáticamente un registro de entrada en el Kardex para el lote <span className="text-indigo-600">#{data.batch_number || '---'}</span> con <span className="text-indigo-600">{data.stock_initial || 0} KG</span>.
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="pt-10 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center text-white">
                            <Info size={12} />
                        </div>
                        <span className="font-bold">Todos los campos son obligatorios para la trazabilidad.</span>
                    </div>
                    <button 
                        type="button"
                        onClick={onBack}
                        className="text-[10px] font-black text-red-400 hover:text-red-600 transition-colors uppercase tracking-[0.2em]"
                    >
                        Cancelar Registro
                    </button>
                </div>
            </div>
        </form>
    );
};

export default FigmaForms;
