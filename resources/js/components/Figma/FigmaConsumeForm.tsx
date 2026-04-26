import React from 'react';
import { ArrowLeft, MinusCircle, Info, Tag, Loader2, AlertTriangle, Truck } from 'lucide-react';
import { useForm } from '@inertiajs/react';

interface FigmaConsumeFormProps {
    onBack: () => void;
    lote: any;
}

const FigmaConsumeForm = ({ onBack, lote }: FigmaConsumeFormProps) => {
    const { data, setData, post, processing, errors, reset } = useForm({
        quantity: 0,
        reason: 'produccion',
        description: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/inventory/lote/${lote.id}/consume`, {
            onSuccess: () => {
                reset();
                onBack();
            }
        });
    };

    const percentage = Math.min((data.quantity / lote.quantity) * 100, 100);

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto pb-20">
            {/* Header */}
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
                        <h2 className="text-xl font-bold uppercase tracking-tight">Despacho de Material</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Salida de inventario y actualización de Kardex</p>
                    </div>
                </div>
                <button 
                    type="submit"
                    disabled={processing || data.quantity <= 0 || data.quantity > lote.quantity}
                    className="flex items-center gap-2 bg-obsidiana text-white px-8 py-3 rounded-2xl shadow-lg font-bold text-sm hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                >
                    {processing ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
                    <span>{processing ? 'Sincronizando...' : 'Registrar Salida'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left: Summary and Context */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-obsidiana text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 opacity-5">
                            <Truck size={200} />
                        </div>
                        
                        <div className="relative z-10 space-y-6">
                            <div>
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Producto Seleccionado</div>
                                <div className="text-xl font-black mt-1 leading-tight">{lote.codigo}</div>
                                <div className="text-[10px] font-bold text-indigo-400 uppercase mt-1">Lote #{lote.lote}</div>
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Stock Disponible</div>
                                <div className="text-3xl font-black mt-1">{lote.cantidad} <span className="text-xs text-white/40">KG</span></div>
                            </div>

                            <div className="pt-6 border-t border-white/10 space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Proyección de Salida</div>
                                    <div className="text-xs font-bold text-indigo-400">-{data.quantity} KG</div>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 transition-all duration-500" 
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                                <div className="text-[9px] text-white/30 italic">
                                    Stock remanente: {(lote.cantidad - data.quantity).toFixed(2)} KG
                                </div>
                            </div>
                        </div>
                    </div>

                    {lote.status === 'CRITICO' && (
                        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex gap-4 items-start">
                            <AlertTriangle className="text-red-500 shrink-0" size={20} />
                            <div>
                                <div className="text-[10px] font-black text-red-600 uppercase tracking-widest">Prioridad FEFO</div>
                                <p className="text-[10px] text-red-500 font-bold leading-tight mt-1 uppercase">Este lote está próximo a vencer. Se recomienda despacharlo con prioridad.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Form Actions */}
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
                            <MinusCircle size={14} />
                            <span>Detalles del Despacho</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-tight">Cantidad a Retirar (KG)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            required
                                            value={data.quantity}
                                            onChange={e => setData('quantity', parseFloat(e.target.value))}
                                            placeholder="0.00"
                                            max={lote.cantidad}
                                            className={`w-full bg-slate-50 border ${errors.quantity ? 'border-red-500' : 'border-slate-200'} rounded-2xl px-5 py-4 text-lg font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
                                        />
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Máximo</span>
                                            <span className="text-[10px] font-black text-indigo-600">{lote.cantidad} KG</span>
                                        </div>
                                    </div>
                                    {errors.quantity && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.quantity}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-tight">Motivo del Despacho</label>
                                    <select 
                                        required
                                        value={data.reason}
                                        onChange={e => setData('reason', e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="produccion">⚙️ Consumo para Producción</option>
                                        <option value="venta">📦 Despacho por Venta</option>
                                        <option value="desperdicio">🗑️ Baja / Desperdicio</option>
                                        <option value="ajuste">🔄 Ajuste Manual de Salida</option>
                                    </select>
                                    {errors.reason && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.reason}</p>}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2 h-full flex flex-col">
                                    <label className="text-xs font-black text-gray-700 uppercase tracking-tight">Descripción / Observaciones</label>
                                    <textarea 
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        placeholder="Indica el número de orden de producción o cualquier detalle relevante..."
                                        className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:italic"
                                    />
                                    {errors.description && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.description}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50 flex gap-4 items-center">
                            <Info size={18} className="text-indigo-400 shrink-0" />
                            <p className="text-[10px] text-indigo-900/60 font-bold uppercase tracking-tight leading-relaxed">
                                Esta acción es irreversible. Al procesar el despacho, el sistema actualizará el stock físico y dejará un rastro en el historial para auditoría.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <Tag size={14} className="text-indigo-600" />
                    <span>Transacción Protegida por Pymetory Core</span>
                </div>
                <button 
                    type="button" 
                    onClick={onBack}
                    className="hover:text-red-500 transition-colors"
                >
                    Cancelar Operación
                </button>
            </div>
        </form>
    );
};

export default FigmaConsumeForm;
