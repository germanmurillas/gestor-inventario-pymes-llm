import React from 'react';
import { ArrowLeft, ArrowRightLeft, Info, Tag, Loader2, AlertTriangle, Warehouse, Package } from 'lucide-react';
import { useForm } from '@inertiajs/react';

interface Bodega {
    id: number;
    name: string;
    code: string;
}

interface LoteOption {
    id: number;
    batch_number: string;
    quantity: number;
    expiration_date: string;
    material: string;
    codigo: string;
    bodega_id: number;
    unit?: string;
    estado?: string;
}

interface FigmaTransferFormProps {
    onBack: () => void;
    bodegas: Bodega[];
    lotes: LoteOption[];
}

const FigmaTransferForm = ({ onBack, bodegas, lotes }: FigmaTransferFormProps) => {
    const { data, setData, post, processing, errors, reset } = useForm({
        from_bodega_id: '' as string | number,
        to_bodega_id: '' as string | number,
        lote_id: '' as string | number,
        cantidad: '' as string | number,
        reason: '',
    });

    const filteredLotes = lotes.filter(
        (l) => data.from_bodega_id && l.bodega_id === Number(data.from_bodega_id) && l.quantity > 0 && (l.estado ?? 'active') === 'active'
    );

    const selectedLote = lotes.find((l) => l.id === Number(data.lote_id));
    const maxTransfer = selectedLote ? selectedLote.quantity : 0;
    const unidad = selectedLote?.unit ?? '';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm('¿Transferir este stock entre bodegas? Esta acción se registra en el Kardex.')) return;
        post('/inventory/transfer', {
            onSuccess: () => {
                reset();
                onBack();
            },
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-8 animate-in slide-in-from-right-4 duration-500 max-w-7xl mx-auto pb-20"
        >
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 sm:gap-6">
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-2 hover:bg-slate-800/30 rounded-lg transition-colors border border-slate-700/30 shadow-sm"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold uppercase tracking-tight">
                            Transferencia entre Bodegas
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                            Mover inventario entre ubicaciones — FEFO automático
                        </p>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={
                        processing ||
                        !data.from_bodega_id ||
                        !data.to_bodega_id ||
                        !data.lote_id ||
                        Number(data.cantidad) <= 0 ||
                        Number(data.cantidad) > maxTransfer
                    }
                    className="flex items-center gap-2 bg-obsidiana text-white px-8 py-3 rounded-2xl shadow-lg font-bold text-sm hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
                >
                    {processing ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <ArrowRightLeft size={18} />
                    )}
                    <span>{processing ? 'Transfiriendo...' : 'Ejecutar Transferencia'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left: Summary */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-obsidiana text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 opacity-5">
                            <ArrowRightLeft size={200} />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <div>
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                                    Bodega Origen
                                </div>
                                <div className="text-lg font-black mt-1 leading-tight">
                                    {bodegas.find((b) => b.id === Number(data.from_bodega_id))?.name || '—'}
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <div className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-xl/10 flex items-center justify-center">
                                    <ArrowRightLeft size={18} className="text-champan" />
                                </div>
                            </div>

                            <div>
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                                    Bodega Destino
                                </div>
                                <div className="text-lg font-black mt-1 leading-tight">
                                    {bodegas.find((b) => b.id === Number(data.to_bodega_id))?.name || '—'}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                                    Lote Seleccionado
                                </div>
                                <div className="text-xl font-black mt-1">
                                    {selectedLote?.batch_number || '—'}
                                </div>
                                <div className="text-[10px] font-bold text-indigo-400 uppercase mt-1">
                                    {selectedLote?.material || '—'}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                                    Stock Disponible
                                </div>
                                <div className="text-3xl font-black mt-1">
                                    {selectedLote ? selectedLote.quantity : '—'}{' '}
                                    <span className="text-xs text-white/40">{unidad}</span>
                                </div>
                            </div>

                            {data.cantidad && Number(data.cantidad) > 0 && (
                                <div className="pt-6 border-t border-white/10 space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">
                                            Proyección
                                        </div>
                                        <div className="text-xs font-bold text-indigo-400">
                                            -{data.cantidad} {unidad}
                                        </div>
                                    </div>
                                    <div className="h-2 bg-slate-900/80 backdrop-blur-xl/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 transition-all duration-500"
                                            style={{
                                                width: `${Math.min(
                                                    (Number(data.cantidad) / maxTransfer) * 100,
                                                    100
                                                )}%`,
                                            }}
                                        ></div>
                                    </div>
                                    <div className="text-[9px] text-white/30 italic">
                                        Stock remanente:{' '}
                                        {(maxTransfer - Number(data.cantidad)).toFixed(2)} {unidad}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedLote && selectedLote.expiration_date && (
                        <div className="bg-amber-500/10 border border-amber-500/25 p-6 rounded-3xl flex gap-4 items-start">
                            <AlertTriangle className="text-amber-500 shrink-0" size={20} />
                            <div>
                                <div className="text-[10px] font-black text-amber-300 uppercase tracking-widest">
                                    Vencimiento FEFO
                                </div>
                                <p className="text-[10px] text-amber-400 font-bold leading-tight mt-1 uppercase">
                                    Este lote vence el {selectedLote.expiration_date}. El sistema prioriza lotes
                                    con vencimiento más próximo.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Form */}
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/30 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/40 pb-2">
                            <Warehouse size={14} />
                            <span>Origen y Destino</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-200 uppercase tracking-tight">
                                    Bodega Origen
                                </label>
                                <select
                                    required
                                    value={data.from_bodega_id}
                                    onChange={(e) => {
                                        setData('from_bodega_id', e.target.value);
                                        setData('lote_id', '');
                                    }}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                >
                                    <option value="">Seleccionar bodega...</option>
                                    {bodegas.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name} ({b.code})
                                        </option>
                                    ))}
                                </select>
                                {errors.from_bodega_id && (
                                    <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">
                                        {errors.from_bodega_id}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-200 uppercase tracking-tight">
                                    Bodega Destino
                                </label>
                                <select
                                    required
                                    value={data.to_bodega_id}
                                    onChange={(e) => setData('to_bodega_id', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
                                >
                                    <option value="">Seleccionar bodega...</option>
                                    {bodegas
                                        .filter((b) => b.id !== Number(data.from_bodega_id))
                                        .map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name} ({b.code})
                                            </option>
                                        ))}
                                </select>
                                {errors.to_bodega_id && (
                                    <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">
                                        {errors.to_bodega_id}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/40 pb-2">
                            <Package size={14} />
                            <span>Lote y Cantidad</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-200 uppercase tracking-tight">
                                    Seleccionar Lote
                                </label>
                                <select
                                    required
                                    value={data.lote_id}
                                    onChange={(e) => setData('lote_id', e.target.value)}
                                    disabled={!data.from_bodega_id}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer disabled:opacity-40"
                                >
                                    <option value="">Seleccionar lote...</option>
                                    {filteredLotes
                                        .sort(
                                            (a, b) =>
                                                new Date(a.expiration_date).getTime() -
                                                new Date(b.expiration_date).getTime()
                                        )
                                        .map((l) => (
                                            <option key={l.id} value={l.id}>
                                                {l.material} — Lote {l.batch_number} ({l.quantity} kg — vence {l.expiration_date})
                                            </option>
                                        ))}
                                </select>
                                {errors.lote_id && (
                                    <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">
                                        {errors.lote_id}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-200 uppercase tracking-tight">
                                    Cantidad a transferir{unidad ? ` (${unidad})` : ''}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.001"
                                        required
                                        value={data.cantidad}
                                        onChange={(e) => setData('cantidad', e.target.value)}
                                        placeholder="0.000"
                                        max={maxTransfer}
                                        disabled={!data.lote_id}
                                        className={`w-full bg-slate-800/50 border ${
                                            errors.cantidad ? 'border-red-500' : 'border-slate-700/50'
                                        } rounded-2xl px-5 py-4 text-lg font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-40`}
                                    />
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-end">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Máximo</span>
                                        <span className="text-[10px] font-black text-indigo-400">
                                            {maxTransfer} {unidad}
                                        </span>
                                    </div>
                                </div>
                                {errors.cantidad && (
                                    <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">
                                        {errors.cantidad}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-200 uppercase tracking-tight">
                                Motivo de la Transferencia
                            </label>
                            <input
                                type="text"
                                required
                                value={data.reason}
                                onChange={(e) => setData('reason', e.target.value)}
                                placeholder="Ej: Reorganización de bodega, optimización de espacio..."
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:italic"
                            />
                            {errors.reason && (
                                <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">
                                    {errors.reason}
                                </p>
                            )}
                        </div>

                        <div className="bg-indigo-500/10 p-6 rounded-3xl border border-indigo-500/25 flex gap-4 items-center">
                            <Info size={18} className="text-indigo-400 shrink-0" />
                            <p className="text-[10px] text-indigo-300/60 font-bold uppercase tracking-tight leading-relaxed">
                                Esta acción genera 2 registros en el Kardex (salida + entrada) y es
                                irreversible. El sistema aplica FEFO automáticamente al sugerir lotes.
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

export default FigmaTransferForm;
