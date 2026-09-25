import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { ImagePlus, Plus, Trash2, Warehouse, X } from 'lucide-react';
import type { BodegaResumen } from './FigmaBodegaBar';

interface Props {
    bodegas: BodegaResumen[];
    /** 'nueva' abre el formulario de creación; un id abre la edición de esa bodega; null muestra la lista. */
    inicial?: 'nueva' | number | null;
    onClose: () => void;
}

type Form = { name: string; code: string; capacity: number | string; description: string; status: 'active' | 'full' | 'maintenance' };
const vacio: Form = { name: '', code: '', capacity: 1000, description: '', status: 'active' };

/** Crear y editar bodegas con su imagen de fondo (solo administrador). */
export default function FigmaBodegaManager({ bodegas, inicial = null, onClose }: Props) {
    const [editando, setEditando] = useState<'nueva' | number | null>(inicial);
    const [form, setForm] = useState<Form>(vacio);
    const [imagen, setImagen] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [quitarImagen, setQuitarImagen] = useState(false);
    const [enlace, setEnlace] = useState('');
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [guardando, setGuardando] = useState(false);

    const actual = typeof editando === 'number' ? bodegas.find((b) => b.id === editando) : undefined;

    useEffect(() => {
        setErrores({}); setImagen(null); setQuitarImagen(false); setEnlace('');
        if (actual) {
            setForm({ name: actual.name, code: actual.code, capacity: actual.capacity, description: actual.description ?? '', status: (actual.status as any) || 'active' });
            setPreview(actual.image_url ?? null);
        } else {
            setForm(vacio); setPreview(null);
        }
    }, [editando]);

    const elegirImagen = (f: File | null) => {
        setImagen(f); setQuitarImagen(false);
        setPreview(f ? URL.createObjectURL(f) : actual?.image_url ?? null);
    };

    const guardar = (e: React.FormEvent) => {
        e.preventDefault();
        setGuardando(true);
        const datos: Record<string, any> = { name: form.name, capacity: form.capacity, description: form.description };
        if (imagen) datos.image = imagen;
        else if (enlace.trim()) datos.image_link = enlace.trim();
        const url = actual ? `/bodegas/${actual.id}` : '/bodegas';
        if (actual) { datos.status = form.status; if (quitarImagen) datos.remove_image = 1; } else { datos.code = form.code; }
        router.post(url, datos, {
            forceFormData: true,
            preserveScroll: true,
            onError: (errs) => setErrores(errs as Record<string, string>),
            onSuccess: () => setEditando(null),
            onFinish: () => setGuardando(false),
        });
    };

    const campo = 'w-full rounded-xl border border-slate-700/50 bg-slate-900/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none';

    return (
        <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Bodegas">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="pm-chrome relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-obsidiana p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300 sm:max-w-2xl sm:rounded-3xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">{editando === null ? 'Bodegas' : actual ? `Editar ${actual.name}` : 'Nueva bodega'}</h3>
                    <button onClick={editando === null ? onClose : () => setEditando(null)} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-slate-300"><X size={18} /></button>
                </div>

                {editando === null ? (
                    <div className="space-y-2">
                        <button onClick={() => setEditando('nueva')} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-400/50 py-3 text-sm font-bold text-indigo-200">
                            <Plus size={16} /> Nueva bodega
                        </button>
                        {bodegas.map((b) => (
                            <button key={b.id} onClick={() => setEditando(b.id)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-700/40 bg-slate-800/40 p-2 text-left">
                                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                                    {b.image_url ? <img src={b.image_url} alt="" className="h-full w-full object-cover" /> : <Warehouse size={20} className="m-auto mt-4 text-slate-300" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-white">{b.name}</p>
                                    <p className="text-xs text-slate-400">{b.code} · {b.lotes} lotes · {b.insumos} insumos{b.status === 'full' ? ' · llena' : b.status === 'maintenance' ? ' · en mantenimiento' : ''}</p>
                                </div>
                                <span className="px-2 text-xs font-semibold text-indigo-300">Editar</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <form onSubmit={guardar} className="space-y-4">
                        <label className="pm-media relative block h-40 cursor-pointer overflow-hidden rounded-2xl border border-dashed border-slate-600 bg-slate-900">
                            {preview && !quitarImagen
                                ? <img src={preview} alt="" className="h-full w-full object-cover" />
                                : <span className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-400"><ImagePlus size={26} /> Imagen de fondo (opcional)</span>}
                            <span className="absolute bottom-2 right-2 rounded-lg bg-slate-950/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">{preview && !quitarImagen ? 'Cambiar' : 'Elegir o tomar foto'}</span>
                            <input type="file" accept="image/*" className="sr-only" onChange={(e) => elegirImagen(e.target.files?.[0] ?? null)} />
                        </label>
                        {actual?.image_url && !imagen && (
                            <button type="button" onClick={() => setQuitarImagen(!quitarImagen)} className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                                <Trash2 size={13} /> {quitarImagen ? 'Conservar la imagen actual' : 'Quitar imagen'}
                            </button>
                        )}
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-400">…o pega el enlace de una imagen (https)</label>
                            <input type="url" className={campo} value={enlace} placeholder="https://…" disabled={!!imagen}
                                onChange={(e) => { setEnlace(e.target.value); setQuitarImagen(false); setPreview(e.target.value || actual?.image_url || null); }} />
                        </div>
                        {(errores.image || errores.image_link) && <p className="text-xs text-rose-300">{errores.image || errores.image_link}</p>}

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Nombre</label>
                                <input className={campo} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Cuarto frío" required />
                                {errores.name && <p className="mt-1 text-xs text-rose-300">{errores.name}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Código</label>
                                <input className={`${campo} uppercase disabled:opacity-60`} value={form.code} disabled={!!actual}
                                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="BOD-XXX" required />
                                {errores.code && <p className="mt-1 text-xs text-rose-300">{errores.code}</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Capacidad</label>
                                <input type="number" min={1} className={campo} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-400">Descripción</label>
                                <textarea rows={2} className={`${campo} resize-none`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Qué se guarda aquí" />
                            </div>
                            {actual && (
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs font-semibold text-slate-400">Estado</label>
                                    <select className={campo} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Form['status'] })}>
                                        <option value="active">Activa</option>
                                        <option value="full">Llena</option>
                                        <option value="maintenance">En mantenimiento</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <button type="submit" disabled={guardando} className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50">
                            {guardando ? 'Guardando…' : actual ? 'Guardar cambios' : 'Crear bodega'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
