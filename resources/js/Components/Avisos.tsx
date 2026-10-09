import React, { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

export type Aviso = { id: number; tipo: 'exito' | 'error'; texto: string };

/** Muestra un aviso desde cualquier parte de la interfaz. */
export function avisar(tipo: Aviso['tipo'], texto: string): void {
    window.dispatchEvent(new CustomEvent('pm-aviso', { detail: { tipo, texto } }));
}

let siguiente = 1;

/**
 * Avisos globales: confirmaciones y errores de las acciones (mensajes flash del servidor y los que
 * envían las pantallas con avisar()). También atrapa las respuestas inválidas de Inertia (por
 * ejemplo, una página de error HTML), que de otro modo se mostrarían en un recuadro técnico.
 */
export default function Avisos({ flashInicial }: { flashInicial?: { success?: string | null; error?: string | null } }) {
    const [avisos, setAvisos] = useState<Aviso[]>([]);

    const agregar = (tipo: Aviso['tipo'], texto: string) => {
        const id = siguiente++;
        setAvisos((a) => [...a.filter((x) => x.texto !== texto), { id, tipo, texto }].slice(-4));
        window.setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === 'error' ? 9000 : 5000);
    };

    useEffect(() => {
        if (flashInicial?.success) agregar('exito', flashInicial.success);
        if (flashInicial?.error) agregar('error', flashInicial.error);

        const propio = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.texto) agregar(d.tipo === 'error' ? 'error' : 'exito', d.texto); };
        window.addEventListener('pm-aviso', propio);

        const quitarExito = router.on('success', (e) => {
            const f = (e.detail.page.props as any)?.flash;
            if (f?.success) agregar('exito', f.success);
            if (f?.error) agregar('error', f.error);
        });
        // Respuesta que no es de Inertia (página de error, sesión vencida): aviso en vez del recuadro técnico.
        const quitarInvalido = router.on('invalid', (e) => {
            e.preventDefault();
            const estado = e.detail.response?.status ?? 0;
            agregar('error', estado === 419 || estado === 401
                ? 'Su sesión expiró. Recargue la página (F5) e ingrese de nuevo.'
                : estado >= 500 ? 'El servidor tuvo un problema y no se guardó nada. Intente de nuevo en un momento.'
                : 'No se pudo completar la operación. Recargue la página e intente de nuevo.');
        });
        const quitarExcepcion = router.on('exception', (e) => {
            e.preventDefault();
            agregar('error', 'No hay conexión con el servidor. Revise el internet e intente de nuevo.');
        });
        return () => { window.removeEventListener('pm-aviso', propio); quitarExito(); quitarInvalido(); quitarExcepcion(); };
    }, []);

    return (
        <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[200] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6">
            {avisos.map((a) => (
                <div key={a.id} role={a.tipo === 'error' ? 'alert' : 'status'}
                    className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border p-4 text-sm shadow-2xl backdrop-blur ${a.tipo === 'error'
                        ? 'border-rose-500/40 bg-rose-950/90 text-rose-100' : 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100'}`}>
                    {a.tipo === 'error' ? <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <CircleCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
                    <p className="flex-1">{a.texto}</p>
                    <button onClick={() => setAvisos((x) => x.filter((y) => y.id !== a.id))} aria-label="Cerrar aviso" className="shrink-0 rounded-lg p-0.5 opacity-80 hover:opacity-100"><X size={16} /></button>
                </div>
            ))}
        </div>
    );
}
