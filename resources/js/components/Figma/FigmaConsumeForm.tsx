import React from 'react';
import { ArrowLeft, MinusCircle, Info, Tag, Loader2, AlertTriangle, Truck, Camera, Lightbulb } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import FigmaFefoBadge from './FigmaFefoBadge';

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
        <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-right-4 duration-500 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button aria-label="Volver" 
                        type="button"
                        onClick={onBack}
                        className="p-2 hover:bg-slate-800/30 rounded-lg transition-colors border border-slate-700/30 shadow-sm"
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
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Producto Seleccionado</div>
                                <div className="text-xl font-black mt-1 leading-tight">{lote.codigo}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="text-[10px] font-bold text-indigo-400 uppercase">Lote #{lote.lote}</div>
                                    {lote.days_until_expiration !== undefined && (
                                        <FigmaFefoBadge
                                            daysUntilExpiration={lote.days_until_expiration}
                                            size="sm"
                                            showLabel={true}
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stock Disponible</div>
                                <div className="text-3xl font-black mt-1">{lote.cantidad} <span className="text-xs text-slate-400">{lote.unit}</span></div>
                            </div>

                            {lote.photo_url && (
                                <div className="pt-6 border-t border-white/10">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Verificación Visual</div>
                                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-white/10 group cursor-pointer">
                                        <img
                                            src={lote.photo_url}
                                            alt={`Foto de ${lote.codigo}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <Camera size={24} className="text-white" />
                                        </div>
                                    </div>
                                    <p className="text-[8px] text-white/20 italic mt-2 leading-tight">Coincidencia visual para verificación FEFO de este despacho.</p>
                                </div>
                            )}

                            {!lote.photo_url && (
                                <div className="pt-6 border-t border-white/10">
                                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Verificación Visual</div>
                                    <div className="mt-3 w-full aspect-square rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                                        <Camera size={24} className="text-white/20" />
                                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Sin foto del ítem</span>
                                    </div>
                                </div>
                            )}

                            <div className="pt-6 border-t border-white/10 space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Proyección de Salida</div>
                                    <div className="text-xs font-bold text-indigo-400">-{data.quantity} {lote.unit || "kg"}</div>
                                </div>
                                <div className="h-2 bg-slate-900/80 backdrop-blur-xl/10 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 transition-all duration-500" 
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                                <div className="text-[9px] text-slate-400 italic">
                                    Stock remanente: {(lote.cantidad - data.quantity).toFixed(2)} {lote.unit || "kg"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {lote.days_until_expiration !== undefined && lote.days_until_expiration <= 30 && (
                        <div className={`p-6 rounded-3xl flex gap-4 items-start border ${
                            lote.days_until_expiration <= 15
                                ? 'bg-red-500/10 border-red-500/25'
                                : 'bg-amber-500/10 border-amber-500/25'
                        }`}>
                            {lote.days_until_expiration <= 15 ? (
                                <AlertTriangle className="text-red-500 shrink-0" size={20} />
                            ) : (
                                <Lightbulb className="text-amber-500 shrink-0" size={20} />
                            )}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                        lote.days_until_expiration <= 15 ? 'text-red-400' : 'text-amber-400'
                                    }`}>
                                        {lote.days_until_expiration <= 15 ? 'Prioridad FEFO' : 'Sugerencia FEFO'}
                                    </span>
                                    <FigmaFefoBadge
                                        daysUntilExpiration={lote.days_until_expiration}
                                        size="sm"
                                    />
                                </div>
                                <p className="text-[10px] font-bold leading-tight uppercase text-slate-300">
                                    {lote.days_until_expiration <= 15
                                        ? `Este lote vence en ${lote.days_until_expiration} días. Se recomienda despacharlo con prioridad máxima.`
                                        : `Este lote vence en ${lote.days_until_expiration} días. Considere consumirlo pronto para evitar desperdicio.`
                                    }
                                </p>
                                {lote.stock_total !== undefined && lote.stock_total > lote.cantidad && (
                                    <p className="text-[9px] text-indigo-400 font-bold uppercase">
                                        Stock total del material: {lote.stock_total} {lote.unit || "kg"} en múltiples lotes
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Form Actions */}
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/30 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/40 pb-2">
                            <MinusCircle size={14} />
                            <span>Detalles del Despacho</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Cantidad a retirar ({lote.unit})</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            required
                                            value={data.quantity}
                                            onChange={e => setData('quantity', parseFloat(e.target.value))}
                                            placeholder="0.00"
                                            max={lote.cantidad}
                                            className={`w-full bg-slate-800/50 border ${errors.quantity ? 'border-red-500' : 'border-slate-700/50'} rounded-2xl px-5 py-4 text-lg font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
                                        />
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-end">
                                            <span className="text-[10px] font-black text-slate-400 uppercase">Máximo</span>
                                            <span className="text-[10px] font-black text-indigo-400">{lote.cantidad} {lote.unit || "kg"}</span>
                                        </div>
                                    </div>
                                    {errors.quantity && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.quantity}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Motivo del Despacho</label>
                                    <select 
                                        required
                                        value={data.reason}
                                        onChange={e => setData('reason', e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
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
                                    <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Descripción / Observaciones</label>
                                    <textarea 
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        placeholder="Indica el número de orden de producción o cualquier detalle relevante..."
                                        className="flex-1 w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all placeholder:italic"
                                    />
                                    {errors.description && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.description}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-500/10 p-6 rounded-3xl border border-indigo-500/25 flex gap-4 items-center">
                            <Info size={18} className="text-indigo-400 shrink-0" />
                            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-tight leading-relaxed">
                                Esta acción es irreversible. Al procesar el despacho, el sistema actualizará el stock físico y dejará un rastro en el historial para auditoría.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <Tag size={14} className="text-indigo-400" />
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
