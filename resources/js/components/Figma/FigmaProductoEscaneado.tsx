import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle, Package } from 'lucide-react';
import CantidadConPresentacion from './CantidadConPresentacion';
import { pedir } from '../../lib/http';

export interface ProductoEscaneado {
    id: number; codigo: string; nombre: string; unidad: string; foto: string | null; codigo_barras: string;
    presentacion: string | null; factor: number | null; vida_util_dias: number | null; bodega_id: number | null;
    grupo: string | null; disponible: number; bodegas: { id: number; name: string }[];
}

const hoy = () => new Date();
const fecha = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Producto leído por su código de barras: dos botones grandes, «Entró» y «Salió», y solo la
 * cantidad (pedido de la empresa: «lo más intuitivo posible»). La entrada crea el lote con su
 * vencimiento por vida útil; la salida descuenta por FEFO.
 */
export default function FigmaProductoEscaneado({ producto, onOtro }: { producto: ProductoEscaneado; onOtro: () => void }) {
    const [accion, setAccion] = useState<'entro' | 'salio' | null>(null);
    const [cantidad, setCantidad] = useState(0);
    const terminado = producto.grupo === 'producto_terminado';
    const sugerido = terminado ? `${producto.codigo}-${fecha(hoy()).slice(2).replace(/-/g, '')}-${hoy().toTimeString().slice(0, 5).replace(':', '')}` : '';
    const [lote, setLote] = useState(sugerido);
    const [vence, setVence] = useState(producto.vida_util_dias ? fecha(new Date(Date.now() + producto.vida_util_dias * 864e5)) : '');
    const [bodega, setBodega] = useState(producto.bodega_id ? String(producto.bodega_id) : '');
    const [motivo, setMotivo] = useState('produccion');
    const [error, setError] = useState('');
    const [listo, setListo] = useState('');
    const [guardando, setGuardando] = useState(false);

    const registrar = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setGuardando(true);
        if (accion === 'entro') {
            router.post(`/inventory/material/${producto.id}/lotes`, { batch_number: lote, quantity: cantidad, expiration_date: vence, bodega_id: bodega }, {
                preserveScroll: true,
                onError: (errs: any) => setError(Object.values(errs)[0] as string),
                onSuccess: () => setListo(`Entraron ${cantidad.toLocaleString('es-CO')} ${producto.unidad} de ${producto.nombre}.`),
                onFinish: () => setGuardando(false),
            });
            return;
        }
        try {
            await pedir('/inventory/consume-fefo', { method: 'POST', body: { material_id: producto.id, quantity: cantidad, reason: motivo } });
            setListo(`Salieron ${cantidad.toLocaleString('es-CO')} ${producto.unidad} de ${producto.nombre} (del lote que vence primero).`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const campo = 'mt-1 w-full rounded-xl border border-slate-700/50 bg-slate-900/70 px-3 py-3 text-base text-white';
    return (
        <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-3xl border border-slate-700/40 bg-slate-800/40 p-4">
                {producto.foto
                    ? <img src={producto.foto} alt="" className="h-24 w-24 shrink-0 rounded-2xl bg-white object-contain" />
                    : <div className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-slate-800 text-slate-400"><Package size={32} aria-hidden="true" /></div>}
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-400">Código {producto.codigo} · barras {producto.codigo_barras}</p>
                    <h2 className="text-2xl font-black text-white">{producto.nombre}</h2>
                    <p className="text-sm text-slate-300">Hay {producto.disponible.toLocaleString('es-CO')} {producto.unidad} disponibles</p>
                </div>
            </div>

            {listo ? (
                <div role="status" className="space-y-4 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center">
                    <CheckCircle size={40} className="mx-auto text-emerald-300" aria-hidden="true" />
                    <p className="text-lg font-bold text-emerald-100">{listo}</p>
                    <button onClick={onOtro} className="w-full rounded-2xl bg-indigo-600 py-4 text-lg font-bold text-white">Escanear otro producto</button>
                </div>
            ) : !accion ? (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setAccion('entro')} className="flex flex-col items-center gap-2 rounded-3xl bg-emerald-600 py-8 text-2xl font-black text-white active:scale-[0.98]">
                        <ArrowDownToLine size={36} aria-hidden="true" /> Entró
                    </button>
                    <button onClick={() => setAccion('salio')} className="flex flex-col items-center gap-2 rounded-3xl bg-rose-600 py-8 text-2xl font-black text-white active:scale-[0.98]">
                        <ArrowUpFromLine size={36} aria-hidden="true" /> Salió
                    </button>
                </div>
            ) : (
                <form onSubmit={registrar} className="space-y-4 rounded-3xl border border-slate-700/40 bg-slate-800/40 p-5">
                    <h3 className="text-xl font-black text-white">{accion === 'entro' ? '¿Cuánto entró?' : '¿Cuánto salió?'}</h3>
                    <CantidadConPresentacion etiqueta="Cantidad" unidad={producto.unidad} presentacion={producto.presentacion} factor={producto.factor}
                        valor={cantidad} onCambio={setCantidad} max={accion === 'salio' ? producto.disponible : undefined} inputProps={{ autoFocus: true }} />
                    {accion === 'entro' ? (
                        <details className="text-sm text-slate-300" open={!terminado}>
                            <summary className="cursor-pointer font-semibold">Lote, vencimiento y bodega {terminado && '(ya están llenos)'}</summary>
                            <label className="mt-3 block">Número de lote<input className={campo} required maxLength={50} value={lote} onChange={(e) => setLote(e.target.value.toUpperCase())} placeholder="El de la factura o la etiqueta" /></label>
                            <label className="mt-3 block">Vence<input className={campo} required type="date" value={vence} onChange={(e) => setVence(e.target.value)} /></label>
                            <label className="mt-3 block">Bodega
                                <select className={campo} required value={bodega} onChange={(e) => setBodega(e.target.value)}>
                                    <option value="">Elegir…</option>
                                    {producto.bodegas.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </label>
                        </details>
                    ) : (
                        <label className="block text-sm text-slate-300">¿Para qué salió?
                            <select className={campo} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                                <option value="produccion">Producción</option>
                                <option value="venta">Venta</option>
                                <option value="desperdicio">Desperdicio</option>
                            </select>
                        </label>
                    )}
                    {error && <p role="alert" className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
                    <div className="flex gap-2">
                        <button type="button" onClick={() => { setAccion(null); setError(''); }} className="flex-1 rounded-2xl border border-slate-600 py-4 font-semibold text-slate-200">Volver</button>
                        <button type="submit" disabled={guardando || cantidad <= 0} className={`flex-[2] rounded-2xl py-4 text-lg font-black text-white disabled:opacity-50 ${accion === 'entro' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                            {guardando ? 'Guardando…' : accion === 'entro' ? 'Registrar entrada' : 'Registrar salida'}
                        </button>
                    </div>
                </form>
            )}
            {!listo && <button onClick={onOtro} className="w-full text-sm font-semibold text-slate-400 underline">No es este producto: escanear otro</button>}
        </div>
    );
}
