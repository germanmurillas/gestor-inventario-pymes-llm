import React, { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, ArrowRight, Check, Package, Scale, ClipboardCheck,
    PartyPopper, AlertTriangle, Truck, Camera, Loader2, Search,
    Box, Layers, ChevronRight, Clock, ShieldCheck, Sparkles, X
} from 'lucide-react';
import { router } from '@inertiajs/react';
import FigmaFefoBadge from './FigmaFefoBadge';

interface LotePlan {
    id: number;
    batch_number: string;
    available: number;
    to_consume: number;
    expiration_date: string;
    days_until_expiration: number;
    fefo_level: string;
    remaining_after: number;
}

interface MaterialInfo {
    id: number;
    name: string;
    code: string;
    photo_url: string | null;
    unit: string;
}

interface FefoSuggestion {
    material: MaterialInfo;
    total_available: number;
    suggested_lote: {
        id: number;
        batch_number: string;
        quantity: number;
        expiration_date: string;
        days_until_expiration: number;
        fefo_level: string;
    } | null;
    suggestion_message: string;
    split_plan: LotePlan[];
    needs_split: boolean;
}

interface MaterialOption {
    id: number;
    name: string;
    code: string;
    photo_url: string | null;
    stock_total: number;
}

interface FigmaConsumeWizardProps {
    onBack: () => void;
    initialMaterials?: MaterialOption[];
}

const REASONS = [
    { value: 'produccion', label: 'Consumo para Producción', icon: '⚙️' },
    { value: 'venta', label: 'Despacho por Venta', icon: '📦' },
    { value: 'desperdicio', label: 'Baja / Desperdicio', icon: '🗑️' },
    { value: 'ajuste', label: 'Ajuste Manual de Salida', icon: '🔄' },
];

