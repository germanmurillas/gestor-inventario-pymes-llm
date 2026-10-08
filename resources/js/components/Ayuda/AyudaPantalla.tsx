import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, CircleHelp, Lightbulb, X } from 'lucide-react';
import { AYUDA_PANTALLAS } from './contenido';

/** Botón «Ayuda» del encabezado: explica en pocos pasos la pantalla que está abierta. */
export default function AyudaPantalla({ vista }: { vista: string }) {
    const [abierta, setAbierta] = useState(false);
    const cerrarRef = useRef<HTMLButtonElement>(null);
    const botonRef = useRef<HTMLButtonElement>(null);
    const ayuda = AYUDA_PANTALLAS[vista];

    useEffect(() => {
        if (!abierta) return;
        cerrarRef.current?.focus();
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierta(false); };
        window.addEventListener('keydown', tecla);
        return () => { window.removeEventListener('keydown', tecla); botonRef.current?.focus(); };
    }, [abierta]);

    if (!ayuda) return null;

    return (
        <>
            <button ref={botonRef} onClick={() => setAbierta(true)} aria-haspopup="dialog"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/50 px-3 py-1.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                <CircleHelp size={16} aria-hidden="true" /> Ayuda
            </button>
            {/* Portal al body: el encabezado tiene backdrop-blur, que encerraría un elemento fixed dentro de él. */}
            {abierta && createPortal(
                <div className="fixed inset-0 z-[130] flex items-end justify-center bg-obsidiana/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={() => setAbierta(false)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="ayuda-titulo" onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-lg rounded-t-2xl border border-slate-700/50 bg-slate-900 p-5 shadow-2xl sm:rounded-2xl">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ayuda</p>
                                <h2 id="ayuda-titulo" className="text-xl font-black text-white">{ayuda.titulo}</h2>
                                <p className="text-sm text-slate-300">{ayuda.para}</p>
                            </div>
                            <button ref={cerrarRef} onClick={() => setAbierta(false)} aria-label="Cerrar ayuda"
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"><X size={18} /></button>
                        </div>
                        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-200">
                            {ayuda.pasos.map((p) => <li key={p}>{p}</li>)}
                        </ol>
                        {ayuda.consejo && <p className="mt-3 flex gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200"><Lightbulb size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{ayuda.consejo}</p>}
                        <a href="https://tesis.pymetory.com/manual-de-usuario.pdf" target="_blank" rel="noopener noreferrer"
                            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-300 hover:underline">
                            <BookOpen size={15} aria-hidden="true" /> Manual de usuario completo (PDF)
                        </a>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
