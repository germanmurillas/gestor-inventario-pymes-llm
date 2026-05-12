import React, { useState, useEffect } from 'react';
import { ArrowLeft, ScanLine, Clock, User, Package, ArrowDown, ArrowUp, Loader2 } from 'lucide-react';

interface ScanRecord {
    id: number;
    material: string;
    code: string;
    batch: string;
    user: string;
    type: 'entrada' | 'salida';
    quantity: number;
    reason: string;
    description: string;
    date: string;
    time: string;
}

const FigmaScanHistory = ({ onBack }: { onBack: () => void }) => {
    const [scans, setScans] = useState<ScanRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/inventory/qr-history')
            .then(res => {
                if (!res.ok) throw new Error('Error al cargar historial');
                return res.json();
            })
            .then(data => {
                setScans(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button
                        type="button"
                        onClick={onBack}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold uppercase tracking-tight">Historial de Escaneos QR</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
                            Registro de check-ins y check-outs vía código QR
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl">
                    <ScanLine size={14} className="text-indigo-600" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {scans.length} escaneos
                    </span>
                </div>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-32">
                    <Loader2 size={32} className="animate-spin text-indigo-400" />
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-100 p-8 rounded-[2rem] text-center">
                    <p className="text-red-600 font-bold text-sm">{error}</p>
                </div>
            )}

            {!loading && !error && scans.length === 0 && (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] py-32 flex flex-col items-center justify-center text-slate-300">
                    <ScanLine size={56} className="mb-6 opacity-20" />
                    <p className="text-sm font-black uppercase tracking-[0.3em] opacity-40 text-slate-900">
                        Sin escaneos QR registrados
                    </p>
                    <p className="text-[10px] text-slate-400 mt-2">
                        Los escaneos aparecerán aquí una vez se registren
                    </p>
                </div>
            )}

            {!loading && !error && scans.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Tipo</th>
                                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Material</th>
                                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Lote</th>
                                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Cantidad</th>
                                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Usuario</th>
                                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Fecha</th>
                                    <th className="px-6 py-4 font-black text-slate-400 uppercase text-[10px] tracking-widest">Nota</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {scans.map((scan) => (
                                    <tr key={scan.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {scan.type === 'entrada' ? (
                                                    <>
                                                        <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                                                            <ArrowDown size={14} className="text-green-600" />
                                                        </div>
                                                        <span className="text-[10px] font-black text-green-700 uppercase">Entrada</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                                                            <ArrowUp size={14} className="text-red-600" />
                                                        </div>
                                                        <span className="text-[10px] font-black text-red-700 uppercase">Salida</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{scan.material}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{scan.code}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-sm font-bold text-slate-700 font-mono">{scan.batch}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-sm font-black text-slate-900">{scan.quantity} kg</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <User size={12} className="text-slate-400" />
                                                <span className="text-xs text-slate-500">{scan.user}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div>
                                                <div className="text-xs text-slate-500">{scan.date}</div>
                                                <div className="text-[10px] text-slate-400 italic">{scan.time}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-[10px] text-slate-400 italic max-w-[200px] truncate block">
                                                {scan.description || '—'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Stats Summary */}
            {!loading && !error && scans.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Escaneos</div>
                        <div className="text-2xl font-black text-slate-900 mt-2">{scans.length}</div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entradas (Check-in)</div>
                        <div className="text-2xl font-black text-green-600 mt-2">
                            {scans.filter(s => s.type === 'entrada').length}
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salidas (Check-out)</div>
                        <div className="text-2xl font-black text-red-600 mt-2">
                            {scans.filter(s => s.type === 'salida').length}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FigmaScanHistory;
