import React, { useState, useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { ArrowLeft, ScanLine, Package, AlertTriangle, Loader2, CheckCircle, Camera, Keyboard, QrCode, ArrowDown, ArrowUp } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface FigmaQRScannerProps {
    onBack: () => void;
    prefillLote?: any;
}

const FigmaQRScanner = ({ onBack, prefillLote }: FigmaQRScannerProps) => {
    const [step, setStep] = useState<'SCAN' | 'ACTION' | 'DONE'>('SCAN');
    const [inputMode, setInputMode] = useState<'manual' | 'camera'>('manual');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [qrInput, setQrInput] = useState('');
    const [decodedLote, setDecodedLote] = useState<any>(prefillLote || null);
    const [scanError, setScanError] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm({
        qr_data: '',
        action: '' as 'entrada' | 'salida' | '',
        quantity: 0,
        description: '',
    });

    // Camara: arrancar/parar segun modo — corregido contra StrictMode (auditado Opus 4.8)
    useEffect(() => {
        if (inputMode !== 'camera' || step !== 'SCAN') return;

        let cancelled = false;
        const scanner = new Html5Qrcode('qr-reader');
        scannerRef.current = scanner;

        const safeStop = () => {
            if (scanner.getState && scanner.getState() === 2) {
                return scanner.stop().then(() => scanner.clear()).catch(() => {});
            }
            return Promise.resolve();
        };

        const onScan = (decodedText: string) => {
            safeStop();
            try {
                const parsed = JSON.parse(decodedText);
                if (!parsed.id || !parsed.v) { setScanError('QR invalido'); return; }
                setQrInput(decodedText);
                setDecodedLote(parsed);
                setData('qr_data', decodedText);
                setStep('ACTION');
            } catch { setScanError('No se pudo leer el codigo.'); }
        };

        scanner
            .start({ facingMode: 'environment' },
                   { fps: 10, qrbox: { width: 250, height: 250 } },
                   onScan, undefined)
            .then(() => { if (cancelled) safeStop(); })
            .catch(async () => {
                // Fallback: portatil sin camara trasera → usa la primera disponible
                try {
                    const cams = await Html5Qrcode.getCameras();
                    if (cams.length && !cancelled) {
                        await scanner.start(cams[0].id,
                            { fps: 10, qrbox: { width: 250, height: 250 } },
                            onScan, undefined);
                    } else {
                        setScanError('No se detecto ninguna camara.');
                    }
                } catch (e: any) {
                    setScanError('Camara no disponible: ' + (e?.message || e));
                }
            });

        return () => { cancelled = true; safeStop(); };
    }, [inputMode, step]);

    const handleDecode = () => {
        setScanError('');
        try {
            const parsed = JSON.parse(qrInput);
            if (!parsed.id || !parsed.v) {
                setScanError('Código QR inválido: faltan campos requeridos (id, v).');
                return;
            }
            setDecodedLote(parsed);
            setData('qr_data', qrInput);
            setStep('ACTION');
        } catch {
            setScanError('No se pudo leer el código. Asegúrate de escanear una etiqueta Pymetory válida.');
        }
    };

    const handleActionSelect = (action: 'entrada' | 'salida') => {
        setData('action', action);
    };

     const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const qty = data.quantity || 0;
        const msg = data.action === 'salida'
            ? `¿Retirar ${qty} unidades del stock? Esta acción se registra en el Kardex.`
            : `¿Ingresar ${qty} unidades al stock?`;
        if (!confirm(msg)) return;
        post('/inventory/qr-scan', {
            onSuccess: () => {
                reset();
                setStep('DONE');
                setTimeout(() => {
                    setStep('SCAN');
                    setQrInput('');
                    setDecodedLote(null);
                    setScanError('');
                }, 3000);
            },
        });
    };

    const handlePrefillManual = () => {
        if (prefillLote) {
            const qrStr = JSON.stringify({
                id: prefillLote.id,
                sku: prefillLote.codigo,
                batch: prefillLote.lote,
                v: '1.0'
            });
            setQrInput(qrStr);
            setDecodedLote(prefillLote);
            setData('qr_data', qrStr);
            setStep('ACTION');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20">
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
                        <h2 className="text-xl font-bold uppercase tracking-tight">
                            {step === 'DONE' ? 'Operación Completada' : 'Escáner QR'}
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                            {step === 'SCAN' && 'Escanee o ingrese el código QR del lote'}
                            {step === 'ACTION' && 'Seleccione el tipo de operación'}
                            {step === 'DONE' && 'Movimiento registrado en el Kardex'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Scanner */}
                <div className="lg:col-span-2 space-y-6">
                    {step === 'SCAN' && (
                        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/30 rounded-[2.5rem] p-10 shadow-sm space-y-8">
                            {/* Mode Toggle */}
                            <div className="flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setInputMode('manual')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                        inputMode === 'manual'
                                            ? 'bg-obsidiana text-white shadow-lg'
                                            : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <Keyboard size={16} />
                                    <span>Manual</span>
                                </button>
                                <button
                                    onClick={() => setInputMode('camera')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                                        inputMode === 'camera'
                                            ? 'bg-indigo-600 text-white shadow-lg'
                                            : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
                                    }`}
                                >
                                    <Camera size={16} />
                                    <span>Camara</span>
                                </button>
                            </div>

                            {/* Camera View o Placeholder */}
                            {inputMode === 'camera' ? (
                                <div id="qr-reader" className="w-full rounded-2xl overflow-hidden" />
                            ) : (
                            <div className="relative bg-slate-900 rounded-[2rem] aspect-video flex flex-col items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 opacity-10">
                                    <div className="absolute top-0 left-0 w-full h-px bg-indigo-400 animate-pulse" />
                                    <div className="absolute top-1/4 left-0 w-full h-px bg-indigo-400/50" />
                                    <div className="absolute top-3/4 left-0 w-full h-px bg-indigo-400/50" />
                                </div>
                                <div className="relative z-10 w-48 h-48 border-2 border-indigo-500/30 rounded-3xl flex items-center justify-center">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-2xl" />
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-2xl" />
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-2xl" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-2xl" />
                                    <div className="h-px w-full bg-indigo-500/60 absolute animate-scan" />
                                    <QrCode size={80} className="text-indigo-400/40" />
                                </div>
                                <p className="relative z-10 text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-6">
                                    Seleccione Camara para escanear
                                </p>
                            </div>
                            )}

                            {/* Manual Input */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                                    Código QR (JSON)
                                </label>
                                <div className="flex gap-4">
                                    <textarea
                                        value={qrInput}
                                        onChange={e => {
                                            setQrInput(e.target.value);
                                            setScanError('');
                                        }}
                                        placeholder='{"id":1,"sku":"MAT-001","batch":"L-001","v":"1.0"}'
                                        className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 transition-all"
                                    />
                                    <button
                                        onClick={handleDecode}
                                        disabled={!qrInput.trim()}
                                        className="px-8 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-lg"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <ScanLine size={24} />
                                            <span>Leer</span>
                                        </div>
                                    </button>
                                </div>
                                {scanError && (
                                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 p-4 rounded-2xl">
                                        <AlertTriangle size={16} className="text-red-500 shrink-0" />
                                        <p className="text-[10px] font-bold text-red-400 uppercase">{scanError}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 'ACTION' && decodedLote && (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Item Details */}
                            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/30 rounded-[2.5rem] p-10 shadow-sm space-y-6">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-700/40 pb-2">
                                    <Package size={14} />
                                    <span>Producto Escaneado</span>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SKU / Código</div>
                                        <div className="text-lg font-black text-white mt-1">{decodedLote.sku || decodedLote.codigo || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lote / Batch</div>
                                        <div className="text-lg font-black text-white mt-1">{decodedLote.batch || decodedLote.lote || 'N/A'}</div>
                                    </div>
                                </div>

                                <div className="bg-indigo-500/10 p-6 rounded-3xl border border-indigo-500/25 flex gap-4 items-center">
                                    <QrCode size={20} className="text-indigo-500 shrink-0" />
                                    <p className="text-[10px] text-indigo-300/60 font-bold uppercase tracking-tight leading-relaxed">
                                        Código verificado v{decodedLote.v}. Seleccione el tipo de movimiento a registrar.
                                    </p>
                                </div>
                            </div>

                            {/* Action Selection */}
                            <div className="grid grid-cols-2 gap-6">
                                <button
                                    type="button"
                                    onClick={() => handleActionSelect('entrada')}
                                    className={`p-8 rounded-[2rem] border-2 transition-all text-center ${
                                        data.action === 'entrada'
                                            ? 'border-green-500 bg-green-500/10 shadow-xl shadow-green-100'
                                            : 'border-slate-700/30 bg-slate-900/80 backdrop-blur-xl hover:border-green-500/40'
                                    }`}
                                >
                                    <div className="flex flex-col items-center gap-4">
                                        <div className={`p-4 rounded-2xl ${data.action === 'entrada' ? 'bg-green-500 text-white' : 'bg-green-500/10 text-green-400'}`}>
                                            <ArrowDown size={28} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black uppercase tracking-tight">Entrada</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Check-in de Material</div>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleActionSelect('salida')}
                                    className={`p-8 rounded-[2rem] border-2 transition-all text-center ${
                                        data.action === 'salida'
                                            ? 'border-red-500 bg-red-500/10 shadow-xl shadow-red-100'
                                            : 'border-slate-700/30 bg-slate-900/80 backdrop-blur-xl hover:border-red-500/40'
                                    }`}
                                >
                                    <div className="flex flex-col items-center gap-4">
                                        <div className={`p-4 rounded-2xl ${data.action === 'salida' ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-400'}`}>
                                            <ArrowUp size={28} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black uppercase tracking-tight">Salida</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Check-out / Despacho</div>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {data.action && (
                                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/30 rounded-[2.5rem] p-10 shadow-sm space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-200 uppercase tracking-tight">
                                            Cantidad{decodedLote?.unit ? ` (${decodedLote.unit})` : ''}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            required
                                            value={data.quantity || ''}
                                            onChange={e => setData('quantity', parseFloat(e.target.value) || 0)}
                                            placeholder="0.00"
                                            className={`w-full bg-slate-800/50 border ${errors.quantity ? 'border-red-500' : 'border-slate-700/50'} rounded-2xl px-5 py-4 text-lg font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all`}
                                        />
                                        {errors.quantity && (
                                            <p className="text-red-500 text-[10px] font-bold uppercase">{errors.quantity}</p>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-slate-200 uppercase tracking-tight">
                                            Nota / Observación
                                        </label>
                                        <textarea
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            placeholder="Ej: Retorno de producción, material de cuarentena..."
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 transition-all placeholder:italic"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing || data.quantity <= 0}
                                        className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg disabled:opacity-30 ${
                                            data.action === 'entrada'
                                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                                : 'bg-red-600 hover:bg-red-700 text-white'
                                        }`}
                                    >
                                        {processing ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Loader2 size={18} className="animate-spin" />
                                                Registrando...
                                            </span>
                                        ) : (
                                            `Registrar ${data.action === 'entrada' ? 'Entrada' : 'Salida'}`
                                        )}
                                    </button>
                                </div>
                            )}
                        </form>
                    )}

                    {step === 'DONE' && (
                        <div className="bg-slate-900/80 backdrop-blur-xl border border-green-500/25 rounded-[2.5rem] p-16 shadow-sm flex flex-col items-center text-center space-y-6">
                            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle size={40} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase">Movimiento Registrado</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                                    El Kardex ha sido actualizado exitosamente
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setStep('SCAN');
                                    setQrInput('');
                                    setDecodedLote(null);
                                    setScanError('');
                                }}
                                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
                            >
                                Nuevo Escaneo
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Panel: Info / Recent */}
                <div className="space-y-6">
                    <div className="bg-obsidiana text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute -bottom-10 -right-10 opacity-5">
                            <QrCode size={200} />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <div>
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Formato QR</div>
                                <div className="text-xs font-mono text-indigo-400 mt-2 bg-slate-900/80 backdrop-blur-xl/5 p-3 rounded-xl break-all">
                                    {'{"id":1,"sku":"MAT-001","batch":"L-001","v":"1.0"}'}
                                </div>
                            </div>
                            <div className="pt-4 border-t border-white/10">
                                <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Compatibilidad</div>
                                <p className="text-[10px] text-white/60 mt-2 leading-relaxed">
                                    Escanee etiquetas generadas desde <span className="text-indigo-400 font-bold">Etiquetas & QR</span>.
                                    Cada escaneo queda registrado en el Kardex con usuario, timestamp y razón "qr_scan".
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-500/10 p-6 rounded-3xl border border-indigo-500/25 space-y-3">
                        <div className="flex items-center gap-2">
                            <Camera size={14} className="text-indigo-500" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Nota</span>
                        </div>
                        <p className="text-[10px] text-indigo-300/60 leading-relaxed">
                            Para escaneo con cámara se requiere HTTPS. Use el ingreso manual como alternativa en entornos de desarrollo local.
                        </p>
                    </div>
                </div>
            </div>

            {/* Animation style */}
            <style>{`
                @keyframes scan {
                    0%, 100% { top: 0%; }
                    50% { top: 90%; }
                }
                .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default FigmaQRScanner;
