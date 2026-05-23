import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Menu,
    MoreHorizontal,
    Pin,
    PinOff,
    Plus,
    X,
    Trash2,
    Bot,
    GripVertical,
    Send,
    Tag,
    User,
    Search,
    Pencil,
    Check,
    Columns,
} from 'lucide-react';
import {
    DndContext,
    closestCorners,
    PointerSensor,
    TouchSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    rectSortingStrategy,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import axios from 'axios';
import gsap from 'gsap';
import Sidebar from '../Components/Sidebar';

const COLUMNS = [
    { key: 'todo', label: 'Por hacer', color: 'from-slate-600/30 to-slate-800/30', accent: '#94A3B8' },
    { key: 'in_progress', label: 'En progreso', color: 'from-blue-600/30 to-blue-800/30', accent: '#60A5FA' },
    { key: 'review', label: 'En revisión', color: 'from-amber-600/30 to-amber-800/30', accent: '#FBBF24' },
    { key: 'done', label: 'Completado', color: 'from-emerald-600/30 to-emerald-800/30', accent: '#34D399' },
];

function SortableCard({ item, onDelete, onPin, onAskRag, onTitleChange }: {
    item: any;
    onDelete: (id: number) => void;
    onPin: (id: number) => void;
    onAskRag: (item: any) => void;
    onTitleChange: (id: number, title: string) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(item.title);
    const menuRef = useRef<HTMLDivElement>(null);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSaveTitle = () => {
        if (editTitle.trim() && editTitle !== item.title) {
            onTitleChange(item.id, editTitle.trim());
        }
        setEditing(false);
    };

    const col = COLUMNS.find(c => c.key === item.column);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group relative bg-obsidiana/80 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-lg hover:border-white/10 transition-all duration-300 hover:shadow-[0_0_30px_-10px_rgba(201,168,76,0.15)]"
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                        {...attributes}
                        {...listeners}
                        aria-label="Arrastrar tarjeta"
                        className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-champan transition-colors touch-none"
                    >
                        <GripVertical size={14} />
                    </button>
                    {editing ? (
                        <input
                            autoFocus
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveTitle();
                                if (e.key === 'Escape') setEditing(false);
                            }}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-champan/50 min-w-0"
                        />
                    ) : (
                        <h4
                            onClick={() => { setEditTitle(item.title); setEditing(true); }}
                            className="text-sm font-bold text-white/90 truncate cursor-pointer hover:text-champan transition-colors flex-1 min-w-0"
                        >
                            {item.title}
                        </h4>
                    )}
                </div>

                <div className="flex items-center gap-0.5 flex-shrink-0 relative" ref={menuRef}>
                    <button
                        onClick={() => onPin(item.id)}
                        aria-label={item.is_pinned ? 'Desfijar tarjeta' : 'Fijar tarjeta'}
                        className={`p-1.5 rounded-lg transition-all ${item.is_pinned ? 'text-champan bg-champan/10' : 'text-slate-600 hover:text-white hover:bg-white/5'}`}
                        title={item.is_pinned ? 'Desfijar' : 'Fijar'}
                    >
                        {item.is_pinned ? <Pin size={13} aria-hidden="true" /> : <PinOff size={13} aria-hidden="true" />}
                    </button>
                    <button
                        onClick={() => onAskRag(item)}
                        aria-label="Preguntar al RAG"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-white/5 transition-all"
                        title="Preguntar al RAG"
                    >
                        <Bot size={13} aria-hidden="true" />
                    </button>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Más opciones"
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <MoreHorizontal size={14} />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-obsidiana border border-white/10 rounded-xl shadow-2xl py-1 z-50 backdrop-blur-xl">
                            <button
                                onClick={() => { onDelete(item.id); setMenuOpen(false); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <Trash2 size={12} /> Eliminar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {item.description && (
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mt-1">
                    {item.description}
                </p>
            )}

            {item.is_pinned && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-champan" />
                    <span className="text-[9px] font-black text-champan/70 uppercase tracking-widest">Fijada</span>
                </div>
            )}
        </div>
    );
}

