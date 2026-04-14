import React, { useState, useEffect } from 'react';
import { Replace, AlertTriangle, ArrowUpRight, Search } from 'lucide-react';

interface RowData {
    id: string | number;
    product: string;
    lote: string;
    kilos: number;
    vencimiento: string;
    status: string;
}

const MOCK_DATA: RowData[] = [
    { id: '1', product: 'Resina Epóxica R200', lote: 'LT-8492X', kilos: 25000, vencimiento: '2025-01-10', status: 'CRITICAL' },
    { id: '2', product: 'Polímero ABS', lote: 'LT-8493Y', kilos: 18000, vencimiento: '2025-05-15', status: 'NORMAL' },
    { id: '3', product: 'Solvente Industrial', lote: 'LT-1102Z', kilos: 4500, vencimiento: '2024-11-05', status: 'CRITICAL' },
    { id: '4', product: 'Pigmento Blanco Titanio', lote: 'LT-3301A', kilos: 10000, vencimiento: '2025-02-28', status: 'WARNING' },
    { id: '5', product: 'Catalizador C-40', lote: 'LT-5544B', kilos: 2500, vencimiento: '2026-08-11', status: 'NORMAL' },
];

export default function KardexTable({ initialData }: { initialData?: any[] }) {
    const [unitType, setUnitType] = useState<'KILOS' | 'BULTOS'>('KILOS');
    const [searchTerm, setSearchTerm] = useState('');
    const BULTOS_CONVERSION = 25; // 1 Bulto = 25 Kilos

    const [data, setData] = useState<RowData[]>(MOCK_DATA);

    useEffect(() => {
        if (initialData && initialData.length > 0) {
            // Remapeo desde el backend Laravel (InventoryController)
            const mapped = initialData.map(item => ({
                id: item.id,
                product: item.codigo,
                lote: item.lote,
                kilos: Number(item.cantidad),
                vencimiento: item.vencimiento,
                status: item.status === 'CRITICO' ? 'CRITICAL' : 'NORMAL'
            }));
            setData(mapped);
        }
    }, [initialData]);

    const filteredData = data.filter(item => 
        item.product.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.lote.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        // Simple FEFO ordering (Critical first)
        const priority: Record<string, number> = { CRITICAL: 1, WARNING: 2, NORMAL: 3 };
        return (priority[a.status] || 3) - (priority[b.status] || 3);
    });

    return (
        <div className="bg-[#F5F3EE] rounded-xl border border-[#111111]/10 shadow-sm overflow-hidden flex flex-col h-full">
            {/* Table Header Controls */}
            <div className="p-6 border-b border-[#111111]/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[rgba(245,243,238,0.7)] backdrop-blur-md">
                <div className="flex flex-col">
                    <h2 className="font-serif italic text-3xl text-[#111111]">Kardex de Materias Primas</h2>
                    <p className="font-mono text-sm opacity-60">Control FEFO Activo</p>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#111111]/40" />
                        <input 
                            type="text" 
                            placeholder="Buscar producto o lote..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded border border-[#111111]/10 bg-white font-mono text-sm focus:outline-none focus:border-[#E63B2E]/50 focus:ring-1 focus:ring-[#E63B2E]/50 transition-all"
                        />
                    </div>
                    
                    {/* Unit Switch Toggle */}
                    <div className="flex bg-[#111111]/5 p-1 rounded font-mono text-xs border border-[#111111]/10">
                        <button 
                            onClick={() => setUnitType('KILOS')} 
                            className={`px-4 py-1.5 rounded transition-all flex items-center gap-2 ${unitType === 'KILOS' ? 'bg-[#111111] text-[#F5F3EE] shadow' : 'text-[#111111] hover:bg-[#111111]/10'}`}
                        >
                            <Replace size={12} className={unitType === 'KILOS' ? 'opacity-100' : 'opacity-0'} /> KGS
                        </button>
                        <button 
                            onClick={() => setUnitType('BULTOS')} 
                            className={`px-4 py-1.5 rounded transition-all flex items-center gap-2 ${unitType === 'BULTOS' ? 'bg-[#111111] text-[#F5F3EE] shadow' : 'text-[#111111] hover:bg-[#111111]/10'}`}
                        >
                            <Replace size={12} className={unitType === 'BULTOS' ? 'opacity-100' : 'opacity-0'} /> BLT
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto flex-1 bg-white">
                <table className="w-full text-left font-mono text-sm">
                    <thead className="bg-[#F5F3EE]/50 text-[#111111]/60 border-b border-[#111111]/10 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-bold border-r border-[#111111]/5">Lote</th>
                            <th className="px-6 py-4 font-bold font-sans tracking-wide border-r border-[#111111]/5">Materia Prima</th>
                            <th className="px-6 py-4 font-bold border-r border-[#111111]/5">Cantidad ({unitType})</th>
                            <th className="px-6 py-4 font-bold border-r border-[#111111]/5">Vencimiento (FEFO)</th>
                            <th className="px-6 py-4 font-bold">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#111111]/5">
                        {filteredData.map((row) => {
                            const cantidad = unitType === 'KILOS' ? row.kilos : row.kilos / BULTOS_CONVERSION;
                            const isCritical = row.status === 'CRITICAL';
                            
                            return (
                                <tr key={row.id} className={`hover:bg-[#F5F3EE]/30 transition-colors group ${isCritical ? 'bg-[#E63B2E]/5' : ''}`}>
                                    <td className={`px-6 py-4 border-r border-[#111111]/5 font-bold ${isCritical ? 'text-[#E63B2E]' : 'text-[#111111]'}`}>
                                        {row.lote}
                                    </td>
                                    <td className="px-6 py-4 border-r border-[#111111]/5 font-sans font-semibold text-[#111111] truncate max-w-[200px]">
                                        {row.product}
                                    </td>
                                    <td className="px-6 py-4 border-r border-[#111111]/5 text-right font-bold text-lg">
                                        <div className="flex justify-end items-center gap-2">
                                            {cantidad.toLocaleString()} <span className="text-[10px] opacity-40">{unitType === 'BULTOS' ? 'u.' : 'kg'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 border-r border-[#111111]/5">
                                        <div className="flex items-center gap-2">
                                            {isCritical && <AlertTriangle size={14} className="text-[#E63B2E] animate-pulse" />}
                                            <span className={isCritical ? 'text-[#E63B2E] font-bold' : ''}>{row.vencimiento}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {isCritical ? (
                                            <span className="inline-flex items-center gap-1.5 bg-[#E63B2E] text-white px-2 py-1 rounded text-[10px] font-bold tracking-wider">
                                                REQUIERE ACCIÓN
                                            </span>
                                        ) : row.status === 'WARNING' ? (
                                            <span className="inline-flex items-center gap-1.5 bg-[#111111]/10 text-[#111111] px-2 py-1 rounded text-[10px] font-bold tracking-wider">
                                                PRÓXIMO
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-700 px-2 py-1 rounded text-[10px] font-bold tracking-wider cursor-default">
                                                ESTABLE
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-[#111111]/40 italic">
                                    No se encontraron resultados para "{searchTerm}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* Table Footer */}
            <div className="p-4 border-t border-[#111111]/10 bg-[#F5F3EE] flex justify-between items-center text-xs font-mono opacity-60">
                <span>Total Lotes: {filteredData.length}</span>
                <span className="flex items-center gap-1">Auditoría Habilitada <ArrowUpRight size={12} /></span>
            </div>
        </div>
    );
}
