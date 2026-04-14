import React from 'react';
import { User, ShieldCheck, Mail, Clock, Activity } from 'lucide-react';

interface Operator {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'OPERARIO';
    lastActive: string;
    status: 'ONLINE' | 'OFFLINE';
}

const MOCK_OPERATORS: Operator[] = [
    { id: '1', name: 'Germán David', email: 'german1307@gmail.com', role: 'ADMIN', lastActive: 'Ahora', status: 'ONLINE' },
    { id: '2', name: 'Laura Gómez', email: 'lgomez@planta.com', role: 'OPERARIO', lastActive: 'Hace 5 min', status: 'ONLINE' },
    { id: '3', name: 'Roberto Vásquez', email: 'rvasquez@planta.com', role: 'OPERARIO', lastActive: 'Ayer', status: 'OFFLINE' },
    { id: '4', name: 'Ana Silva', email: 'asilva@planta.com', role: 'ADMIN', lastActive: 'Hace 2 horas', status: 'OFFLINE' },
    { id: '5', name: 'Carlos Díaz', email: 'cdiaz@planta.com', role: 'OPERARIO', lastActive: 'Hace 1 hora', status: 'ONLINE' },
    { id: '6', name: 'Fernando López', email: 'flopez@planta.com', role: 'OPERARIO', lastActive: 'Hace 30 min', status: 'ONLINE' },
];

export default function UsersModule() {
    return (
        <div className="flex flex-col h-full bg-[#E8E4DD] rounded-xl overflow-hidden shadow-sm border border-[#111111]/10 animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-[#111111]/10 bg-white/50 backdrop-blur-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="font-serif italic text-3xl text-[#111111]">Cuerpo Operativo</h2>
                    <p className="font-mono text-sm opacity-60">Control de Accesos & Roles de Planta</p>
                </div>
                <button className="bg-[#111111] text-[#F5F3EE] px-6 py-3 rounded-lg font-bold font-mono text-sm hover:-translate-y-1 hover:shadow-lg transition-transform flex items-center gap-2">
                    <User size={16} /> NUEVO_ALTA
                </button>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white/30">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {MOCK_OPERATORS.map((op) => (
                        <div key={op.id} className="group bg-white rounded-xl border border-[#111111]/10 p-6 flex flex-col hover:-translate-y-2 hover:border-[#E63B2E]/50 hover:shadow-[0_10px_30px_rgba(230,59,46,0.1)] transition-all duration-300">
                            {/* Card Header */}
                            <div className="flex justify-between items-start">
                                <div className="h-12 w-12 rounded-lg bg-[#E8E4DD] border border-[#111111]/10 flex items-center justify-center font-serif italic text-2xl font-bold text-[#111111]">
                                    {op.name.charAt(0)}
                                </div>
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider ${op.role === 'ADMIN' ? 'bg-[#111111] text-[#F5F3EE]' : 'bg-[#E8E4DD] text-[#111111]'}`}>
                                    {op.role === 'ADMIN' ? <ShieldCheck size={12} /> : <User size={12} />}
                                    {op.role}
                                </div>
                            </div>
                            
                            {/* Identity */}
                            <div className="mt-4 mb-6">
                                <h3 className="font-sans font-bold text-xl text-[#111111] truncate">{op.name}</h3>
                                <div className="flex items-center gap-2 mt-1 text-[#111111]/50 font-mono text-xs truncate">
                                    <Mail size={12} className="shrink-0" />
                                    <span>{op.email}</span>
                                </div>
                            </div>

                            {/* Status Footer */}
                            <div className="mt-auto pt-4 border-t border-[#111111]/10 flex items-center justify-between font-mono text-[10px] uppercase">
                                <div className="flex items-center gap-2 text-[#111111]/60">
                                    <Clock size={12} />
                                    {op.lastActive}
                                </div>
                                <div className="flex items-center gap-2 font-bold">
                                    <span className={op.status === 'ONLINE' ? 'text-green-600' : 'text-[#111111]/40'}>
                                        {op.status}
                                    </span>
                                    {op.status === 'ONLINE' && <Activity size={12} className="text-green-600 animate-pulse" />}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
