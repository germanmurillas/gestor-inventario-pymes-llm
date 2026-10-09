import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Save, Info, Package, DollarSign, Calendar, Tag, Loader2, Camera, Image as ImageIcon } from 'lucide-react';
import { useForm } from '@inertiajs/react';

const FigmaForms = ({ onBack, initialBodega = null, bodegas = [], categorias = [] }: { onBack: () => void, initialBodega?: any, bodegas?: any[], categorias?: string[] }) => {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        code: '',
        bodega_id: initialBodega?.id || (bodegas[0]?.id || ''),
        stock_initial: 0,
        expiration_date: '',
        batch_number: '',
        description: '',
        photo: null as File | null,
        unit: '',
        categoria: '',
        unit_cost: '' as number | string,
        stock_minimo: '' as number | string,
        dias_criticos: '' as number | string,
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setData('photo', file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const removePhoto = () => {
        setData('photo', null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

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
        <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-right-4 duration-500 max-w-7xl mx-auto pb-20">
            {/* Header (Mockup 14 Top) */}
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

            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/30 rounded-[2.5rem] p-10 shadow-sm space-y-10">
                {errors.error && (
                    <div className="bg-red-500/10 border border-red-500/25 text-red-400 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 animate-pulse">
                        <Tag size={16} />
                        <span>{errors.error}</span>
                    </div>
                )}
                {/* Form Sections (Mockup 14) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    
                    {/* General Info */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/40 pb-2">
                            <Info size={14} />
                            <span>Información General</span>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Nombre del Producto</label>
                                <input aria-label="Nombre del Producto" maxLength={255} 
                                    type="text" 
                                    required
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="Ej: Harina de Trigo Especial" 
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                />
                                {errors.name && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Código</label>
                                    <input aria-label="Código" maxLength={20} 
                                        type="text" 
                                        required
                                        value={data.code}
                                        onChange={e => setData('code', e.target.value.toUpperCase())}
                                        placeholder="MAT-00X" 
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all uppercase" 
                                    />
                                    {errors.code && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.code}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Lote Interno</label>
                                    <input aria-label="Lote Interno" maxLength={50} 
                                        type="text" 
                                        required
                                        value={data.batch_number}
                                        onChange={e => setData('batch_number', e.target.value)}
                                        placeholder="L-0000" 
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                    />
                                    {errors.batch_number && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.batch_number}</p>}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Ubicación / Bodega</label>
                                <select aria-label="Ubicación / Bodega" 
                                    required
                                    value={data.bodega_id}
                                    onChange={e => setData('bodega_id', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                                >
                                    <option value="">Seleccione una bodega...</option>
                                    {bodegas.map((b: any) => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                                    ))}
                                </select>
                                {errors.bodega_id && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.bodega_id}</p>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Descripción del Material</label>
                                <textarea aria-label="Descripción del Material" 
                                    value={data.description}
                                    onChange={e => setData('description', e.target.value)}
                                    placeholder="Detalles sobre el proveedor o uso comercial..." 
                                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none transition-all" 
                                />
                            </div>

                            {/* Photo Upload */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Foto del Producto</label>
                                <div className="flex items-start gap-4">
                                    <div
                                        onClick={() => !previewUrl && fileInputRef.current?.click()}
                                        className={`relative w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all group ${
                                            previewUrl
                                                ? 'border-indigo-500/40 cursor-pointer'
                                                : 'border-slate-300 cursor-pointer hover:border-indigo-400 bg-slate-800/50'
                                        }`}
                                    >
                                        {previewUrl ? (
                                            <>
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <span className="text-white text-[10px] font-black uppercase tracking-widest bg-black/60 px-3 py-1.5 rounded-xl">Cambiar</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div
                                                className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-indigo-500 transition-colors"
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                <Camera size={28} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Subir foto</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex items-center gap-2 bg-indigo-500/10 text-indigo-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/15 transition-all border border-indigo-500/25"
                                        >
                                            <Camera size={14} />
                                            <span>{previewUrl ? 'Cambiar foto' : 'Seleccionar foto'}</span>
                                        </button>
                                        {previewUrl && (
                                            <button
                                                type="button"
                                                onClick={removePhoto}
                                                className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/15 transition-all border border-red-500/25"
                                            >
                                                <span>✕ Quitar</span>
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                    />
                                </div>
                                {errors.photo && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.photo}</p>}
                                <p className="text-[9px] text-slate-400 italic">Formatos JPG, PNG o WebP. Máx 5 MB.</p>
                            </div>
                        </div>
                    </div>

                    {/* Stock & Timeline */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/40 pb-2">
                            <Package size={14} />
                            <span>Existencias Iniciales</span>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Stock Inicial</label>
                                <div className="relative">
                                    <input aria-label="Stock Inicial" 
                                        type="number" 
                                        required
                                        min="0"
                                        step="0.01"
                                        value={data.stock_initial}
                                        onChange={e => setData('stock_initial', parseFloat(e.target.value))}
                                        placeholder="0.00" 
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" 
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 tracking-tighter">{data.unit}</span>
                                </div>
                                {errors.stock_initial && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.stock_initial}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Unidad</label>
                                    <select aria-label="Unidad" required value={data.unit} onChange={e => setData('unit', e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold">
                                        <option value="" disabled>Elegir…</option>
                                        <option value="kg">kg</option><option value="g">g</option><option value="L">L</option>
                                        <option value="mL">mL</option><option value="gal">gal</option><option value="und">und</option>
                                    </select>
                                    {errors.unit && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.unit}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Costo unitario</label>
                                    <input aria-label="Costo unitario" type="number" required min="0" step="0.01" value={data.unit_cost} onChange={e => setData('unit_cost', e.target.value)}
                                        placeholder="COP por unidad" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                                    {errors.unit_cost && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.unit_cost}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Stock mínimo</label>
                                    <input aria-label="Stock mínimo" type="number" min="0" step="0.01" value={data.stock_minimo} onChange={e => setData('stock_minimo', e.target.value)}
                                        placeholder="Para alertas" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                                    {errors.stock_minimo && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.stock_minimo}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Días críticos</label>
                                    <input aria-label="Días críticos" type="number" min="1" max="365" step="1" value={data.dias_criticos} onChange={e => setData('dias_criticos', e.target.value)}
                                        placeholder="Umbral general" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                                    {errors.dias_criticos && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.dias_criticos}</p>}
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Categoría</label>
                                    <input aria-label="Categoría" type="text" list="categorias-existentes" autoComplete="off" maxLength={100} value={data.categoria} onChange={e => setData('categoria', e.target.value)}
                                        placeholder="Ej. Harinas" className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                                    <datalist id="categorias-existentes">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
                                </div>
                                <p className="col-span-2 text-[10px] text-slate-400">Días críticos: cuántos días antes de vencer un lote de este insumo pasa a crítico. Vacío = el umbral general de Ajustes.</p>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-200 uppercase tracking-tight">Fecha de Vencimiento (FEFO)</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input aria-label="Fecha de Vencimiento (FEFO)" 
                                        type="date" 
                                        required
                                        value={data.expiration_date}
                                        onChange={e => setData('expiration_date', e.target.value)}
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold" 
                                    />
                                </div>
                                {errors.expiration_date && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.expiration_date}</p>}
                                <p className="text-[9px] text-slate-400 italic">Crítico para el cálculo de salida prioritaria.</p>
                            </div>

                            <div className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/25 space-y-3">
                                <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                    <Tag size={14} />
                                    <span>Previsualización de Lote</span>
                                </div>
                                <div className="text-[10px] text-indigo-300 leading-relaxed font-bold uppercase tracking-tight">
                                    Al guardar, el sistema generará automáticamente un registro de entrada en el Kardex para el lote <span className="text-indigo-400">#{data.batch_number || '---'}</span> con <span className="text-indigo-400">{data.stock_initial || 0} {data.unit}</span>.
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="pt-10 border-t border-slate-700/40 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center text-white">
                            <Info size={12} />
                        </div>
                        <span className="font-bold">Lote, cantidad, unidad, costo y vencimiento son obligatorios para la trazabilidad.</span>
                    </div>
                    <button 
                        type="button"
                        onClick={onBack}
                        className="text-[10px] font-black text-red-400 hover:text-red-400 transition-colors uppercase tracking-[0.2em]"
                    >
                        Cancelar Registro
                    </button>
                </div>
            </div>
        </form>
    );
};

export default FigmaForms;