const FigmaConsumeWizard = ({ onBack, initialMaterials = [] }: FigmaConsumeWizardProps) => {
    const [step, setStep] = useState(1);
    const [materials, setMaterials] = useState<MaterialOption[]>(initialMaterials);
    const [materialsLoading, setMaterialsLoading] = useState(!initialMaterials.length);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMaterial, setSelectedMaterial] = useState<MaterialOption | null>(null);
    const [quantity, setQuantity] = useState<number>(0);
    const [reason, setReason] = useState('produccion');
    const [description, setDescription] = useState('');

    const [suggestion, setSuggestion] = useState<FefoSuggestion | null>(null);
    const [suggestionLoading, setSuggestionLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [consumptionResult, setConsumptionResult] = useState<any>(null);

    // Fetch materials if not provided
    useEffect(() => {
        if (initialMaterials.length > 0) {
            setMaterials(initialMaterials);
            setMaterialsLoading(false);
            return;
        }

        const fetchMaterials = async () => {
            try {
                const res = await fetch('/inventory/fefo-suggest/1'); // dummy to check connection
                // Use the dashboard page data approach instead
                setMaterialsLoading(false);
            } catch {
                setMaterialsLoading(false);
            }
        };
        fetchMaterials();
    }, []);

    // Fetch FEFO suggestion when material or quantity changes
    const fetchSuggestion = useCallback(async (materialId: number, qty: number) => {
        if (!materialId) return;
        setSuggestionLoading(true);
        setError(null);
        try {
            const res = await fetch(`/inventory/fefo-suggest/${materialId}?quantity=${qty}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al obtener sugerencia');
            }
            const data = await res.json();
            setSuggestion(data);
        } catch (e: any) {
            setError(e.message);
            setSuggestion(null);
        } finally {
            setSuggestionLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedMaterial && quantity > 0) {
            const timer = setTimeout(() => {
                fetchSuggestion(selectedMaterial.id, quantity);
            }, 400);
            return () => clearTimeout(timer);
        } else if (selectedMaterial) {
            fetchSuggestion(selectedMaterial.id, 0);
        }
    }, [selectedMaterial, quantity, fetchSuggestion]);

    const handleSubmit = async () => {
        if (!selectedMaterial || quantity <= 0) return;

        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/inventory/consume-fefo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    material_id: selectedMaterial.id,
                    quantity,
                    reason,
                    description: description || undefined,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error al registrar consumo');
            }

            const result = await res.json();
            setConsumptionResult(result);
            setStep(4);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Filtered materials ──────────────────────────────────────────────────
    const filteredMaterials = searchTerm
        ? materials.filter(m =>
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.code.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : materials;

    const canProceedStep1 = selectedMaterial !== null;
    const canProceedStep2 = quantity > 0 && quantity <= (suggestion?.total_available || 0);
    const canProceedStep3 = suggestion && suggestion.split_plan.length > 0;

    // ── Step indicator ──────────────────────────────────────────────────────
    const StepDot = ({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) => (
        <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300 ${
                done ? 'bg-emerald-500 text-white' :
                active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' :
                'bg-slate-100 text-slate-400'
            }`}>
                {done ? <Check size={14} /> : num}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest hidden sm:inline ${
                active ? 'text-indigo-600' : 'text-slate-400'
            }`}>{label}</span>
        </div>
    );

    return (
        <div className="animate-in slide-in-from-right-4 duration-500 max-w-7xl mx-auto pb-20 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-2 hover:bg-slate-800/30 rounded-lg transition-colors border border-slate-700/30 shadow-sm"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold uppercase tracking-tight">Consumo FEFO Mejorado</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                            Despacho inteligente — First Expired, First Out
                        </p>
                    </div>
                </div>
            </div>

            {/* Step Progress */}
            <div className="flex items-center justify-center gap-4 sm:gap-8 py-4">
                <StepDot num={1} label="Material" active={step === 1} done={step > 1} />
                <div className={`h-0.5 w-8 sm:w-16 ${step > 1 ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                <StepDot num={2} label="Cantidad" active={step === 2} done={step > 2} />
                <div className={`h-0.5 w-8 sm:w-16 ${step > 2 ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                <StepDot num={3} label="Confirmar" active={step === 3} done={step > 3} />
                <div className={`h-0.5 w-8 sm:w-16 ${step > 3 ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                <StepDot num={4} label="Completado" active={step === 4} done={step === 4} />
            </div>

            {/* Error banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-black text-red-600 uppercase tracking-wider">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg">
                        <X size={14} className="text-red-400" />
                    </button>
                </div>
            )}

            {/* ── STEP 1: Select Material ──────────────────────────────────── */}
            {step === 1 && (
                <div className="space-y-6">
                    {/* Search */}
                    <div className="relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Buscar material por nombre o código..."
                            className="w-full bg-slate-900/80 backdrop-blur-xl border border-slate-200 rounded-2xl px-12 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300"
                        />
                    </div>

                    {/* Material grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {materialsLoading ? (
                            <div className="col-span-full py-20 flex items-center justify-center">
                                <Loader2 size={32} className="animate-spin text-slate-300" />
                            </div>
                        ) : filteredMaterials.length === 0 ? (
                            <div className="col-span-full py-16 text-center">
                                <Package size={40} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">Sin materiales disponibles</p>
                            </div>
                        ) : (
                            filteredMaterials.map(material => (
                                <button
                                    key={material.id}
                                    onClick={() => setSelectedMaterial(
                                        selectedMaterial?.id === material.id ? null : material
                                    )}
                                    className={`text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                                        selectedMaterial?.id === material.id
                                            ? 'border-indigo-500 bg-indigo-50/50 shadow-lg shadow-indigo-100'
                                            : 'border-slate-100 bg-slate-900/80 backdrop-blur-xl hover:border-indigo-200 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-slate-800/50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                                            {material.photo_url ? (
                                                <img src={material.photo_url} alt={material.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Box size={24} className="text-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {material.code}
                                            </div>
                                            <div className="text-sm font-bold text-white mt-0.5 truncate">
                                                {material.name}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[10px] font-black text-indigo-600 uppercase">
                                                    {material.stock_total} KG
                                                </span>
                                            </div>
                                        </div>
                                        {selectedMaterial?.id === material.id && (
                                            <Check size={20} className="text-indigo-500 shrink-0 mt-2" />
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Continue button */}
                    <div className="flex justify-end">
                        <button
                            onClick={() => setStep(2)}
                            disabled={!canProceedStep1}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold text-sm hover:scale-105 transition-all active:scale-95 disabled:opacity-40 disabled:hover:scale-100 shadow-lg shadow-indigo-200"
                        >
                            <span>Siguiente: Cantidad</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 2: Enter Quantity ────────────────────────────────────── */}
            {step === 2 && selectedMaterial && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Material summary */}
                    <div className="md:col-span-1">
                        <div className="bg-obsidiana text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 opacity-5">
                                <Truck size={200} />
                            </div>
                            <div className="relative z-10 space-y-6">
                                <div>
                                    <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Material</div>
                                    <div className="text-xl font-black mt-1">{selectedMaterial.name}</div>
                                    <div className="text-[10px] font-bold text-indigo-400 uppercase mt-1">{selectedMaterial.code}</div>
                                </div>

                                {selectedMaterial.photo_url && (
                                    <div className="pt-4 border-t border-white/10">
                                        <img
                                            src={selectedMaterial.photo_url}
                                            alt={selectedMaterial.name}
                                            className="w-full aspect-square rounded-2xl object-cover border border-white/10"
                                        />
                                    </div>
                                )}

                                <div className="pt-4 border-t border-white/10">
                                    <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Stock Total</div>
                                    <div className="text-3xl font-black mt-1">
                                        {suggestion?.total_available ?? '...'} <span className="text-xs text-white/40">{selectedMaterial.unit?.toUpperCase() || 'KG'}</span>
                                    </div>
                                </div>

                                {/* FEFO Suggestion */}
                                {suggestionLoading && (
                                    <div className="pt-4 border-t border-white/10 flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin text-indigo-400" />
                                        <span className="text-[10px] text-indigo-400 font-bold uppercase">Calculando FEFO...</span>
                                    </div>
                                )}

                                {suggestion?.suggested_lote && !suggestionLoading && (
                                    <div className="pt-4 border-t border-white/10 space-y-3">
                                        <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Sugerencia FEFO</div>
                                        <div className="bg-slate-900/80 backdrop-blur-xl/5 p-4 rounded-2xl border border-white/10 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold">{suggestion.suggested_lote.batch_number}</span>
                                                <FigmaFefoBadge
                                                    daysUntilExpiration={suggestion.suggested_lote.days_until_expiration}
                                                    size="sm"
                                                />
                                            </div>
                                            <p className="text-[10px] text-white/60 font-bold leading-relaxed">
                                                {suggestion.suggestion_message}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quantity + split plan */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                            {/* Quantity input */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                    Cantidad a Consumir ({selectedMaterial.unit?.toUpperCase() || 'KG'})
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.001"
                                        value={quantity || ''}
                                        onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                                        placeholder="0.000"
                                        min={0.001}
                                        max={suggestion?.total_available || undefined}
                                        className="w-full bg-slate-800/50 border border-slate-200 rounded-2xl px-5 py-5 text-2xl font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    />
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-end">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Máx</span>
                                        <button
                                            type="button"
                                            onClick={() => setQuantity(suggestion?.total_available || 0)}
                                            className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors"
                                        >
                                            {suggestion?.total_available ?? '...'} {selectedMaterial.unit?.toUpperCase() || 'KG'}
                                        </button>
                                    </div>
                                </div>

                                {/* Stock consumption bar */}
                                {quantity > 0 && suggestion?.total_available && (
                                    <div className="mt-4 space-y-2">
                                        <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                            <span>Consumo</span>
                                            <span>{((quantity / suggestion.total_available) * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    quantity > suggestion.total_available
                                                        ? 'bg-red-500'
                                                        : quantity / suggestion.total_available > 0.8
                                                            ? 'bg-amber-500'
                                                            : 'bg-indigo-500'
                                                }`}
                                                style={{ width: `${Math.min((quantity / suggestion.total_available) * 100, 100)}%` }}
                                            />
                                        </div>
                                        {quantity > suggestion.total_available && (
                                            <p className="text-[9px] font-bold text-red-500 uppercase">
                                                Excede el stock disponible
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Reason */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Motivo</label>
                                <select
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                                >
                                    {REASONS.map(r => (
                                        <option key={r.value} value={r.value}>{r.icon} {r.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Observaciones</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Nº de orden de producción, receta o detalle relevante..."
                                    className="w-full bg-slate-800/50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 placeholder:italic"
                                />
                            </div>

                            {/* Split plan preview */}
                            {suggestion?.needs_split && suggestion.split_plan.length > 1 && (
                                <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Layers size={16} className="text-amber-600" />
                                        <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                                            Consumo Repartido ({suggestion.split_plan.length} lotes)
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {suggestion.split_plan.map((plan, idx) => (
                                            <div key={plan.id} className="flex items-center gap-3 text-[10px]">
                                                <span className="font-black text-slate-500 w-4">{idx + 1}.</span>
                                                <span className="font-bold text-slate-700 flex-1">{plan.batch_number}</span>
                                                <FigmaFefoBadge daysUntilExpiration={plan.days_until_expiration} size="sm" />
                                                <span className="font-black text-indigo-600">{plan.to_consume} {selectedMaterial.unit?.toUpperCase() || 'KG'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Single lote plan */}
                            {suggestion && !suggestion.needs_split && suggestion.split_plan.length === 1 && (
                                <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-6 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck size={16} className="text-emerald-600" />
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                            Lote Único
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px]">
                                        <span className="font-bold text-slate-700">{suggestion.split_plan[0].batch_number}</span>
                                        <FigmaFefoBadge daysUntilExpiration={suggestion.split_plan[0].days_until_expiration} size="sm" />
                                        <span className="font-black text-indigo-600">
                                            {suggestion.split_plan[0].to_consume} {selectedMaterial.unit?.toUpperCase() || 'KG'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Navigation */}
                        <div className="flex justify-between">
                            <button
                                onClick={() => setStep(1)}
                                className="flex items-center gap-2 text-slate-500 hover:text-slate-300 font-bold text-sm transition-colors"
                            >
                                <ArrowLeft size={16} />
                                <span>Volver</span>
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!canProceedStep2}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold text-sm hover:scale-105 transition-all active:scale-95 disabled:opacity-40 disabled:hover:scale-100 shadow-lg shadow-indigo-200"
                            >
                                <span>Revisar y Confirmar</span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── STEP 3: Confirm & Preview Kardex ──────────────────────────── */}
            {step === 3 && selectedMaterial && suggestion && (
                <div className="space-y-6">
                    {/* Confirmation card */}
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                        <div className="flex items-center gap-3">
                            <ClipboardCheck size={20} className="text-indigo-600" />
                            <div>
                                <h3 className="text-lg font-black text-white tracking-tight">Confirmar Despacho</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Revisa los lotes antes de confirmar</p>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                                <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Material</div>
                                <div className="text-sm font-bold text-white mt-1">{selectedMaterial.code} — {selectedMaterial.name}</div>
                            </div>
                            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                                <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Cantidad Total</div>
                                <div className="text-lg font-black text-white mt-1">
                                    {quantity} {selectedMaterial.unit?.toUpperCase() || 'KG'}
                                </div>
                            </div>
                            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                                <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Lotes Afectados</div>
                                <div className="text-lg font-black text-white mt-1">{suggestion.split_plan.length}</div>
                            </div>
                        </div>

                        {/* Lotes detail table */}
                        <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                Detalle de Lotes a Consumir
                            </div>
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-800/50 border-b border-slate-200">
                                            <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Lote</th>
                                            <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Vencimiento</th>
                                            <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">FEFO</th>
                                            <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Consumo</th>
                                            <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Remanente</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {suggestion.split_plan.map((plan, idx) => (
                                            <tr key={plan.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-slate-900/80 backdrop-blur-xl' : 'bg-slate-800/50'}`}>
                                                <td className="px-5 py-3.5">
                                                    <span className="text-sm font-bold text-white">{plan.batch_number}</span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="text-[10px] font-bold text-slate-600">{plan.expiration_date}</span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <FigmaFefoBadge daysUntilExpiration={plan.days_until_expiration} size="sm" />
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <span className="text-sm font-black text-indigo-600">-{plan.to_consume}</span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <span className={`text-[10px] font-bold ${plan.remaining_after <= 0 ? 'text-red-500' : 'text-slate-500'}`}>
                                                        {plan.remaining_after}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Kardex preview */}
                        <div className="space-y-3">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Vista Previa de Movimientos (Kardex)
                            </div>
                            <div className="space-y-1">
                                {suggestion.split_plan.map((plan) => (
                                    <div key={plan.id} className="flex items-center gap-3 text-[10px] bg-slate-800/50 p-3 rounded-xl">
                                        <Clock size={12} className="text-slate-400" />
                                        <span className="font-black text-slate-500 uppercase">{plan.batch_number}</span>
                                        <span className="text-slate-400">→</span>
                                        <span className="font-bold text-red-500">SALIDA -{plan.to_consume} KG</span>
                                        <span className="text-slate-400">por</span>
                                        <span className="font-bold text-slate-600 uppercase">{reason}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between">
                        <button
                            onClick={() => setStep(2)}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 font-bold text-sm transition-colors"
                        >
                            <ArrowLeft size={16} />
                            <span>Volver</span>
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !canProceedStep3}
                            className="flex items-center gap-2 bg-obsidiana text-white px-10 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-all active:scale-95 disabled:opacity-40 shadow-lg"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Procesando...</span>
                                </>
                            ) : (
                                <>
                                    <Truck size={18} />
                                    <span>Confirmar Despacho FEFO</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ── STEP 4: Success ───────────────────────────────────────────── */}
            {step === 4 && consumptionResult && (
                <div className="max-w-4xl mx-auto">
                    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-200 rounded-[2.5rem] p-12 shadow-sm space-y-8 text-center">
                        {/* Success animation */}
                        <div className="relative">
                            <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full flex items-center justify-center animate-in zoom-in-95 duration-500">
                                <PartyPopper size={40} className="text-emerald-500" />
                            </div>
                            <Sparkles size={20} className="text-amber-400 absolute top-0 right-1/3 animate-pulse" />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-white tracking-tight">Movimiento Registrado</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                                FEFO aplicado correctamente
                            </p>
                        </div>

                        {/* Result summary */}
                        <div className="bg-slate-800/50 rounded-2xl p-6 space-y-4 text-left">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Material</div>
                                    <div className="text-sm font-bold text-white">{selectedMaterial?.code}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Consumido</div>
                                    <div className="text-sm font-bold text-white">{consumptionResult.total_consumed} {selectedMaterial?.unit?.toUpperCase() || 'KG'}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lotes Afectados</div>
                                    <div className="text-sm font-bold text-white">{consumptionResult.consumed_lotes.length}</div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Movimientos Kardex</div>
                                    <div className="text-sm font-bold text-white">{consumptionResult.movimientos.length}</div>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4 space-y-2">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lotes Consumidos</div>
                                {consumptionResult.consumed_lotes.map((l: any) => (
                                    <div key={l.id} className="flex items-center justify-between text-[10px]">
                                        <span className="font-bold text-slate-700">{l.batch_number}</span>
                                        <span className="font-black text-indigo-600">-{l.consumed} KG</span>
                                        <span className={`font-bold ${l.status === 'consumed' ? 'text-red-500' : 'text-slate-400'}`}>
                                            {l.status === 'consumed' ? 'Agotado' : `${l.remaining} restante`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => {
                                    setStep(1);
                                    setSelectedMaterial(null);
                                    setQuantity(0);
                                    setSuggestion(null);
                                    setConsumptionResult(null);
                                    setError(null);
                                }}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-bold text-sm hover:scale-105 transition-all active:scale-95 shadow-lg shadow-indigo-200"
                            >
                                <Package size={16} />
                                <span>Nuevo Consumo</span>
                            </button>
                            <button
                                onClick={onBack}
                                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-8 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                                <ArrowLeft size={16} />
                                <span>Volver al Inventario</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FigmaConsumeWizard;
