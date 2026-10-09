import FigmaMaterialAjustes from './FigmaMaterialAjustes';
import FigmaIngresoLote from './FigmaIngresoLote';
import React, { useState, useMemo } from 'react';
import { GRUPOS } from '../../lib/grupos';
import { Box, Plus, ChevronRight, X, Warehouse, ScanLine, Sparkles, Search } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import FigmaMovements from './FigmaMovements';
import FigmaForms from './FigmaForms';
import FigmaConsumeForm from './FigmaConsumeForm';
import FigmaConsumeWizard from './FigmaConsumeWizard';
import FigmaDevolucion from './FigmaDevolucion';
import FigmaVencimiento from './FigmaVencimiento';
import FigmaFefoBadge from './FigmaFefoBadge';
import FigmaBodegaBar from './FigmaBodegaBar';

const FigmaInventario = ({ lotes = [], sinExistencia = [], bodegas = [], categoriasExistentes = [], user, onNavigate, initialBodegaCode, onManageBodegas }: { lotes?: any[], sinExistencia?: any[], bodegas?: any[], categoriasExistentes?: string[], user?: any, onNavigate?: (view: string) => void, initialBodegaCode?: string | null, onManageBodegas?: (inicial: 'nueva' | number | null) => void }) => {
    const [viewMode, setViewMode] = useState<'GRID' | 'DETAIL' | 'FORM' | 'CONSUME' | 'WIZARD'>('GRID');
    const [wizardMaterial, setWizardMaterial] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showBodegaModal, setShowBodegaModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [selectedLote, setSelectedLote] = useState<any>(null);
    const [selectedBodega, setSelectedBodega] = useState<any>(() => bodegas.find((b: any) => b.code === initialBodegaCode) ?? null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string>('');
    const [categoria, setCategoria] = useState('');
    // Con bodegas agrupadas (instancia real de la empresa) el inventario empieza por las bodegas, como pidió la administradora.
    const hayGrupos = bodegas.some((b: any) => b.grupo);
    const [pestana, setPestana] = useState<'insumos' | 'bodegas'>(hayGrupos && !initialBodegaCode ? 'bodegas' : 'insumos');
    const [grupoSel, setGrupoSel] = useState<string | null>(null);
    const [devolviendo, setDevolviendo] = useState<any>(null);
    const [venciendo, setVenciendo] = useState<any>(null);
    const [materialAbierto, setMaterialAbierto] = useState<string | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        code: '',
        capacity: 1000,
        description: ''
    });

    const openPreview = (lote: any) => {
        setSelectedLote(lote);
        setShowModal(true);
    };

    const openAudit = (lote: any) => {
        setSelectedLote(lote);
        setViewMode('DETAIL');
    };

    const submitBodega = (e: React.FormEvent) => {
        e.preventDefault();
        post('/bodegas', {
            onSuccess: () => {
                setShowBodegaModal(false);
                reset();
            }
        });
    };

    // Extraer tags únicos de todos los materiales en los lotes
    const allTags = useMemo(() => {
        const tagsSet = new Set<string>();
        lotes.forEach((l: any) => {
            if (l.tags && Array.isArray(l.tags)) {
                l.tags.forEach((t: any) => tagsSet.add(t.name || t));
            }
        });
        return Array.from(tagsSet).sort();
    }, [lotes]);

    // Filtros que no dependen de bodega ni categoría (búsqueda y etiqueta).
    const lotesBase = useMemo(() => lotes.filter((l: any) => {
        const matchesSearch = searchQuery
            ? (l.material_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               l.codigo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               l.lote?.toString().includes(searchQuery))
            : true;
        const matchesTag = selectedTag
            ? (l.tags && l.tags.some((t: any) => (t.name || t) === selectedTag))
            : true;
        return matchesSearch && matchesTag;
    }), [lotes, searchQuery, selectedTag]);

    const filteredLotes = useMemo(
        () => lotesBase.filter((l: any) => !selectedBodega || l.bodega === selectedBodega.name),
        [lotesBase, selectedBodega]);
    // Insumos sin existencia (sin lotes): aparecen en su bodega habitual con stock 0.
    const sinExistenciaFiltrados = useMemo(() => sinExistencia.filter((l: any) =>
        (!searchQuery || l.material_name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.codigo?.toLowerCase().includes(searchQuery.toLowerCase()))
        && (!selectedBodega || l.bodega === selectedBodega.name)), [sinExistencia, searchQuery, selectedBodega]);

    // Bodega y categoría se filtran entre sí: las categorías son las de la bodega elegida
    // y cada bodega cuenta solo los lotes de la categoría elegida.
    const categorias = useMemo(() => {
        const conteo = new Map<string, number>();
        filteredLotes.forEach((l: any) => { if (l.categoria) conteo.set(l.categoria, (conteo.get(l.categoria) ?? 0) + 1); });
        if (categoria && !conteo.has(categoria)) conteo.set(categoria, 0);
        return Array.from(conteo, ([nombre, n]) => ({ nombre, n })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    }, [filteredLotes, categoria]);
    const lotesPorBodega = (nombre?: string) =>
        lotesBase.filter((l: any) => (!nombre || l.bodega === nombre) && (!categoria || l.categoria === categoria)).length;
    // Al cambiar de bodega se descarta una categoría que no tiene lotes en ella.
    const elegirBodega = (b: any) => {
        setSelectedBodega(b);
        if (categoria && !lotesBase.some((l: any) => (!b || l.bodega === b.name) && l.categoria === categoria)) setCategoria('');
    };

    // Insumos agrupados (los lotes ya vienen en orden FEFO desde el servidor)
    const materiales = useMemo(() => {
        const map = new Map<string, any>();
        filteredLotes.filter((l: any) => !categoria || l.categoria === categoria).forEach((l: any) => {
            if (!map.has(l.codigo)) map.set(l.codigo, { codigo: l.codigo, nombre: l.material_name, categoria: l.categoria, unidad: l.unit || 'kg',
                foto: l.photo_url, materialId: l.material_id, presentacion: l.presentacion_nombre ?? null, factor: l.presentacion_cantidad ? Number(l.presentacion_cantidad) : null, vidaUtil: l.vida_util_dias ?? null, descripcion: l.descripcion ?? null, diasCriticos: l.dias_criticos ?? null, diasEntrega: l.dias_entrega ?? null, umbral: Number(l.umbral_dias || 0), minimo: Number(l.stock_minimo || 0), stockGlobal: Number(l.stock_total || 0), stock: 0, lotes: [], criticos: 0, cuarentena: 0, proximo: null });
            const m = map.get(l.codigo);
            m.lotes.push(l);
            if (l.estado === 'quarantined') m.cuarentena++; else m.stock += Number(l.cantidad) || 0;
            if (l.status === 'CRITICO' && l.estado !== 'quarantined') m.criticos++;
            if (!m.proximo && l.estado === 'active') m.proximo = l.vencimiento;
        });
        sinExistenciaFiltrados.filter((l: any) => !categoria || l.categoria === categoria).forEach((l: any) => {
            if (map.has(l.codigo)) return;
            map.set(l.codigo, { codigo: l.codigo, nombre: l.material_name, categoria: l.categoria, unidad: l.unit || 'kg', foto: l.photo_url, materialId: l.material_id,
                presentacion: l.presentacion_nombre ?? null, factor: l.presentacion_cantidad ? Number(l.presentacion_cantidad) : null, vidaUtil: l.vida_util_dias ?? null, descripcion: l.descripcion ?? null,
                diasCriticos: l.dias_criticos ?? null, diasEntrega: l.dias_entrega ?? null, umbral: 0, minimo: Number(l.stock_minimo || 0), stockGlobal: 0,
                stock: 0, lotes: [], criticos: 0, cuarentena: 0, proximo: null, sinExistencia: true, bodegaId: l.bodega_id });
        });
        return Array.from(map.values()).sort((a, b) => (b.criticos - a.criticos) || (Number(!!a.sinExistencia) - Number(!!b.sinExistencia)) || a.nombre.localeCompare(b.nombre));
    }, [filteredLotes, sinExistenciaFiltrados, categoria]);
    const materialSel = materiales.find((m) => m.codigo === materialAbierto) ?? null;
    // Producto terminado: el lote lo arma el sistema (código-fecha-hora) para que el operario solo cuente paquetes.
    const esProductoTerminado = (m: any) => {
        const id = m?.lotes?.[0]?.bodega_id ?? m?.bodegaId;
        return bodegas.find((b: any) => b.id === id)?.grupo === 'producto_terminado';
    };

    // Derivar lista de materiales únicos para el wizard (con stock total)
    const materialsList = useMemo(() => {
        const map = new Map<number, { id: number; name: string; code: string; photo_url: string | null; unit: string; presentacion_nombre: string | null; presentacion_cantidad: number | null; stock_total: number }>();
        lotes.forEach((l: any) => {
            // Sin material_id no se puede consumir: el id del lote no sirve (es otra tabla).
            if (!l.material_name || !l.material_id) return;
            const key = l.material_id;
            if (!map.has(key)) {
                map.set(key, {
                    id: l.material_id,
                    name: l.material_name,
                    code: l.codigo,
                    photo_url: l.photo_url,
                    unit: l.unit || 'kg',
                    presentacion_nombre: l.presentacion_nombre ?? null,
                    presentacion_cantidad: l.presentacion_cantidad ? Number(l.presentacion_cantidad) : null,
                    stock_total: 0,
                });
            }
            const entry = map.get(key)!;
            entry.stock_total += parseFloat(l.cantidad) || 0;
        });
        return Array.from(map.values());
    }, [lotes]);

    if (viewMode === 'DETAIL') {
        return <FigmaMovements lote={selectedLote} onBack={() => setViewMode('GRID')} />;
    }

    if (viewMode === 'FORM') {
        return <FigmaForms onBack={() => setViewMode('GRID')} initialBodega={selectedBodega} bodegas={bodegas} categorias={categoriasExistentes} />;
    }

    if (viewMode === 'CONSUME') {
        return <FigmaConsumeForm onBack={() => setViewMode('GRID')} lote={selectedLote} />;
    }

    if (viewMode === 'WIZARD') {
        return <FigmaConsumeWizard onBack={() => { setViewMode('GRID'); setWizardMaterial(null); }} initialMaterials={materialsList} materialInicial={wizardMaterial} />;
    }

    const fmt = (n: number) => Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });

    return (
        <div className="relative mx-auto max-w-7xl space-y-5">
            {/* Modal de Conciliación (Ajuste Manual) */}
            {devolviendo && <FigmaDevolucion lote={devolviendo} onClose={() => setDevolviendo(null)} />}
            {venciendo && <FigmaVencimiento lote={venciendo} onClose={() => setVenciendo(null)} />}
            {showAdjustModal && selectedLote && (
                <AdjustModal 
                    lote={selectedLote} 
                    onClose={() => setShowAdjustModal(false)} 
                />
            )}

            {/* Modal Nueva Bodega */}
            {showBodegaModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-obsidiana/40 backdrop-blur-xl p-4">
                    <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] shadow-2xl border border-white/20 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-4 sm:p-8 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                            <div>
                                <h3 className="text-lg font-black text-white tracking-tight font-display">Nueva Ubicación</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Crear carpeta de inventario</p>
                            </div>
                            <button onClick={() => setShowBodegaModal(false)} className="w-10 h-10 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 text-slate-400 flex items-center justify-center rounded-2xl hover:bg-slate-800/50 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={submitBodega} className="p-4 sm:p-8 space-y-4 sm:space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nombre de la Bodega</label>
                                    <input aria-label="Nombre de la Bodega" maxLength={255} 
                                        type="text" 
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        placeholder="Ej: Bodega Norte, Cuarentena..."
                                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    />
                                    {errors.name && <div className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.name}</div>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Código</label>
                                        <input aria-label="Código" maxLength={20} 
                                            type="text" 
                                            value={data.code}
                                            onChange={e => setData('code', e.target.value.toUpperCase())}
                                            placeholder="B-001"
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all uppercase"
                                        />
                                        {errors.code && <div className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.code}</div>}
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Capacidad</label>
                                        <input aria-label="Capacidad" 
                                            type="number" 
                                            value={data.capacity}
                                            onChange={e => setData('capacity', parseInt(e.target.value))}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={processing}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg glow-indigo disabled:opacity-50"
                            >
                                {processing ? 'Sincronizando...' : 'Crear Ubicación'}
                            </button>
                        </form>
                    </div>
                </div>
            )}


            {/* Pestañas del módulo: insumos y bodegas */}
            <div className="flex items-center justify-between gap-3">
                <div role="tablist" className="inline-flex rounded-2xl border border-slate-700/40 bg-slate-800/40 p-1">
                    {(['insumos', 'bodegas'] as const).map((t) => (
                        <button key={t} role="tab" aria-selected={pestana === t} onClick={() => setPestana(t)}
                            className={`whitespace-nowrap rounded-xl px-3 sm:px-4 py-2 text-sm font-bold capitalize transition ${pestana === t ? 'bg-indigo-600 text-white shadow' : 'text-slate-300'}`}>
                            {t} <span className="ml-1 text-xs font-normal">{t === 'insumos' ? new Set(lotes.map((l: any) => l.codigo)).size : bodegas.length}</span>
                        </button>
                    ))}
                </div>
                {pestana === 'bodegas' && user?.role === 'admin' && onManageBodegas && (
                    <button onClick={() => onManageBodegas('nueva')} className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white active:scale-95">
                        <Plus size={16} /> <span className="whitespace-nowrap">Nueva bodega</span>
                    </button>
                )}
            </div>

            {pestana === 'bodegas' && hayGrupos && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-label="Grupos de bodegas">
                    {Object.entries(GRUPOS).map(([k, nombre]) => {
                        const delGrupo = bodegas.filter((b: any) => b.grupo === k);
                        const activo = grupoSel === k;
                        return (
                            <button key={k} onClick={() => setGrupoSel(activo ? null : k)} aria-pressed={activo}
                                className={`rounded-3xl border p-5 text-left transition active:scale-[0.99] ${activo ? 'border-indigo-400 bg-indigo-500/15' : 'border-slate-700/40 bg-slate-800/40 hover:bg-slate-800/70'}`}>
                                <span className="block text-lg font-black text-white">{nombre}</span>
                                <span className="mt-1 block text-sm text-slate-300">
                                    {delGrupo.length} {delGrupo.length === 1 ? 'bodega' : 'bodegas'} · {delGrupo.reduce((t: number, b: any) => t + (b.insumos || 0), 0)} insumos con existencia
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {pestana === 'bodegas' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {bodegas.filter((b: any) => !grupoSel || b.grupo === grupoSel).map((b: any) => (
                        <FigmaBodegaBar key={b.code} bodega={b}
                            onOpen={() => { elegirBodega(b); setPestana('insumos'); }}
                            onEdit={user?.role === 'admin' && onManageBodegas ? () => onManageBodegas(b.id) : undefined} />
                    ))}
                </div>
            ) : (<>
            {/* Buscador y acciones */}
            <div className="space-y-3 lg:flex lg:items-center lg:justify-between lg:gap-4 lg:space-y-0">
                <label className="relative block flex-1 lg:max-w-md">
                    <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar insumo, código o lote"
                        className="w-full rounded-2xl border border-slate-700/40 bg-slate-800/50 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none" />
                </label>
                <div className="grid grid-cols-3 gap-2 lg:flex">
                    <button onClick={() => setViewMode('FORM')} className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-900/30 active:scale-95">
                        <Plus size={16} /> Ingreso
                    </button>
                    <button onClick={() => setViewMode('WIZARD')} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700/40 bg-slate-800/60 px-4 py-3 text-xs font-bold text-white active:scale-95">
                        <Sparkles size={16} /> Consumo FEFO
                    </button>
                    <button onClick={() => onNavigate?.('ESCANER')} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700/40 bg-slate-800/60 px-4 py-3 text-xs font-bold text-white active:scale-95">
                        <ScanLine size={16} /> Escanear
                    </button>
                </div>
            </div>

            {/* Filtros por bodega y categoría */}
            <div className="-mx-4 space-y-2 px-4 sm:mx-0 sm:px-0">
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
                    <Chip activo={!selectedBodega} onClick={() => elegirBodega(null)}>Todas las bodegas <b>{lotesPorBodega()}</b></Chip>
                    {bodegas.map((b: any) => {
                        const n = lotesPorBodega(b.name);
                        return (
                            <Chip key={b.code} activo={selectedBodega?.code === b.code} atenuado={!!categoria && n === 0} onClick={() => elegirBodega(b)}>
                                {b.name} <b>{n}</b>
                            </Chip>
                        );
                    })}
                    {user?.role === 'admin' && (
                        <button onClick={() => onManageBodegas ? onManageBodegas(null) : setShowBodegaModal(true)} className="shrink-0 rounded-full border border-dashed border-indigo-400/50 px-3 py-1.5 text-xs font-semibold text-indigo-200">Gestionar bodegas</button>
                    )}
                </div>
                {(categorias.length > 1 || categoria) && (
                    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible" role="group" aria-label="Filtrar por categoría">
                        <Chip sutil activo={!categoria} onClick={() => setCategoria('')}>Todas las categorías</Chip>
                        {categorias.map((c) => <Chip sutil key={c.nombre} activo={categoria === c.nombre} onClick={() => setCategoria(categoria === c.nombre ? '' : c.nombre)}>{c.nombre} <b>{c.n}</b></Chip>)}
                    </div>
                )}
            </div>

            {/* Bodega seleccionada: imagen y resumen real */}
            {selectedBodega && (
                <div className="pm-media relative overflow-hidden rounded-3xl border border-slate-700/40 bg-slate-900">
                    {selectedBodega.image_url && <img src={selectedBodega.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />}
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/70 to-slate-950/20" />
                    <div className="relative flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{selectedBodega.code}</p>
                            <h2 className="text-2xl font-bold normal-case text-white">{selectedBodega.name}</h2>
                            {selectedBodega.description && <p className="mt-1 max-w-md text-sm text-slate-300">{selectedBodega.description}</p>}
                        </div>
                        <div className="flex gap-4 text-sm text-slate-300">
                            <span><b className="text-white">{selectedBodega.lotes ?? 0}</b> lotes</span>
                            <span><b className="text-white">{selectedBodega.insumos ?? 0}</b> insumos</span>
                            <span><b className={selectedBodega.criticos ? 'text-rose-300' : 'text-white'}>{selectedBodega.criticos ?? 0}</b> por vencer</span>
                            {user?.role === 'admin' && onManageBodegas && (
                                <button onClick={() => onManageBodegas(selectedBodega.id)} className="font-semibold text-indigo-300">Editar</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Insumos */}
            {materiales.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {materiales.map((m) => {
                        // El mínimo se compara con el stock total del insumo en todas las bodegas, no solo el filtrado.
                        const bajo = m.minimo > 0 && m.stockGlobal < m.minimo;
                        return (
                            <button key={m.codigo} onClick={() => setMaterialAbierto(m.codigo)}
                                className="group flex items-center gap-4 rounded-3xl border border-slate-700/30 bg-slate-800/40 p-3 text-left transition hover:border-indigo-400/40 active:scale-[0.99]">
                                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-900">
                                    {m.foto ? <img src={m.foto} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                                        : <Warehouse size={28} className="absolute inset-0 m-auto text-slate-300" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{m.codigo}{m.categoria ? ` · ${m.categoria}` : ''}</p>
                                    <p className="truncate text-[15px] font-bold leading-snug text-white">{m.nombre}</p>
                                    <p className="mt-0.5 text-sm text-slate-300"><span className="font-bold text-white">{fmt(m.stock)}</span> {m.unidad} · {m.lotes.length} {m.lotes.length === 1 ? 'lote' : 'lotes'}</p>
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {m.criticos > 0 && <Badge tono="rojo">{m.criticos} por vencer</Badge>}
                                        {bajo && <Badge tono="ambar">Bajo mínimo</Badge>}
                                        {m.cuarentena > 0 && <Badge tono="gris">Cuarentena</Badge>}
                                        {!m.criticos && !bajo && m.proximo && <Badge tono="gris">Vence {m.proximo}</Badge>}
                                    </div>
                                </div>
                                <ChevronRight size={18} className="shrink-0 text-slate-500" />
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-700/50 py-20 text-center text-slate-400">
                    <Box size={40} className="mb-3 opacity-40" />
                    <p className="text-sm font-semibold">Sin existencias para este filtro</p>
                </div>
            )}

            </>)}

            {/* Panel del insumo con sus lotes en orden FEFO */}
            {materialSel && (
                <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={materialSel.nombre}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMaterialAbierto(null)} />
                    <div className="pm-chrome relative max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-obsidiana p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-in slide-in-from-bottom duration-300 sm:max-w-2xl sm:rounded-3xl">
                        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-600 sm:hidden" />
                        <div className="flex items-start gap-4">
                            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-900">
                                {materialSel.foto && <img src={materialSel.foto} alt="" className="h-full w-full object-cover" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{materialSel.codigo}</p>
                                <h3 className="text-xl font-bold leading-tight text-white">{materialSel.nombre}</h3>
                                <p className="mt-1 text-sm text-slate-300">Stock total <b className="text-white">{fmt(materialSel.stock)} {materialSel.unidad}</b>{materialSel.minimo > 0 && <> · mínimo {fmt(materialSel.minimo)}</>}</p>
                                {materialSel.descripcion && <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{materialSel.descripcion}</p>}
                            </div>
                            <button onClick={() => setMaterialAbierto(null)} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-300"><X size={18} /></button>
                        </div>

                        <button onClick={() => { setWizardMaterial(materialSel.materialId ?? null); setMaterialAbierto(null); setViewMode('WIZARD'); }}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white active:scale-[0.99]">
                            <Sparkles size={16} /> Consumir por FEFO
                        </button>
                        {materialSel.materialId && (
                            <FigmaIngresoLote key={`ing-${materialSel.codigo}`} materialId={materialSel.materialId} unidad={materialSel.unidad} presentacion={materialSel.presentacion} factor={materialSel.factor} vidaUtil={materialSel.vidaUtil}
                                loteSugerido={esProductoTerminado(materialSel) ? `${materialSel.codigo}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${new Date().toTimeString().slice(0, 5).replace(':', '')}` : ''}
                                bodegas={bodegas.map((b: any) => ({ id: b.id, name: b.name }))}
                                costoSugerido={materialSel.lotes[materialSel.lotes.length - 1]?.unit_cost ?? null}
                                bodegaSugerida={materialSel.lotes[0]?.bodega_id ?? materialSel.bodegaId ?? null}
                                onListo={() => setMaterialAbierto(null)} />
                        )}

                        {user?.role === 'admin' && materialSel.materialId && (
                            <FigmaMaterialAjustes key={materialSel.codigo} categorias={categoriasExistentes} materialId={materialSel.materialId} unidad={materialSel.unidad}
                                categoria={materialSel.categoria ?? null} minimo={materialSel.minimo} diasCriticos={materialSel.diasCriticos} diasEntrega={materialSel.diasEntrega} umbral={materialSel.umbral} presentacion={materialSel.presentacion} factor={materialSel.factor} vidaUtil={materialSel.vidaUtil} />
                        )}

                        <h4 className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-widest text-slate-500">Lotes · sale primero el de arriba</h4>
                        <ol className="space-y-2">
                            {materialSel.lotes.map((l: any, i: number) => (
                                <li key={l.id} className={`rounded-2xl border p-3 ${l.status === 'CRITICO' ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-700/40 bg-slate-800/40'}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-white">{i === 0 && l.estado === 'active' && <span className="mr-1.5 rounded-md bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-200">PRIMERO</span>}{l.lote}</p>
                                            <p className="text-xs text-slate-400">{l.bodega} · vence {l.vencimiento}{l.vencimiento_estimado && (user?.role === 'admin'
                                                ? <button onClick={() => setVenciendo(l)} className="ml-1 rounded bg-amber-400/15 px-1 text-amber-200 underline" title="Calculado con la vida útil típica: confirme la fecha de la etiqueta">estimado · confirmar</button>
                                                : <span className="ml-1 rounded bg-amber-400/15 px-1 text-amber-200">estimado</span>)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-white">{fmt(l.cantidad)} {l.unit}</p>
                                            {l.estado === 'quarantined' ? <Badge tono="gris">Cuarentena</Badge>
                                                : l.days_until_expiration !== undefined && <FigmaFefoBadge daysUntilExpiration={l.days_until_expiration} size="sm" />}
                                        </div>
                                    </div>
                                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                        <MiniAccion onClick={() => { setSelectedLote(l); setMaterialAbierto(null); setViewMode('CONSUME'); }}>Consumir</MiniAccion>
                                        <MiniAccion onClick={() => setDevolviendo({ ...l, material_name: materialSel.nombre })}>Devolver</MiniAccion>
                                        <MiniAccion onClick={() => { setSelectedLote(l); setMaterialAbierto(null); setViewMode('DETAIL'); }}>Kardex</MiniAccion>
                                        {user?.role === 'admin'
                                            ? <MiniAccion onClick={() => { setSelectedLote(l); setMaterialAbierto(null); setShowAdjustModal(true); }}>Conciliar</MiniAccion>
                                            : <MiniAccion onClick={() => { setMaterialAbierto(null); onNavigate?.('TRANSFERENCIAS'); }}>Transferir</MiniAccion>}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
};

const Chip = ({ activo, sutil, atenuado, onClick, children }: { activo: boolean; sutil?: boolean; atenuado?: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} aria-pressed={activo}
        className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition [&_b]:ml-1 [&_b]:font-normal ${activo
            ? (sutil ? 'border-amber-400/40 bg-amber-400/15 text-amber-200' : 'border-indigo-400/50 bg-indigo-500/20 text-indigo-100')
            : atenuado ? 'border-dashed border-slate-700/50 bg-transparent text-slate-500' : 'border-slate-700/50 bg-slate-800/40 text-slate-300'}`}>
        {children}
    </button>
);

const Badge = ({ tono, children }: { tono: 'rojo' | 'ambar' | 'gris'; children: React.ReactNode }) => (
    <span className={`inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${tono === 'rojo' ? 'bg-rose-500/15 text-rose-300' : tono === 'ambar' ? 'bg-amber-400/15 text-amber-300' : 'bg-slate-700/60 text-slate-300'}`}>{children}</span>
);

const MiniAccion = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className="rounded-xl border border-slate-700/50 bg-slate-900/60 py-2 text-xs font-semibold text-slate-200 active:scale-95">{children}</button>
);

// Subcomponente para el modal de ajuste (Conciliación)
const AdjustModal = ({ lote, onClose }: { lote: any, onClose: () => void }) => {
    const { data, setData, patch, processing, errors, reset } = useForm({
        new_quantity: lote.cantidad,
        reason: ''
    });

    const submitAdjust = (e: React.FormEvent) => {
        e.preventDefault();
        patch(`/inventory/adjust/${lote.id}`, {
            onSuccess: () => {
                onClose();
                reset();
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-obsidiana/40 backdrop-blur-xl p-4" role="dialog" aria-modal="true" aria-label="Conciliación física">
            <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl sm:rounded-[2.5rem] shadow-2xl border border-white/20 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-4 sm:p-8 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight font-display">Conciliación Física</h3>
                        <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">Ajuste de Stock: {lote.codigo}</p>
                    </div>
                    <button onClick={onClose} aria-label="Cerrar" className="w-10 h-10 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 text-slate-400 flex items-center justify-center rounded-2xl hover:bg-slate-800/50 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={submitAdjust} className="p-4 sm:p-8 space-y-4 sm:space-y-6">
                    <div className="space-y-4">
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                            <div className="text-[10px] font-black text-slate-400 uppercase">Stock actual en sistema</div>
                            <div className="text-2xl font-black text-white">{lote.cantidad} {lote.unit}</div>
                        </div>
                        
                        <div>
                            <label htmlFor="ajuste-cantidad" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Stock físico real ({lote.unit})</label>
                            <input id="ajuste-cantidad" 
                                type="number" 
                                step="0.01"
                                value={data.new_quantity}
                                onChange={e => setData('new_quantity', parseFloat(e.target.value))}
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-4 text-xl font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                            {errors.new_quantity && <div className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.new_quantity}</div>}
                        </div>

                        <div>
                            <label htmlFor="ajuste-motivo" className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Motivo del ajuste</label>
                            <textarea id="ajuste-motivo" maxLength={255} 
                                value={data.reason}
                                onChange={e => setData('reason', e.target.value)}
                                placeholder="Indica por qué cambió el stock (ej: pérdida por humedad, error de pesaje...)"
                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                                required
                            />
                            {errors.reason && <div className="text-red-500 text-[10px] font-bold mt-1 uppercase">{errors.reason}</div>}
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={processing}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all shadow-lg glow-red disabled:opacity-50"
                    >
                        {processing ? 'Sincronizando...' : 'Corregir Inventario'}
                    </button>
                    <p className="text-[9px] text-slate-400 text-center italic">Esta acción registrará un movimiento de ajuste en el Kardex para auditoría.</p>
                </form>
            </div>
        </div>
    );
};

export default FigmaInventario;
