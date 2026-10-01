import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

/**
 * Palanca de modelos (Ajustes → Motor RAG). Los modelos van de menor a mayor costo por consulta:
 * azul (económico) → verde (recomendado) → rojo (más costoso). Todo sale de /api/llm/espectro:
 * precisión y tokens medidos con rag:evaluar y precios oficiales guardados en la base de datos.
 */
interface ModeloEspectro {
    modelo: string; fuente: string; proveedor: string; nota: string | null;
    correctas: number; total: number; precision: number | null; tiempo_s: number;
    tokens_entrada: number; tokens_salida: number;
    usd_por_consulta: number; usd_por_consulta_pico: number | null;
    costo_vs_recomendado_pct: number | null; medido_el: string; precio_consultado_el: string;
}

// Matices HSL: azul 217°, verde 142°, rojo 0°. El verde cae exactamente en el modelo recomendado.
function colorEn(i: number, n: number, rec: number): string {
    if (n <= 1) return 'hsl(142 70% 40%)';
    const r = rec < 0 ? Math.floor((n - 1) / 2) : rec;
    const h = i <= r
        ? 217 + (142 - 217) * (r === 0 ? 1 : i / r)
        : 142 + (0 - 142) * ((i - r) / Math.max(1, n - 1 - r));
    return `hsl(${Math.round(h)} 70% 45%)`;
}

const fmtPct = (p: number | null) => p === null ? '—' : p === 0 ? 'igual' : `${p > 0 ? '+' : ''}${p.toLocaleString('es-CO')} %`;

export default function EspectroModelos({ modeloActual, onElegir }: {
    modeloActual: string; onElegir: (fuente: string, modelo: string) => void;
}) {
    const [modelos, setModelos] = useState<ModeloEspectro[]>([]);
    const [recomendado, setRecomendado] = useState<string | null>(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        axios.get('/api/llm/espectro')
            .then(({ data }) => { setModelos(data.modelos ?? []); setRecomendado(data.recomendado ?? null); })
            .catch(() => setError(true));
    }, []);

    const iRec = modelos.findIndex(m => m.modelo === recomendado);
    const iActual = modelos.findIndex(m => m.modelo === modeloActual);
    const indice = iActual >= 0 ? iActual : Math.max(iRec, 0);
    const n = modelos.length;
    const pos = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);

    const degradado = useMemo(() => modelos.map((_, i) => `${colorEn(i, n, iRec)} ${pos(i)}%`).join(', '), [modelos, iRec]);

    if (error) return <p className="text-xs pm-text-muted mb-4">No se pudo cargar la comparación de modelos.</p>;
    if (n === 0) return null;

    const m = modelos[indice];
    const color = colorEn(indice, n, iRec);
    const esRec = m.modelo === recomendado;
    const gratis = m.usd_por_consulta === 0;

    return (
        <div className="p-4 rounded-lg bg-slate-950/40 border border-slate-700/60 mb-4">
            <div className="flex items-baseline justify-between gap-3 mb-3">
                <span className="font-sans font-black text-[11px] uppercase tracking-wider pm-text-muted">Precisión y costo por modelo</span>
                <span className="text-[10px] pm-text-muted">{m.total} preguntas medidas · {m.medido_el}</span>
            </div>

            <div className="relative px-2">
                <input
                    type="range" min={0} max={n - 1} step={1} value={indice}
                    onChange={e => { const s = modelos[Number(e.target.value)]; onElegir(s.fuente, s.modelo); }}
                    aria-label="Modelo del asistente, de más económico a más costoso"
                    aria-valuetext={`${m.modelo}: precisión ${m.precision} %, costo ${fmtPct(m.costo_vs_recomendado_pct)} frente al recomendado`}
                    className="pm-espectro w-full"
                    style={{ ['--pm-espectro-fondo' as any]: `linear-gradient(90deg, ${degradado})`, ['--pm-espectro-pulgar' as any]: color }}
                />
                {/* Nombres en dos filas alternadas para que quepan; el primero y el último se alinean al borde. */}
                <div className="relative h-11 mt-1" aria-hidden="true">
                    {modelos.map((x, i) => {
                        const borde = i === 0 ? 'translate-x-0 items-start' : i === n - 1 ? '-translate-x-full items-end' : '-translate-x-1/2 items-center';
                        return (
                            <button key={x.modelo} type="button" tabIndex={-1} onClick={() => onElegir(x.fuente, x.modelo)}
                                className={`absolute top-0 flex flex-col ${borde}`} style={{ left: `${pos(i)}%` }}>
                                <span className={`w-0.5 rounded ${i % 2 ? 'h-6' : 'h-2'}`} style={{ background: colorEn(i, n, iRec) }} />
                                <span className={`whitespace-nowrap text-[10px] leading-tight ${i === indice ? 'font-bold pm-text' : 'pm-text-muted'}`}>
                                    {x.modelo === recomendado ? '★ ' : ''}{x.modelo}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="flex justify-between text-[10px] font-semibold pm-text-muted mt-2">
                    <span>← Más económico</span><span>Más costoso →</span>
                </div>
            </div>

            <div className="mt-3 rounded-lg border p-3" style={{ borderColor: color }}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: color }} aria-hidden="true" />
                    <span className="font-bold text-sm pm-text">{m.modelo}</span>
                    <span className="text-[11px] pm-text-muted">{m.proveedor}</span>
                    {esRec && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border pm-text" style={{ borderColor: color }}>Recomendado</span>}
                    {m.nota && !esRec && <span className="text-[10px] pm-text-muted">· {m.nota}</span>}
                </div>
                <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div><dt className="pm-text-muted">Precisión medida</dt><dd className="font-bold pm-text">{m.correctas}/{m.total} ({m.precision} %)</dd></div>
                    <div><dt className="pm-text-muted">Tiempo de respuesta</dt><dd className="font-bold pm-text">{m.tiempo_s.toLocaleString('es-CO')} s</dd></div>
                    <div><dt className="pm-text-muted">Tokens por consulta</dt><dd className="font-bold pm-text">≈ {(m.tokens_entrada + m.tokens_salida).toLocaleString('es-CO')}</dd></div>
                    <div><dt className="pm-text-muted">Costo frente al recomendado</dt>
                        <dd className="font-bold pm-text">{gratis ? 'Gratis' : fmtPct(m.costo_vs_recomendado_pct)}</dd></div>
                </dl>
                <p className="text-[10px] pm-text-muted mt-2">
                    {gratis ? 'Sin costo por token mientras dure la promoción del proveedor.'
                        : `≈ US$${(m.usd_por_consulta * 1000).toFixed(2)} por cada 1.000 consultas`}
                    {m.usd_por_consulta_pico !== null && ` (US$${(m.usd_por_consulta_pico * 1000).toFixed(2)} en hora pico)`}
                    {` · precios del ${m.precio_consultado_el}. La precisión no siempre sube con el costo: es la medida real de cada modelo.`}
                </p>
            </div>
        </div>
    );
}
