import React from 'react';
import { LayoutGrid, Clock, CheckCircle2, AlertCircle, ChevronRight, MoreHorizontal, Tag } from 'lucide-react';

const FigmaKanban = () => {
    const columns = [
        {
            id: 'todo',
            title: 'PARA HACER',
            color: 'bg-slate-100 text-slate-500',
            tasks: [
                { id: 1, title: 'Módulo de Reportes PDF', desc: 'Generación automática de inventarios en PDF.', tag: 'Héctor', priority: 'ALTA' },
                { id: 2, title: 'Gestión de Bodegas', desc: 'CRUD y traslados entre Bodega A y B.', tag: 'Logística', priority: 'MEDIA' },
                { id: 3, title: 'Centro de Notificaciones', desc: 'Alertas push y persistencia en DB.', tag: 'UX', priority: 'BAJA' }
            ]
        },
        {
            id: 'in-progress',
            title: 'EN PROCESO',
            color: 'bg-blue-50 text-blue-600',
            tasks: [
                { id: 4, title: 'Refinamiento de IA RAG', desc: 'Ajuste de prompt para respuestas ejecutivas.', tag: 'LLM', priority: 'ALTA' },
                { id: 5, title: 'Sincronización de Tablero', desc: 'Conectando el Kanban nativo con KANBAN.md.', tag: 'Core', priority: 'ALTA' }
            ]
        },
        {
            id: 'done',
            title: 'REALIZADO',
            color: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
            tasks: [
                { id: 6, title: 'Dashboard Dinámico', desc: 'Inyección de props reales desde el backend.', tag: 'Frontend', priority: 'Tesis' },
                { id: 7, title: 'Motor RAG LLM', desc: 'Consulta inteligente de materiales y lotes.', tag: 'IA', priority: 'Tesis' },
                { id: 8, title: 'Diseño Midnight Luxe', desc: 'Estética Senior con Glassmorphism.', tag: 'Diseño', priority: 'Tesis' }
            ]
        }
    ];

    const PriorityBadge = ({ p }: { p: string }) => {
        const colors = {
            'ALTA': 'bg-red-100 text-red-600',
            'MEDIA': 'bg-amber-100 text-amber-600',
            'BAJA': 'bg-slate-100 text-slate-600',
            'Tesis': 'bg-indigo-100 text-indigo-600'
        };
        return <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${colors[p as keyof typeof colors]}`}>{p}</span>;
    };

    return (
        <div className="h-full flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestión de Proyecto</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Sincronizado con KANBAN.md</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
                        <MoreHorizontal size={14} /> Opciones
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-200 hover:scale-105 transition-all">
                        + Nueva Tarea
                    </button>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
                {columns.map(col => (
                    <div key={col.id} className="w-80 flex-shrink-0 flex flex-col gap-4">
                        <div className={`p-3 rounded-2xl ${col.color} flex items-center justify-between`}>
                            <span className="text-[10px] font-black tracking-[0.2em]">{col.title}</span>
                            <span className="text-[10px] font-black opacity-40">{col.tasks.length}</span>
                        </div>

                        <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                            {col.tasks.map(task => (
                                <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group cursor-grab active:cursor-grabbing">
                                    <div className="flex justify-between items-start mb-2">
                                        <PriorityBadge p={task.priority} />
                                        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-slate-600">
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>
                                    <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                                    <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed">{task.desc}</p>
                                    
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg">
                                            <Tag size={10} className="text-slate-400" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{task.tag}</span>
                                        </div>
                                        <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center overflow-hidden">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FigmaKanban;