function ColumnAddForm({ column, onAdd }: { column: string; onAdd: (title: string, column: string) => void }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open && inputRef.current) inputRef.current.focus();
    }, [open]);

    const handleSubmit = () => {
        if (title.trim()) {
            onAdd(title.trim(), column);
            setTitle('');
            setOpen(false);
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="mt-2 w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/10 text-slate-600 hover:text-champan hover:border-champan/30 transition-all text-xs font-bold uppercase tracking-wider group"
            >
                <Plus size={14} className="group-hover:scale-110 transition-transform" />
                Agregar
            </button>
        );
    }

    return (
        <div className="mt-2 bg-obsidiana/60 border border-white/10 rounded-xl p-3 space-y-2">
            <input
                ref={inputRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') handleSubmit();
                    if (e.key === 'Escape') { setOpen(false); setTitle(''); }
                }}
                placeholder="Nueva tarea..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-champan/50"
            />
            <div className="flex gap-2">
                <button
                    onClick={handleSubmit}
                    disabled={!title.trim()}
                    className="flex-1 px-3 py-1.5 bg-champan/20 text-champan border border-champan/30 rounded-lg text-xs font-bold hover:bg-champan/30 transition-colors disabled:opacity-30"
                >
                    Guardar
                </button>
                <button
                    onClick={() => { setOpen(false); setTitle(''); }}
                    className="px-3 py-1.5 bg-white/5 text-slate-400 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: `drop-${id}` });
    return (
        <div
            ref={setNodeRef}
            className={`flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 min-h-[100px] rounded-xl transition-all duration-200 ${isOver ? 'bg-champan/5 border border-champan/30' : ''}`}
        >
            {children}
        </div>
    );
}

