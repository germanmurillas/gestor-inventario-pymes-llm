import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import { AlertTriangle, Bell, BellOff, CheckCheck, Info, Package } from 'lucide-react';

interface Notificacion {
    id: number;
    tipo: 'critico' | 'warning' | 'info' | 'exito' | string;
    titulo: string;
    mensaje: string;
    accion_url: string | null;
    icono: string | null;
    leida: boolean;
    created_at: string;
}

const TONO: Record<string, { barra: string; icono: string }> = {
    critico: { barra: 'border-l-rose-400', icono: 'bg-rose-500/15 text-rose-400' },
    warning: { barra: 'border-l-amber-400', icono: 'bg-amber-500/15 text-amber-400' },
    exito: { barra: 'border-l-emerald-400', icono: 'bg-emerald-500/15 text-emerald-400' },
    info: { barra: 'border-l-indigo-400', icono: 'bg-indigo-500/15 text-indigo-300' },
};

const ICONOS: Record<string, React.ElementType> = { AlertTriangle, Package };

/** Agrupa por día: Hoy, Ayer o la fecha. */
const grupoDe = (iso: string) => {
    const d = new Date(iso);
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const dia = new Date(d); dia.setHours(0, 0, 0, 0);
    const diff = Math.round((hoy.getTime() - dia.getTime()) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
};

const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

/** Alertas generadas por el sistema (FEFO y stock bajo), leídas de la tabla notifications. */
export default function FigmaNotifications() {
    const [items, setItems] = useState<Notificacion[] | null>(null);
    const [sinLeer, setSinLeer] = useState(0);
    const [error, setError] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/notificaciones');
            setItems(data.notificaciones ?? []);
            setSinLeer(data.sin_leer ?? 0);
            setError(false);
        } catch {
            setError(true);
            setItems([]);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const grupos = useMemo(() => {
        const g: [string, Notificacion[]][] = [];
        (items ?? []).forEach((n) => {
            const k = grupoDe(n.created_at);
            const ultimo = g[g.length - 1];
            if (ultimo && ultimo[0] === k) ultimo[1].push(n); else g.push([k, [n]]);
        });
        return g;
    }, [items]);

    const marcar = async (n: Notificacion) => {
        if (!n.leida) {
            setItems((xs) => xs?.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) ?? null);
            setSinLeer((s) => Math.max(0, s - 1));
            axios.post(`/api/notificaciones/${n.id}/leida`).catch(cargar);
        }
    };

    const abrir = (n: Notificacion) => {
        marcar(n);
        if (n.accion_url) router.visit(n.accion_url);
    };

    const marcarTodas = async () => {
        await axios.post('/api/notificaciones/leidas');
        cargar();
    };

    return (
        <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
                        <Bell size={20} className="text-indigo-300" /> Alertas
                    </h2>
                    <p className="mt-1 text-xs text-slate-400">
                        Avisos de vencimiento (FEFO) y de stock bajo que el sistema revisa cada hora.
                        {sinLeer > 0 && <span className="ml-1 font-semibold text-indigo-300">{sinLeer} sin leer.</span>}
                    </p>
                </div>
                {sinLeer > 0 && (
                    <button onClick={marcarTodas} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-indigo-400/50">
                        <CheckCheck size={15} /> Marcar todo como leído
                    </button>
                )}
            </div>

            {items === null && (
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-900" />)}
                </div>
            )}

            {items !== null && items.length === 0 && (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-700 px-6 py-16 text-center">
                    <BellOff size={28} className="text-slate-500" />
                    <p className="text-sm font-semibold text-slate-200">{error ? 'No se pudieron cargar las alertas' : 'No hay alertas'}</p>
                    <p className="max-w-sm text-xs text-slate-400">
                        {error ? 'Revisa la conexión e intenta de nuevo.' : 'Cuando un lote esté por vencer o un insumo quede por debajo de su mínimo, el aviso aparecerá aquí.'}
                    </p>
                </div>
            )}

            {grupos.map(([grupo, lista]) => (
                <section key={grupo} className="space-y-2">
                    <h3 className="px-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">{grupo}</h3>
                    {lista.map((n) => {
                        const tono = TONO[n.tipo] ?? TONO.info;
                        const Icono = (n.icono && ICONOS[n.icono]) || (n.tipo === 'critico' ? AlertTriangle : Info);
                        return (
                            <button key={n.id} type="button" onClick={() => abrir(n)}
                                className={`flex w-full items-start gap-4 rounded-2xl border border-l-4 border-slate-700/50 bg-slate-900/70 p-4 text-left transition hover:bg-slate-900 ${n.leida ? 'border-l-slate-700 opacity-60' : tono.barra}`}>
                                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tono.icono}`}><Icono size={18} /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-start justify-between gap-3">
                                        <span className="text-sm font-bold text-white">{n.titulo.replace(/^[^\p{L}\p{N}]+/u, '')}</span>
                                        <span className="shrink-0 text-[11px] text-slate-500">{hora(n.created_at)}</span>
                                    </span>
                                    <span className="mt-1 block text-xs leading-relaxed text-slate-400">{n.mensaje}</span>
                                </span>
                            </button>
                        );
                    })}
                </section>
            ))}
        </div>
    );
}
