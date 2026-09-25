import React from 'react';
import { ChevronRight, Pencil, Warehouse } from 'lucide-react';

export interface BodegaResumen {
    id: number;
    name: string;
    code: string;
    description?: string | null;
    image_url?: string | null;
    capacity: number;
    occupied: number;
    percentage: number;
    status?: string;
    lotes: number;
    insumos: number;
    criticos: number;
    cuarentena: number;
    valor: number;
}

interface Props {
    bodega: BodegaResumen;
    /** Abre el inventario filtrado por esta bodega. */
    onOpen?: () => void;
    /** Solo administrador: editar nombre, capacidad e imagen. */
    onEdit?: () => void;
}

const cop = (n: number) => '$' + Math.round(n || 0).toLocaleString('es-CO');

/** Tarjeta de bodega conectada al inventario: sus lotes, insumos, críticos y valor reales. */
export default function FigmaBodegaBar({ bodega: b, onOpen, onEdit }: Props) {
    const pct = Math.min(Math.max(b.percentage || 0, 0), 100);
    const inactiva = b.status === 'maintenance';

    return (
        <div className={`group relative overflow-hidden rounded-2xl border border-slate-700/40 bg-slate-800/40 transition hover:border-indigo-400/40 ${inactiva ? 'opacity-60' : ''}`}>
            <button type="button" onClick={onOpen} className="block w-full text-left" aria-label={`Ver inventario de ${b.name}`}>
                <div className="pm-media relative h-24 overflow-hidden bg-slate-900">
                    {b.image_url
                        ? <img src={b.image_url} alt="" loading="lazy" className="h-full w-full object-cover opacity-75 transition duration-700 group-hover:scale-105 group-hover:opacity-95" />
                        : <Warehouse size={36} className="absolute inset-0 m-auto text-slate-300" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent" />
                    <div className="absolute inset-x-3 bottom-2 flex items-end justify-between gap-2">
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">{b.name}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-300/80">{b.code}{b.status === 'full' ? ' · llena' : b.status === 'maintenance' ? ' · en mantenimiento' : ''}</p>
                        </div>
                        <ChevronRight size={18} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5" />
                    </div>
                </div>

                <div className="grid grid-cols-4 divide-x divide-slate-700/40 border-b border-slate-700/40 text-center">
                    <Dato valor={b.lotes} etiqueta="lotes" />
                    <Dato valor={b.insumos} etiqueta="insumos" />
                    <Dato valor={b.criticos} etiqueta="por vencer" alerta={b.criticos > 0} />
                    <Dato valor={cop(b.valor)} etiqueta="valor" pequeno />
                </div>

                <div className="space-y-1.5 px-3 py-2.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-700/50">
                        <div className={`h-full rounded-full ${pct >= 85 ? 'bg-rose-400' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="flex justify-between text-[10px] text-slate-400">
                        <span>Ocupación {pct}% de su capacidad</span>
                        {b.cuarentena > 0 && <span className="text-amber-300">{b.cuarentena} en cuarentena</span>}
                    </p>
                </div>
            </button>

            {onEdit && (
                <button type="button" onClick={onEdit} aria-label={`Editar ${b.name}`}
                    className="pm-media absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-slate-950/60 text-slate-200 opacity-100 backdrop-blur transition hover:bg-slate-900 sm:opacity-0 sm:group-hover:opacity-100">
                    <Pencil size={14} />
                </button>
            )}
        </div>
    );
}

const Dato = ({ valor, etiqueta, alerta, pequeno }: { valor: React.ReactNode; etiqueta: string; alerta?: boolean; pequeno?: boolean }) => (
    <div className="px-1 py-2">
        <p className={`${pequeno ? 'text-[11px]' : 'text-base'} truncate font-black leading-tight ${alerta ? 'text-rose-300' : 'text-white'}`}>{valor}</p>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</p>
    </div>
);
