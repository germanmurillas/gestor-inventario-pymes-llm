import React, { useEffect, useState } from 'react';

/**
 * Cantidad en la unidad del insumo o en su presentación (p. ej. bultos de 50 kg). La empresa pidió
 * que el operario escriba «25 bultos» y el sistema lo pase a kilos (prueba con usuario, 8-oct-2026).
 * Siempre entrega el valor en la unidad del insumo.
 */
export default function CantidadConPresentacion({ unidad, presentacion, factor, valor, onCambio, etiqueta, max, inputProps = {} }: {
    unidad: string;
    presentacion?: string | null;
    factor?: number | null;
    valor: number;
    onCambio: (enUnidad: number) => void;
    etiqueta: string;
    max?: number;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
    const tiene = !!presentacion && !!factor && factor > 0;
    const [modo, setModo] = useState<'unidad' | 'presentacion'>('unidad');
    const [texto, setTexto] = useState(valor ? String(valor) : '');
    const k = modo === 'presentacion' && tiene ? (factor as number) : 1;
    const plural = (n: number) => (n === 1 ? presentacion : `${presentacion}s`);

    // Si el valor cambia desde afuera (p. ej. el botón «Máx»), se muestra en la unidad del insumo.
    useEffect(() => {
        if (!valor) { setTexto(''); return; }
        const n = parseFloat(texto.replace(',', '.'));
        if (Math.abs((Number.isFinite(n) ? n : 0) * k - valor) > 0.0005) { setModo('unidad'); setTexto(String(valor)); }
    }, [valor]);

    const cambiar = (t: string) => {
        setTexto(t);
        const n = parseFloat(t.replace(',', '.'));
        onCambio(Number.isFinite(n) && n > 0 ? Math.round(n * k * 1000) / 1000 : 0);
    };
    const cambiarModo = (m: 'unidad' | 'presentacion') => {
        setModo(m);
        const n = parseFloat(texto.replace(',', '.'));
        const km = m === 'presentacion' && tiene ? (factor as number) : 1;
        onCambio(Number.isFinite(n) && n > 0 ? Math.round(n * km * 1000) / 1000 : 0);
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">{etiqueta}</span>
                {tiene && (
                    <div role="group" aria-label="Unidad de la cantidad" className="flex rounded-xl border border-slate-700/50 p-0.5 text-xs">
                        {(['unidad', 'presentacion'] as const).map((m) => (
                            <button key={m} type="button" onClick={() => cambiarModo(m)} aria-pressed={modo === m}
                                className={`rounded-lg px-3 py-1.5 font-semibold ${modo === m ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}>
                                {m === 'unidad' ? unidad : `${presentacion}s de ${factor} ${unidad}`}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <input type="number" inputMode="decimal" step="0.001" min={0.001} value={texto} onChange={(e) => cambiar(e.target.value)} placeholder="0"
                aria-label={`${etiqueta} (${modo === 'presentacion' && tiene ? `${presentacion}s` : unidad})`} {...inputProps}
                className={`mt-2 w-full rounded-2xl border border-slate-700/50 bg-slate-800/50 px-5 py-4 text-2xl font-black text-white outline-none focus:ring-2 focus:ring-indigo-500 ${inputProps.className ?? ''}`} />
            {modo === 'presentacion' && tiene && valor > 0 && (
                <p className="mt-1 text-sm text-indigo-200">{texto} {plural(parseFloat(texto) || 0)} = <strong>{valor.toLocaleString('es-CO')} {unidad}</strong></p>
            )}
            {max !== undefined && valor > max && <p role="alert" className="mt-1 text-sm text-rose-300">Hay {max.toLocaleString('es-CO')} {unidad} disponibles.</p>}
        </div>
    );
}
