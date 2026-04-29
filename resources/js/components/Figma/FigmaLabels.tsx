import React, { useState } from 'react';
import { Tag, Box, Printer, Download, QrCode, Search, Package } from 'lucide-react';
import QRCode from "react-qr-code";

const FigmaLabels = ({ lotes = [] }: { lotes: any[] }) => {
    const [selectedLote, setSelectedLote] = useState<any>(null);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight">Etiquetado & QR</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Generación de etiquetas físicas para trazabilidad</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                
                {/* 1. Selector de Lotes */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Seleccione un lote para etiquetar</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {lotes.map((lote) => (
                            <div 
                                key={lote.id} 
                                onClick={() => setSelectedLote(lote)}
                                className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer group ${selectedLote?.id === lote.id ? 'border-indigo-600 bg-indigo-50/30 shadow-xl shadow-indigo-100' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                        <Package size={20} />
                                    </div>
                                    <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                        {lote.codigo}
                                    </div>
                                </div>
                                <h3 className="font-black text-slate-900 uppercase truncate">{lote.material?.name || 'Producto'}</h3>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Lote: {lote.lote}</span>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase italic">Seleccionar</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Vista Previa de Etiqueta (Previsualización de Impresión) */}
                <div className="space-y-6">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Previsualización de Etiqueta</div>
                    
                    {selectedLote ? (
                        <div className="space-y-8">
                            {/* Etiqueta Física */}
                            <div id="printable-label" className="bg-white border-2 border-slate-900 rounded-lg p-8 shadow-2xl space-y-6 flex flex-col items-center">
                                <div className="text-center space-y-1">
                                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Pymetory System</div>
                                    <div className="text-lg font-black uppercase text-slate-900">{selectedLote.material?.name}</div>
                                </div>

                                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-inner">
                                    <QRCode 
                                        value={JSON.stringify({
                                            id: selectedLote.id,
                                            sku: selectedLote.codigo,
                                            batch: selectedLote.lote,
                                            v: "1.0"
                                        })}
                                        size={180}
                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                        viewBox={`0 0 256 256`}
                                    />
                                </div>

                                <div className="w-full grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                                    <div className="space-y-1">
                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Código Lote</div>
                                        <div className="text-[10px] font-bold text-slate-900 uppercase">{selectedLote.lote}</div>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Vencimiento</div>
                                        <div className="text-[10px] font-bold text-red-600 uppercase">{selectedLote.vencimiento}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Controles */}
                            <div className="flex gap-4">
                                <button 
                                    onClick={handlePrint}
                                    className="flex-1 flex items-center justify-center gap-3 bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-slate-200"
                                >
                                    <Printer size={18} />
                                    <span>Imprimir Etiqueta</span>
                                </button>
                                <button className="p-5 bg-white border border-slate-200 text-slate-400 rounded-[2rem] hover:text-indigo-600 hover:border-indigo-100 transition-all">
                                    <Download size={20} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[400px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 space-y-4">
                            <QrCode size={60} strokeWidth={1} className="opacity-20 translate-y-2 animate-pulse" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Esperando selección...</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Print styles */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-label, #printable-label * { visibility: visible; }
                    #printable-label { position: absolute; left: 0; top: 0; width: 100%; border: none !important; shadow: none !important; }
                }
            `}</style>
        </div>
    );
};

export default FigmaLabels;