export default function Kanban({ auth, columns: initialColumns }: { auth: any; columns: Record<string, any[]> }) {
    const [columns, setColumns] = useState<Record<string, any[]>>(initialColumns || {
        todo: [], in_progress: [], review: [], done: []
    });
    const [activeId, setActiveId] = useState<number | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingCol, setEditingCol] = useState<string | null>(null);
    const [editingColName, setEditingColName] = useState('');
    const [newColName, setNewColName] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const user = auth?.user || { name: 'Invitado', role: 'operario' };

    useEffect(() => {
        if (initialColumns) setColumns(initialColumns);
    }, [initialColumns]);

    useEffect(() => {
        if (contentRef.current) {
            gsap.fromTo(contentRef.current,
                { opacity: 0, y: 15, filter: 'blur(8px)' },
                { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power3.out' }
            );
        }
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
        useSensor(KeyboardSensor)
    );

    // ── Keyboard shortcuts ──
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.ctrlKey || e.metaKey) return;
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                const firstCol = Object.keys(columns)[0] || 'todo';
                setNewColName('');
                (document.querySelector(`[data-add="${firstCol}"]`) as HTMLButtonElement)?.focus();
            }
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [columns]);

    // ── Column CRUD ──
    const handleAddColumn = () => {
        if (!newColName.trim()) return;
        const key = newColName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!key || columns[key]) return;
        setColumns(prev => ({ ...prev, [key]: [] }));
        setNewColName('');
    };

    const handleRenameColumn = (oldKey: string) => {
        if (!editingColName.trim() || editingColName === oldKey) { setEditingCol(null); return; }
        const newKey = editingColName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (!newKey || newKey === oldKey || columns[newKey]) { setEditingCol(null); return; }
        setColumns(prev => {
            const updated = { ...prev };
            updated[newKey] = updated[oldKey] || [];
            delete updated[oldKey];
            return updated;
        });
        setEditingCol(null);
    };

    const handleDeleteColumn = (key: string) => {
        if (columns[key]?.length && !confirm(`¿Eliminar columna "${key}" con ${columns[key].length} tarjetas?`)) return;
        setColumns(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
    };

    // ── Filter ──
    const filterItems = (items: any[]) => {
        if (!searchTerm) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(i =>
            i.title?.toLowerCase().includes(term) ||
            i.description?.toLowerCase().includes(term)
        );
    };

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event: any) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeItem = findItem(active.id);
        if (!activeItem) return;

        const overItem = findItem(over.id);
        const targetColumn = overItem
            ? overItem.column
            : findColumnByDroppableId(over.id);

        if (!targetColumn) return;

        const newPosition = overItem
            ? overItem.position
            : columns[targetColumn]?.length ?? 0;

        // Optimistic update
        const newColumns = { ...columns };
        const srcItems = [...(newColumns[activeItem.column] || [])];
        const activeIndex = srcItems.findIndex(i => i.id === active.id);
        if (activeIndex !== -1) {
            srcItems.splice(activeIndex, 1);
            newColumns[activeItem.column] = srcItems;
        }

        const dstItems = [...(newColumns[targetColumn] || [])];
        const overIndex = dstItems.findIndex(i => i.id === (overItem?.id ?? null));
        const insertAt = overIndex !== -1 ? overIndex : dstItems.length;

        const updatedItem = { ...activeItem, column: targetColumn, position: insertAt };
        dstItems.splice(insertAt, 0, updatedItem);
        newColumns[targetColumn] = dstItems;

        setColumns(newColumns);

        try {
            await axios.post('/kanban/reorder', {
                item_id: active.id,
                column: targetColumn,
                position: insertAt,
            });
        } catch {
            setColumns(columns);
        }
    };

    const findItem = (id: number) => {
        for (const key of Object.keys(columns)) {
            const found = columns[key].find(i => i.id === id);
            if (found) return found;
        }
        return null;
    };

    const findColumnByDroppableId = (id: number | string) => {
        const strId = String(id);
        if (strId.startsWith('drop-')) {
            const col = strId.replace('drop-', '');
            if (Object.keys(columns).includes(col)) return col;
        }
        if (strId.startsWith('col-')) {
            const col = strId.replace('col-', '');
            if (Object.keys(columns).includes(col)) return col;
        }
        return null;
    };

    const handleAdd = async (title: string, column: string) => {
        try {
            const res = await axios.post('/kanban', { title, column });
            const newColumns = { ...columns };
            newColumns[column] = [...(newColumns[column] || []), res.data];
            setColumns(newColumns);
        } catch {
            // silent
        }
    };

    const handleDelete = async (id: number) => {
        const item = findItem(id);
        if (!item) return;

        const newColumns = { ...columns };
        newColumns[item.column] = (newColumns[item.column] || []).filter(i => i.id !== id);
        setColumns(newColumns);

        try {
            await axios.delete(`/kanban/${id}`);
        } catch {
            setColumns(columns);
        }
    };

    const handlePin = async (id: number) => {
        try {
            const res = await axios.post(`/kanban/${id}/pin`);
            const updated = res.data;
            const newColumns = { ...columns };
            for (const key of Object.keys(newColumns)) {
                newColumns[key] = (newColumns[key] || []).map(i =>
                    i.id === updated.id ? { ...i, is_pinned: updated.is_pinned } : i
                );
                newColumns[key].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || a.position - b.position);
            }
            setColumns(newColumns);
        } catch {
            // silent
        }
    };

    const handleTitleChange = async (id: number, title: string) => {
        const item = findItem(id);
        if (!item) return;

        const newColumns = { ...columns };
        newColumns[item.column] = (newColumns[item.column] || []).map(i =>
            i.id === id ? { ...i, title } : i
        );
        setColumns(newColumns);

        try {
            await axios.put(`/kanban/${id}`, { title });
        } catch {
            setColumns(columns);
        }
    };

    const [ragModal, setRagModal] = useState<{ open: boolean; item: any }>({ open: false, item: null });
    const [ragMessages, setRagMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
    const [ragLoading, setRagLoading] = useState(false);
    const [ragInput, setRagInput] = useState('');
    const ragEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ragEndRef.current) {
            ragEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [ragMessages, ragLoading]);

    const handleAskRag = async (item: any) => {
        setRagModal({ open: true, item });
        const prompt = `Analiza el estado de la tarea: ${item.title}. ¿Qué insumos del inventario están relacionados?`;
        setRagMessages([{ role: 'user', content: prompt }]);
        setRagInput('');
        setRagLoading(true);
        const token = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        try {
            const res = await fetch('/chat-rag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': token },
                body: JSON.stringify({ prompt }),
            });
            const data = await res.json();
            setRagMessages(prev => [...prev, { role: 'ai', content: data.response || 'Sin respuesta del motor RAG.' }]);
        } catch {
            setRagMessages(prev => [...prev, { role: 'ai', content: '> ERROR: No se pudo contactar el motor LLM.' }]);
        } finally {
            setRagLoading(false);
        }
    };

    const handleRagFollowUp = async () => {
        if (!ragInput.trim() || ragLoading) return;
        const prompt = ragInput.trim();
        setRagMessages(prev => [...prev, { role: 'user', content: prompt }]);
        setRagInput('');
        setRagLoading(true);
        const token = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        try {
            const res = await fetch('/chat-rag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': token },
                body: JSON.stringify({ prompt }),
            });
            const data = await res.json();
            setRagMessages(prev => [...prev, { role: 'ai', content: data.response || 'Sin respuesta.' }]);
        } catch {
            setRagMessages(prev => [...prev, { role: 'ai', content: '> ERROR: Fallo en la comunicación.' }]);
        } finally {
            setRagLoading(false);
        }
    };

    const activeItem = activeId ? findItem(activeId) : null;

    return (
        <div className="flex h-screen bg-[#F8FAFC] text-[#0F172A] overflow-hidden font-sans radial-decor">
            <Head title="Kanban | Pymetory Premium" />

            <Sidebar
                sidebarOpen={sidebarOpen}
                mobileOpen={mobileOpen}
                user={user}
                activeView="/kanban"
                mode="dashboard"
                onMobileClose={() => setMobileOpen(false)}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <header className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/40 backdrop-blur-md z-40">
                    <div className="flex items-center gap-6">
                        <button onClick={() => {
                            if (window.innerWidth >= 1024) setSidebarOpen(!sidebarOpen);
                            else setMobileOpen(!mobileOpen);
                        }} aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:scale-110 active:scale-95">
                            <Menu size={20} aria-hidden="true" />
                        </button>
                        <nav className="flex items-center gap-2" aria-label="Breadcrumb">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">Pymetory /</span>
                            <h1 className="text-xs font-black uppercase tracking-widest text-slate-900">Kanban</h1>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Filtrar tarjetas..."
                                className="pl-9 pr-3 py-2 bg-white/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400 transition-colors w-48"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={12} /></button>
                            )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold hidden lg:block">
                            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-mono">N</kbd> Nueva &nbsp;
                            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-mono">F</kbd> Buscar
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <div ref={contentRef} className="p-8 h-full">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-display font-black text-slate-900 tracking-tight">Tablero Kanban</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                                    Arrastra tarjetas para organizar tu flujo de trabajo
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newColName}
                                    onChange={e => setNewColName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddColumn()}
                                    placeholder="Nueva columna..."
                                    className="px-3 py-1.5 bg-white/50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400 w-36"
                                />
                                <button onClick={handleAddColumn} disabled={!newColName.trim()}
                                    className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-all">
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="flex gap-6 flex-1 min-h-0 overflow-x-auto pb-6 custom-scrollbar">
                                {Object.keys(columns).map(colKey => {
                                    const colLabel = colKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                    const items = filterItems(columns[colKey] || []);
                                    const ids = items.map(i => i.id);
                                    const isEditing = editingCol === colKey;

                                    const COLORS = ['#64748b', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                                    const colorIndex = Object.keys(columns).indexOf(colKey) % COLORS.length;

                                    return (
                                        <div
                                            key={colKey}
                                            id={`col-${colKey}`}
                                            className="w-80 flex-shrink-0 flex flex-col"
                                        >
                                            <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-800/50 to-slate-800/30 border border-white/5 flex items-center justify-between backdrop-blur-xl mb-4 group">
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[colorIndex] }} />
                                                        <input
                                                            autoFocus
                                                            value={editingColName}
                                                            onChange={e => setEditingColName(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') handleRenameColumn(colKey); if (e.key === 'Escape') setEditingCol(null); }}
                                                            onBlur={() => handleRenameColumn(colKey)}
                                                            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none"
                                                        />
                                                        <button onClick={() => handleRenameColumn(colKey)} className="text-emerald-400 hover:text-emerald-300"><Check size={14} /></button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[colorIndex] }} />
                                                            <span className="text-[10px] font-black tracking-[0.2em] text-white/80">
                                                                {colLabel}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] font-black text-white/40">{items.length}</span>
                                                            <button
                                                                onClick={() => { setEditingCol(colKey); setEditingColName(colLabel); }}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-white/80 transition-all"
                                                                title="Renombrar columna"
                                                            ><Pencil size={11} /></button>
                                                            <button
                                                                onClick={() => handleDeleteColumn(colKey)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-red-400/50 hover:text-red-400 transition-all"
                                                                title="Eliminar columna"
                                                            ><Trash2 size={11} /></button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                                                <DroppableColumn id={colKey}>
                                                    {items.map(item => (
                                                        <SortableCard
                                                            key={item.id}
                                                            item={item}
                                                            onDelete={handleDelete}
                                                            onPin={handlePin}
                                                            onAskRag={handleAskRag}
                                                            onTitleChange={handleTitleChange}
                                                        />
                                                    ))}
                                                    {items.length === 0 && searchTerm && (
                                                        <div className="text-center py-6 text-[10px] text-slate-500 font-bold uppercase">
                                                            Sin resultados
                                                        </div>
                                                    )}
                                                </DroppableColumn>
                                            </SortableContext>

                                            <ColumnAddForm column={colKey} onAdd={handleAdd} />
                                        </div>
                                    );
                                })}
                            </div>

                            <DragOverlay dropAnimation={null}>
                                {activeItem && (
                                    <div className="w-80 bg-obsidiana/90 backdrop-blur-xl border border-champan/30 rounded-2xl p-4 shadow-2xl shadow-champan/10 rotate-2">
                                        <h4 className="text-sm font-bold text-white truncate">{activeItem.title}</h4>
                                        {activeItem.description && (
                                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{activeItem.description}</p>
                                        )}
                                    </div>
                                )}
                            </DragOverlay>
                        </DndContext>
                    </div>
                </div>
            </main>

            {/* RAG Chat Modal */}
            {ragModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setRagModal({ open: false, item: null })}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div
                        onClick={e => e.stopPropagation()}
                        className="relative w-full max-w-2xl h-[80vh] flex flex-col rounded-3xl border border-champan/20 bg-[#0a0a0f]/95 backdrop-blur-2xl shadow-2xl shadow-champan/5 overflow-hidden animate-in zoom-in-95 fade-in duration-200"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-champan/30 to-champan/5 border border-champan/20 flex items-center justify-center text-champan">
                                    <Bot size={18} aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-[#faf9f6] truncate">Motor RAG — {ragModal.item?.title}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Análisis del Kanban</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setRagModal({ open: false, item: null })}
                                aria-label="Cerrar chat RAG"
                                className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            {ragMessages.map((msg, idx) => (
                                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border ${msg.role === 'ai' ? 'bg-champan/10 border-champan/20 text-champan' : 'bg-white/5 border-white/10 text-white/60'}`}>
                                        {msg.role === 'ai' ? <Bot size={14} aria-hidden="true" /> : <User size={14} aria-hidden="true" />}
                                    </div>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600/20 border border-indigo-500/20 text-white/90' : 'bg-white/5 border border-white/5 text-white/80'}`}>
                                        <div className="whitespace-pre-wrap font-mono text-[13px]">{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                            {ragLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-champan/10 border border-champan/20 flex items-center justify-center text-champan shrink-0">
                                        <Bot size={14} aria-hidden="true" />
                                    </div>
                                    <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3">
                                        <span className="text-champan/70 text-xs animate-pulse font-mono">Consultando el inventario...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={ragEndRef} />
                        </div>

                        {/* Quick context badge */}
                        {ragModal.item && (
                            <div className="px-6 py-2 border-t border-white/5 bg-black/40 flex items-center gap-2 text-[10px] text-slate-500 shrink-0">
                                <Tag size={12} aria-hidden="true" />
                                <span className="font-bold uppercase tracking-wider">Columna: {COLUMNS.find(c => c.key === ragModal.item.column)?.label || ragModal.item.column}</span>
                                {ragModal.item.description && (
                                    <span className="truncate max-w-[300px] opacity-50">— {ragModal.item.description}</span>
                                )}
                            </div>
                        )}

                        {/* Input */}
                        <form
                            onSubmit={e => { e.preventDefault(); handleRagFollowUp(); }}
                            className="p-4 border-t border-white/5 bg-black/40 shrink-0"
                        >
                            <div className="relative">
                                <input
                                    type="text"
                                    value={ragInput}
                                    onChange={e => setRagInput(e.target.value)}
                                    placeholder="Haz una pregunta de seguimiento..."
                                    disabled={ragLoading}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-champan/50 transition-colors disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={ragLoading || !ragInput.trim()}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-champan/20 text-champan hover:bg-champan/30 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                    aria-label="Enviar consulta"
                                >
                                    <Send size={16} aria-hidden="true" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
