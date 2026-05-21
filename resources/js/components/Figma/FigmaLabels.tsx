import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Tag, Plus, X, Search, Package, Trash2, Check, Pencil, Palette, Layers } from 'lucide-react';

const PRESET_COLORS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4',
    '#3b82f6', '#6b7280', '#1e293b', '#78716c',
];

const csrf = () => (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || '';

const headers = () => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-XSRF-TOKEN': csrf(),
});

interface TagType {
    id: number;
    nombre: string;
    color: string;
    icono: string | null;
    descripcion: string | null;
    active: boolean;
    created_at?: string;
}

interface LoteItem {
    id: number;
    material_id: number;
    codigo: string;
    material_name: string;
    lote: string;
    cantidad: number;
    vencimiento: string;
    bodega: string;
    status: string;
    tags?: any[];
    tag_ids?: number[];
}

const FigmaLabels = ({ lotes = [] }: { lotes: any[] }) => {
    const [tags, setTags] = useState<TagType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
    const [assigningMaterialId, setAssigningMaterialId] = useState<number | null>(null);
    const [materialTags, setMaterialTags] = useState<Record<number, number[]>>({});

    const [formName, setFormName] = useState('');
    const [formColor, setFormColor] = useState('#6366f1');
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('#6366f1');
    const [error, setError] = useState('');

    const fetchTags = useCallback(async () => {
        try {
            const res = await fetch('/api/tags', { headers: headers() });
            if (res.ok) {
                const data = await res.json();
                setTags(data);
            }
        } catch (e) {
            console.error('Error fetching tags', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTags(); }, [fetchTags]);

    // Derive unique materials from lotes for tag assignment (keyed by material_id)
    const uniqueMaterials = useMemo(() => {
        const map = new Map<number, LoteItem>();
        lotes.forEach((l: any) => {
            const mid = l.material_id || l.id;
            if (!map.has(mid)) {
                map.set(mid, {
                    id: mid,
                    codigo: l.codigo,
                    material_name: l.material_name,
                    lote: l.lote,
                    cantidad: l.cantidad,
                    vencimiento: l.vencimiento,
                    bodega: l.bodega,
                    status: l.status,
                    tags: l.tags || [],
                    material_id: mid,
                });
            }
        });
        return Array.from(map.values());
    }, [lotes]);

    // Fetch tags for a material
    const fetchMaterialTags = useCallback(async (materialId: number) => {
        try {
            const res = await fetch(`/api/materials/${materialId}/tags`, { headers: headers() });
            if (res.ok) {
                const data = await res.json();
                setMaterialTags(prev => ({ ...prev, [materialId]: data.map((t: TagType) => t.id) }));
            }
        } catch (e) { /* ignore */ }
    }, []);

    useEffect(() => {
        if (assigningMaterialId !== null) {
            fetchMaterialTags(assigningMaterialId);
        }
    }, [assigningMaterialId, fetchMaterialTags]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!formName.trim()) { setError('El nombre es obligatorio'); return; }
        try {
            const res = await fetch('/api/tags', {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ nombre: formName.trim(), color: formColor }),
            });
            if (res.ok) {
                await fetchTags();
                setShowAddForm(false);
                setFormName('');
                setFormColor('#6366f1');
            } else {
                const d = await res.json();
                setError(d.errors?.nombre?.[0] || d.message || 'Error al crear tag');
            }
        } catch {
            setError('Error de conexion');
        }
    };

    const startEdit = (tag: TagType) => {
        setEditingId(tag.id);
        setEditName(tag.nombre);
        setEditColor(tag.color);
    };

    const handleUpdate = async (tagId: number) => {
        if (!editName.trim()) return;
        try {
            const res = await fetch(`/api/tags/${tagId}`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify({ nombre: editName.trim(), color: editColor }),
            });
            if (res.ok) {
                await fetchTags();
                setEditingId(null);
            }
        } catch { /* ignore */ }
    };

    const handleDelete = async (tagId: number) => {
        try {
            await fetch(`/api/tags/${tagId}`, { method: 'DELETE', headers: headers() });
            await fetchTags();
            setDeletingId(null);
        } catch { /* ignore */ }
    };

    const toggleTagOnMaterial = async (materialId: number, tagId: number) => {
        const current = materialTags[materialId] || [];
        const newTags = current.includes(tagId)
            ? current.filter(id => id !== tagId)
            : [...current, tagId];
        try {
            const res = await fetch(`/api/materials/${materialId}/tags`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ tag_ids: newTags }),
            });
            if (res.ok) {
                setMaterialTags(prev => ({ ...prev, [materialId]: newTags }));
            }
        } catch { /* ignore */ }
    };

    const filteredLotItems = useMemo(() => {
        if (!selectedTagFilter) return uniqueMaterials;
        return uniqueMaterials.filter(item => {
            const ids = materialTags[item.id] || [];
            const tag = tags.find(t => t.nombre === selectedTagFilter);
            return tag && ids.includes(tag.id);
        });
    }, [uniqueMaterials, selectedTagFilter, materialTags, tags]);

    const filteredTags = useMemo(() => {
        if (!searchQuery) return tags;
        return tags.filter(t => t.nombre.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [tags, searchQuery]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight text-white">Etiquetas & Clasificacion</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestion de tags personalizados para inventario</p>
                </div>
                <button
                    onClick={() => { setShowAddForm(true); setError(''); }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-lg font-black text-xs uppercase tracking-widest hover:scale-105 transition-all active:scale-95"
                >
                    <Plus size={14} />
                    <span>Nuevo Tag</span>
                </button>
            </div>

            {/* ── Add Tag Form (Inline Modal) ── */}
            {showAddForm && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-obsidiana/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/30 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-700/30 flex justify-between items-center">
                            <h3 className="font-black text-white uppercase tracking-tight">Crear Nueva Etiqueta</h3>
                            <button onClick={() => setShowAddForm(false)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre del Tag</label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="Ej: Quimico, Perecedero, Fragil..."
                                    className="w-full bg-slate-800/50 border border-slate-600/30 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Color</label>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl border-2 border-slate-600/30" style={{ backgroundColor: formColor }} />
                                    <span className="text-xs text-slate-400 font-mono">{formColor}</span>
                                </div>
                                <div className="grid grid-cols-8 gap-2">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setFormColor(c)}
                                            className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${formColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : ''}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                            {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
                            <button
                                type="submit"
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg"
                            >
                                Crear Etiqueta
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deletingId !== null && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-obsidiana/60 backdrop-blur-sm p-4">
                    <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/30 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center space-y-4">
                            <Trash2 size={40} className="mx-auto text-red-400" />
                            <h3 className="font-black text-white uppercase tracking-tight">Eliminar Etiqueta?</h3>
                            <p className="text-xs text-slate-400">Esta accion desasignara el tag de todos los materiales.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeletingId(null)} className="flex-1 py-3 bg-slate-800 text-slate-300 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-700 transition-colors">
                                    Cancelar
                                </button>
                                <button onClick={() => handleDelete(deletingId)} className="flex-1 py-3 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-700 transition-colors">
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tag Assignment Modal for Material ── */}
            {assigningMaterialId !== null && (() => {
                const mat = uniqueMaterials.find(m => m.id === assigningMaterialId);
                const selectedIds = materialTags[assigningMaterialId] || [];
                return (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-obsidiana/60 backdrop-blur-sm p-4">
                        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/30 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-700/30 flex justify-between items-center">
                                <div>
                                    <h3 className="font-black text-white uppercase tracking-tight">Asignar Etiquetas</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{mat?.codigo} - {mat?.material_name}</p>
                                </div>
                                <button onClick={() => setAssigningMaterialId(null)} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="p-6 space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                                {tags.map(tag => (
                                    <div
                                        key={tag.id}
                                        onClick={() => toggleTagOnMaterial(assigningMaterialId, tag.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                                            selectedIds.includes(tag.id)
                                                ? 'border-indigo-500/50 bg-indigo-600/10'
                                                : 'border-slate-700/30 hover:border-slate-600/30'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded" style={{ backgroundColor: tag.color }} />
                                            <span className="text-sm font-bold text-white">{tag.nombre}</span>
                                        </div>
                                        {selectedIds.includes(tag.id) && <Check size={16} className="text-indigo-400" />}
                                    </div>
                                ))}
                                {tags.length === 0 && (
                                    <p className="text-slate-500 text-xs text-center py-4">No hay tags disponibles. Crea uno primero.</p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* ── LEFT: Tag List ── */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <Palette size={16} className="text-indigo-400" />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tags Disponibles ({tags.length})</span>
                    </div>

                    <div className="relative mb-4">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Buscar etiquetas..."
                            className="w-full bg-slate-800/50 border border-slate-700/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                        {filteredTags.map(tag => (
                            <div
                                key={tag.id}
                                className={`glass-morphism rounded-xl p-4 border transition-all group ${
                                    selectedTagFilter === tag.nombre ? 'border-indigo-500/50 bg-indigo-600/5' : 'border-slate-700/30 hover:border-slate-600/30'
                                }`}
                            >
                                {editingId === tag.id ? (
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            className="w-full bg-slate-800/50 border border-slate-600/30 rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                            autoFocus
                                        />
                                        <div className="grid grid-cols-8 gap-1.5">
                                            {PRESET_COLORS.map(c => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setEditColor(c)}
                                                    className={`w-6 h-6 rounded transition-all hover:scale-110 ${editColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleUpdate(tag.id)} className="flex-1 py-2 bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-colors">
                                                Guardar
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-slate-800 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-slate-700 transition-colors">
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-5 h-5 rounded-lg border-2 border-slate-700/30 flex-shrink-0"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <div>
                                                <span className="text-sm font-bold text-white">{tag.nombre}</span>
                                                {!tag.active && (
                                                    <span className="ml-2 text-[9px] text-slate-500 font-bold uppercase bg-slate-800 px-1.5 py-0.5 rounded">Inactivo</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setSelectedTagFilter(selectedTagFilter === tag.nombre ? '' : tag.nombre)}
                                                className={`p-1.5 rounded-lg transition-colors ${selectedTagFilter === tag.nombre ? 'bg-indigo-600/20 text-indigo-400' : 'hover:bg-slate-800 text-slate-500 hover:text-white'}`}
                                                title="Filtrar inventario por este tag"
                                            >
                                                <Search size={14} />
                                            </button>
                                            <button
                                                onClick={() => startEdit(tag)}
                                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition-colors"
                                                title="Editar"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => setDeletingId(tag.id)}
                                                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredTags.length === 0 && (
                            <div className="text-center py-12 text-slate-500">
                                <Tag size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-xs font-bold uppercase tracking-widest">
                                    {searchQuery ? 'Sin resultados' : 'No hay etiquetas'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── RIGHT: Inventory Items with Tag Assignment ── */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Layers size={16} className="text-indigo-400" />
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Items en Inventario</span>
                        </div>
                        {selectedTagFilter && (
                            <button
                                onClick={() => setSelectedTagFilter('')}
                                className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 uppercase hover:text-indigo-300 transition-colors"
                            >
                                <X size={12} />
                                <span>Quitar filtro: {selectedTagFilter}</span>
                            </button>
                        )}
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                        {filteredLotItems.map(item => {
                            const itemTagIds = materialTags[item.id] || [];
                            const itemTags = tags.filter(t => itemTagIds.includes(t.id));
                            return (
                                <div key={item.id} className="glass-morphism rounded-xl p-4 border border-slate-700/30 hover:border-slate-600/30 transition-all">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Package size={14} className="text-slate-500 flex-shrink-0" />
                                                <span className="text-sm font-bold text-white truncate">{item.codigo} - {item.material_name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1.5 ml-6">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase">Lote {item.lote}</span>
                                                <span className="text-[10px] text-slate-500">|</span>
                                                <span className="text-[10px] text-slate-500">{item.cantidad} KG</span>
                                                <span className="text-[10px] text-slate-500">|</span>
                                                <span className="text-[10px] text-slate-500">{item.bodega}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 mt-2 ml-6">
                                                {itemTags.map(t => (
                                                    <span
                                                        key={t.id}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                                                        style={{ backgroundColor: t.color + '20', color: t.color, border: '1px solid ' + t.color + '40' }}
                                                    >
                                                        {t.nombre}
                                                    </span>
                                                ))}
                                                {itemTags.length === 0 && (
                                                    <span className="text-[10px] text-slate-600 italic">Sin etiquetas</span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setAssigningMaterialId(item.id)}
                                            className="p-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition-colors flex-shrink-0 ml-3"
                                            title="Asignar etiquetas"
                                        >
                                            <Tag size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredLotItems.length === 0 && (
                            <div className="text-center py-12 text-slate-500">
                                <Package size={32} className="mx-auto mb-3 opacity-30" />
                                <p className="text-xs font-bold uppercase tracking-widest">
                                    {selectedTagFilter ? `Sin items con tag "${selectedTagFilter}"` : 'Sin items disponibles'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FigmaLabels;
