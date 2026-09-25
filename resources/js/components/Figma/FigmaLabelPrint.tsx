import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Printer, Barcode, QrCode, CheckSquare, Square, X, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCode from 'react-qr-code';
import * as QRCodeLib from 'qrcode';

interface LoteItem {
    id: number;
    codigo: string;
    material_name: string;
    unit: string;
    lote: string;
    cantidad: number;
    vencimiento: string;
    bodega: string;
    status: string;
    unit_cost?: number;
}

type LabelType = 'CODE128' | 'QR';

export default function FigmaLabelPrint({ initialLotes = [] }: { initialLotes: any[] }) {
    const [lotes, setLotes] = useState<LoteItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [labelType, setLabelType] = useState<LabelType>('CODE128');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const labelsPerPage = 12;
    const barcodeRefs = useRef<Map<number, SVGSVGElement>>(new Map());
    const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

    useEffect(() => {
        fetchLotes();
    }, []);

    const fetchLotes = async () => {
        try {
            const res = await fetch('/inventory/labels', {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (res.ok) {
                const data = await res.json();
                setLotes(data.lotes || []);
            }
        } catch (e) {
            if (initialLotes.length > 0) {
                setLotes(initialLotes);
            }
        } finally {
            setLoading(false);
        }
    };

    const filteredLotes = lotes.filter((l) => {
        const term = searchTerm.toLowerCase();
        return (
            l.material_name?.toLowerCase().includes(term) ||
            l.codigo?.toLowerCase().includes(term) ||
            l.lote?.toLowerCase().includes(term) ||
            l.bodega?.toLowerCase().includes(term)
        );
    });

    const selectedLotes = lotes.filter((l) => selectedIds.has(l.id));

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        const filteredIds = new Set(filteredLotes.map((l) => l.id));
        const allSelected = filteredLotes.every((l) => selectedIds.has(l.id));
        if (allSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                filteredIds.forEach((id) => next.delete(id));
                return next;
            });
        } else {
            setSelectedIds((prev) => new Set([...prev, ...filteredIds]));
        }
    };

    const allFilteredSelected = filteredLotes.length > 0 && filteredLotes.every((l) => selectedIds.has(l.id));

    const totalPages = Math.ceil(selectedLotes.length / labelsPerPage);
    const pagedLotes = selectedLotes.slice(currentPage * labelsPerPage, (currentPage + 1) * labelsPerPage);

    const labelValue = (lote: LoteItem) => {
        return JSON.stringify({
            id: lote.id,
            sku: lote.codigo,
            batch: lote.lote,
            v: '1.0',
        });
    };

    const handlePrint = async () => {
        // Cargar perfil activo (mismas keys que Settings → Impresion de Etiquetas)
        let L: any = { labelW: 250, labelH: 150, qrSize: 100, qrX: 75, qrY: 25, nameX: 10, nameY: 10, skuX: 10, skuY: 110, loteX: 130, loteY: 110, venceX: 10, venceY: 128, showName: true, showSku: true, showLote: true, showVence: true, cols: 1, gapX: 10, gapY: 10, nameFontSize: 11, skuFontSize: 9, loteFontSize: 9, venceFontSize: 9, barcodeSize: 50, barcodeX: 75, barcodeY: 30 };
        try {
            const profiles = JSON.parse(window.localStorage.getItem('ensayo4_profiles') || '[]');
            const active = parseInt(window.localStorage.getItem('ensayo4_activeProfile') || '0', 10);
            if (profiles[active]?.config) L = { ...L, ...profiles[active].config };
        } catch {}

        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) { alert('Permite ventanas emergentes para imprimir.'); return; }
        w.document.write('<p style="font-family:Arial;padding:1in;text-align:center">Generando etiquetas…</p>');

        const codes: Record<number, string> = {};
        for (const l of selectedLotes) {
            if (labelType === 'QR') {
                codes[l.id] = await QRCodeLib.toDataURL(JSON.stringify({ id: l.id, sku: l.codigo, batch: l.lote, v: '1.0' }), { width: L.qrSize, margin: 2, color: { dark: '#000', light: '#fff' } });
            } else {
                const c = document.createElement('canvas');
                JsBarcode(c, (l.codigo || '') + '-' + (l.lote || ''), { format: 'CODE128', width: 2, height: L.barcodeSize, displayValue: false, margin: 8, background: '#fff', lineColor: '#000' });
                codes[l.id] = c.toDataURL('image/png');
            }
        }

        const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const cols = Math.max(1, L.cols || 1);
        const gapX = L.gapX || 10;
        const gapY = L.gapY || 10;
        const rows = Math.ceil(selectedLotes.length / cols);

        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (cols * L.labelW + (cols - 1) * gapX) + '" height="' + (rows * L.labelH + (rows - 1) * gapY) + '">' +
            selectedLotes.map((l, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const x = col * (L.labelW + gapX);
                const y = row * (L.labelH + gapY);
                return '<g transform="translate(' + x + ',' + y + ')">' +
                '<rect width="' + L.labelW + '" height="' + L.labelH + '" fill="white" stroke="#ccc" stroke-width="1" rx="4"/>' +
                (L.showName ? '<text x="' + L.nameX + '" y="' + (L.nameY + L.nameFontSize) +
                    '" font-size="' + L.nameFontSize + '" font-weight="bold" fill="#000">' + esc(l.material_name) + '</text>' : '') +
                '<image href="' + (codes[l.id] || '') + '" x="' + (labelType === 'QR' ? L.qrX : L.barcodeX) + '" y="' + (labelType === 'QR' ? L.qrY : L.barcodeY) +
                    '" width="' + (labelType === 'QR' ? L.qrSize : L.qrSize) + '" height="' + (labelType === 'QR' ? L.qrSize : L.barcodeSize) + '"/>' +
                (L.showSku ? '<text x="' + L.skuX + '" y="' + L.skuY +
                    '" font-size="' + L.skuFontSize + '" font-weight="bold" fill="#000">' + esc(l.codigo) + '</text>' : '') +
                (L.showLote ? '<text x="' + L.loteX + '" y="' + L.loteY +
                    '" font-size="' + L.loteFontSize + '" fill="#000">Lote: ' + esc(l.lote) + '</text>' : '') +
                (L.showVence ? '<text x="' + L.venceX + '" y="' + L.venceY +
                    '" font-size="' + L.venceFontSize + '" fill="#c00">Vence: ' + esc(l.vencimiento) + '</text>' : '') +
                '</g>';
            }).join('') + '</svg>';

        const isE2E = window.localStorage.getItem('e2e') === '1';

        w.document.open();
        w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>PYMETORY Labels</title><style>body{margin:20px}@page{size:auto;margin:10mm}</style></head><body>' + svg + (isE2E ? '' : '<script>setTimeout(function(){window.print()},600)</script>') + '</body></html>');
        w.document.close();
    };

    useEffect(() => {
        if (labelType === 'CODE128') {
            const timer = setTimeout(() => {
                pagedLotes.forEach((lote) => {
                    const el = document.getElementById(`barcode-${lote.id}`);
                    if (el) {
                        try {
                            JsBarcode(el, lote.codigo + '-' + lote.lote, {
                                format: 'CODE128',
                                width: 2,
                                height: 50,
                                displayValue: false,
                                margin: 8,
                                background: undefined,
                                lineColor: '#000000',
                            });
                        } catch (e) {
                            // Skip if already rendered
                        }
                    }
                });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [pagedLotes, labelType, currentPage]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight text-white">Impresion de Labels</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Codigos de Barras & QR para Trazabilidad Fisica
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* ── Left Panel: Item Selector ── */}
                <div className="xl:col-span-1 space-y-6">
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600/20 rounded-xl">
                                <Search size={18} className="text-indigo-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por nombre, codigo o lote..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-1 bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/60 transition-colors"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <button
                                onClick={toggleAll}
                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-400 transition-colors"
                            >
                                {allFilteredSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                {allFilteredSelected ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
                            </button>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {selectedIds.size} seleccionados
                            </span>
                        </div>

                        <div className="space-y-1 max-h-[450px] overflow-y-auto custom-scrollbar pr-1">
                            {filteredLotes.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-8">Sin resultados</p>
                            ) : (
                                filteredLotes.map((lote) => {
                                    const isSelected = selectedIds.has(lote.id);
                                    return (
                                        <button
                                            key={lote.id}
                                            onClick={() => toggleSelect(lote.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                                                isSelected
                                                    ? 'bg-indigo-600/15 border border-indigo-500/30'
                                                    : 'bg-slate-800/30 border border-transparent hover:bg-slate-800/50 hover:border-slate-700/30'
                                            }`}
                                        >
                                            {isSelected ? (
                                                <CheckSquare size={16} className="text-indigo-400 shrink-0" />
                                            ) : (
                                                <Square size={16} className="text-slate-600 shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-white truncate">{lote.material_name}</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex gap-3 mt-0.5">
                                                    <span>{lote.codigo}</span>
                                                    <span>Lote: {lote.lote}</span>
                                                    <span>{lote.bodega}</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-slate-500 uppercase shrink-0">
                                                {lote.cantidad} {lote.unit}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Label Type Selector */}
                    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-5 space-y-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipo de Label</div>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setLabelType('CODE128')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                    labelType === 'CODE128'
                                        ? 'border-indigo-500 bg-indigo-600/15 text-white shadow-lg shadow-indigo-500/10'
                                        : 'border-slate-700/40 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                                }`}
                            >
                                <Barcode size={24} className={labelType === 'CODE128' ? 'text-indigo-400' : ''} />
                                <span className="text-xs font-bold uppercase tracking-wider">Codigo Barras</span>
                            </button>
                            <button
                                onClick={() => setLabelType('QR')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                    labelType === 'QR'
                                        ? 'border-indigo-500 bg-indigo-600/15 text-white shadow-lg shadow-indigo-500/10'
                                        : 'border-slate-700/40 bg-slate-800/30 text-slate-400 hover:border-slate-600'
                                }`}
                            >
                                <QrCode size={24} className={labelType === 'QR' ? 'text-indigo-400' : ''} />
                                <span className="text-xs font-bold uppercase tracking-wider">Codigo QR</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Right Panel: Label Preview ── */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Previsualizacion ({selectedLotes.length} labels)
                        </div>
                        <div className="flex items-center gap-3">
                            {totalPages > 1 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                        disabled={currentPage === 0}
                                        className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-xs font-bold text-slate-400">
                                        {currentPage + 1} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                                        disabled={currentPage >= totalPages - 1}
                                        className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={handlePrint}
                                disabled={selectedLotes.length === 0}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-sm font-black uppercase tracking-widest text-white transition-all hover:shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                            >
                                <Printer size={18} />
                                Imprimir Todo
                            </button>
                        </div>
                    </div>

                    {selectedLotes.length === 0 ? (
                        <div className="bg-slate-900/40 backdrop-blur-xl border-2 border-dashed border-slate-700/40 rounded-3xl p-24 flex flex-col items-center justify-center text-slate-500 space-y-4">
                            <Package size={64} strokeWidth={1} className="opacity-20" />
                            <p className="text-xs font-black uppercase tracking-[0.3em]">Seleccione items para previsualizar</p>
                        </div>
                    ) : (
                        <div id="printable-labels" className="label-sheet">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {pagedLotes.map((lote) => (
                                    <div
                                        key={lote.id}
                                        className="label-card pm-paper rounded-xl border-2 pm-paper-line p-4 flex flex-col items-center gap-3 shadow-md"
                                    >
                                        <div className="text-center w-full">
                                            <div className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                                                Pymetory
                                            </div>
                                            <div className="text-[10px] font-black text-white uppercase leading-tight truncate w-full">
                                                {lote.material_name}
                                            </div>
                                        </div>

                                        <div className="w-full p-2 pm-paper rounded-lg border pm-paper-line flex items-center justify-center">
                                            {labelType === 'CODE128' ? (
                                                <svg
                                                    id={`barcode-${lote.id}`}
                                                    className="w-full"
                                                    style={{ maxHeight: '50px' }}
                                                />
                                            ) : (
                                                <QRCode
                                                    value={labelValue(lote)}
                                                    size={100}
                                                    style={{ height: 'auto', maxWidth: '100%' }}
                                                    viewBox="0 0 256 256"
                                                />
                                            )}
                                        </div>

                                        <div className="w-full grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">
                                            <div className="space-y-0.5">
                                                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Codigo</div>
                                                <div className="text-[9px] font-bold text-white uppercase">{lote.codigo}</div>
                                            </div>
                                            <div className="space-y-0.5 text-right">
                                                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Lote</div>
                                                <div className="text-[9px] font-bold text-white uppercase">{lote.lote}</div>
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Vence</div>
                                                <div className="text-[9px] font-bold text-red-600 uppercase">{lote.vencimiento}</div>
                                            </div>
                                            <div className="space-y-0.5 text-right">
                                                <div className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Cant</div>
                                                <div className="text-[9px] font-bold text-white uppercase">{lote.cantidad} {lote.unit}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Print-specific CSS */}
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #printable-labels,
                    #printable-labels * {
                        visibility: visible;
                    }
                    #printable-labels {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0.3in;
                    }
                    #printable-labels .label-sheet {
                        display: block;
                    }
                    #printable-labels .label-card {
                        break-inside: avoid;
                        page-break-inside: avoid;
                        border: 1px solid #ccc !important;
                        box-shadow: none !important;
                        width: 2.5in;
                        height: 1.8in;
                        display: inline-flex;
                        margin: 0.1in;
                    }
                    .label-card svg {
                        max-height: 40px !important;
                    }
                    @page {
                        size: letter;
                        margin: 0.2in;
                    }
                }
            `}</style>
        </div>
    );
}
