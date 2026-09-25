import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import gsap from 'gsap';
import {
    AlertTriangle,
    Bot,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    GripVertical,
    Keyboard,
    Menu,
    Pin,
    PinOff,
    Plus,
    Rows3,
    Save,
    Search,
    Send,
    Sparkles,
    Trash2,
    Undo2,
    X,
} from 'lucide-react';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    closestCorners,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Sidebar from '../Components/Sidebar';
import MobileNav from '../Components/MobileNav';

/* ═══════════════════════════════════════════════════════════════════
   TIPOS Y CONSTANTES
   Las 4 columnas son canónicas: el enum de la DB no acepta más.
   ═══════════════════════════════════════════════════════════════════ */

type ColumnKey = 'todo' | 'in_progress' | 'review' | 'done';

interface KanbanItemT {
    id: number;
    title: string;
    description?: string | null;
    column: ColumnKey;
    position: number;
    is_pinned?: boolean | number;
    rag_context?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    user?: { id?: number; name?: string } | null;
}

type Board = Record<ColumnKey, KanbanItemT[]>;

interface RagMessage {
    role: 'user' | 'ai';
    content: string;
}

interface ToastT {
    id: number;
    kind: 'info' | 'error' | 'undo';
    text: string;
    actionLabel?: string;
    onAction?: () => void;
}

/** Orden EXACTO en que KanbanController::index() devuelve las columnas. */
const COLUMN_ORDER: ColumnKey[] = ['todo', 'in_progress', 'review', 'done'];

const COLUMN_META: Record<ColumnKey, { label: string; hint: string }> = {
    todo: { label: 'Por hacer', hint: 'Backlog priorizado' },
    in_progress: { label: 'En progreso', hint: 'Trabajo activo' },
    review: { label: 'En revisión', hint: 'Esperando validación' },
    done: { label: 'Completado', hint: 'Cerrado' },
};

const LS_WIP = 'pymetory.kanban.wip';
const LS_COLLAPSED = 'pymetory.kanban.collapsed';
const LS_DENSITY = 'pymetory.kanban.density';

const AGE_WARN = 3;
const AGE_HOT = 7;
const UNDO_MS = 6000;

/* ═══════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════ */

const csrfToken = (): string =>
    document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

const api = axios.create({
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
});

api.interceptors.request.use((config) => {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)['X-CSRF-TOKEN'] = csrfToken();
    return config;
});

function emptyBoard(): Board {
    return { todo: [], in_progress: [], review: [], done: [] };
}

/** Normaliza cualquier payload del servidor a un Board de 4 llaves garantizadas. */
function normalizeBoard(raw: unknown): Board {
    const source = (raw ?? {}) as Record<string, unknown>;
    const out = emptyBoard();
    COLUMN_ORDER.forEach((key) => {
        const list = Array.isArray(source[key]) ? (source[key] as KanbanItemT[]) : [];
        out[key] = list.map((item, index) => ({
            ...item,
            column: key,
            position: typeof item.position === 'number' ? item.position : index,
            is_pinned: !!item.is_pinned,
        }));
    });
    return out;
}

/** Resuelve a qué columna pertenece un id de dnd-kit (tarjeta numérica o `col:key`). */
function resolveColumn(board: Board, overId: unknown): ColumnKey | null {
    const raw = String(overId ?? '');
    if (raw.startsWith('col:')) {
        const key = raw.slice(4) as ColumnKey;
        return COLUMN_ORDER.includes(key) ? key : null;
    }
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
        for (const key of COLUMN_ORDER) {
            if (board[key].some((item) => item.id === numeric)) return key;
        }
    }
    return null;
}

function findItem(board: Board, id: number | null): KanbanItemT | null {
    if (id === null) return null;
    for (const key of COLUMN_ORDER) {
        const hit = board[key].find((item) => item.id === id);
        if (hit) return hit;
    }
    return null;
}

/** Días sin movimiento. Señal de aging: se calcula, no se persiste. */
function ageDays(item: KanbanItemT): number {
    const stamp = Date.parse(String(item.updated_at ?? item.created_at ?? ''));
    if (Number.isNaN(stamp)) return 0;
    return Math.max(0, Math.floor((Date.now() - stamp) / 86_400_000));
}

function readJSON<T>(key: string, fallback: T): T {
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

function writeJSON(key: string, value: unknown): void {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        /* modo privado / cuota: preferencia no crítica */
    }
}

/* ═══════════════════════════════════════════════════════════════════
   TARJETA SORTABLE
   ═══════════════════════════════════════════════════════════════════ */

interface CardProps {
    item: KanbanItemT;
    index: number;
    total: number;
    focused: boolean;
    compact: boolean;
    onFocus: (id: number) => void;
    onOpen: (item: KanbanItemT) => void;
    onPin: (item: KanbanItemT) => void;
    onAskRag: (item: KanbanItemT) => void;
}

function KanbanCard({
    item,
    index,
    total,
    focused,
    compact,
    onFocus,
    onOpen,
    onPin,
    onAskRag,
}: CardProps) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
        useSortable({ id: item.id, data: { type: 'card', column: item.column } });

    const days = ageDays(item);
    const aging = item.column !== 'done' && days >= AGE_WARN;
    const hot = item.column !== 'done' && days >= AGE_HOT;

    const label = `${item.title}. ${COLUMN_META[item.column].label}, posición ${index + 1} de ${total}${
        item.is_pinned ? ', fijada' : ''
    }${aging ? `, sin movimiento ${days} días` : ''}.`;

    return (
        <article
            ref={setNodeRef}
            id={`pm-kb-card-${item.id}`}
            data-kb-card={item.id}
            tabIndex={focused ? 0 : -1}
            aria-label={label}
            aria-roledescription="Tarjeta del tablero, arrastrable"
            onFocus={() => onFocus(item.id)}
            onDoubleClick={() => onOpen(item)}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            className={[
                'pm-card pm-kb-card',
                compact ? 'pm-kb-card--compact' : '',
                isDragging ? 'pm-kb-card--dragging' : '',
                focused ? 'pm-kb-card--focused' : '',
                item.is_pinned ? 'pm-kb-card--pinned' : '',
                hot ? 'pm-kb-card--hot' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <div className="flex items-start gap-2">
                <button
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    data-kb-grip="true"
                    aria-label={`Arrastrar ${item.title}`}
                    className="pm-kb-grip"
                >
                    <GripVertical size={14} aria-hidden="true" />
                </button>

                <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="pm-kb-card__title flex-1 min-w-0 text-left"
                >
                    {item.title}
                </button>

                <div className="flex items-center gap-0.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => onPin(item)}
                        aria-pressed={!!item.is_pinned}
                        aria-label={item.is_pinned ? `Desfijar ${item.title}` : `Fijar ${item.title}`}
                        title={item.is_pinned ? 'Desfijar (P)' : 'Fijar (P)'}
                        className={`pm-kb-iconbtn ${item.is_pinned ? 'pm-kb-iconbtn--on' : ''}`}
                    >
                        {item.is_pinned ? <Pin size={13} aria-hidden="true" /> : <PinOff size={13} aria-hidden="true" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => onAskRag(item)}
                        aria-label={`Consultar el motor RAG sobre ${item.title}`}
                        title="Consultar RAG (A)"
                        className={`pm-kb-iconbtn ${item.rag_context ? 'pm-kb-iconbtn--rag' : ''}`}
                    >
                        <Bot size={13} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {!compact && item.description ? (
                <p className="pm-kb-card__desc">{item.description}</p>
            ) : null}

            {(aging || item.is_pinned || item.rag_context) && (
                <div className="pm-kb-card__meta">
                    {item.is_pinned ? (
                        <span className="pm-kb-chip pm-kb-chip--pin">
                            <Pin size={9} aria-hidden="true" /> Fijada
                        </span>
                    ) : null}
                    {aging ? (
                        <span className={`pm-kb-chip ${hot ? 'pm-kb-chip--hot' : 'pm-kb-chip--warn'}`}>
                            <Clock size={9} aria-hidden="true" /> {days}d sin mover
                        </span>
                    ) : null}
                    {item.rag_context ? (
                        <span className="pm-kb-chip pm-kb-chip--rag">
                            <Sparkles size={9} aria-hidden="true" /> Contexto IA
                        </span>
                    ) : null}
                </div>
            )}
        </article>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   COMPOSER — alta rápida, permanece abierto para entrada en ráfaga
   ═══════════════════════════════════════════════════════════════════ */

function Composer({
    column,
    onCreate,
}: {
    column: ColumnKey;
    onCreate: (title: string, description: string, column: ColumnKey) => void;
}) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [withDesc, setWithDesc] = useState(false);
    const titleRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (open) titleRef.current?.focus();
    }, [open]);

    const close = () => {
        setOpen(false);
        setTitle('');
        setDescription('');
        setWithDesc(false);
    };

    const submit = () => {
        if (!title.trim()) return;
        onCreate(title.trim(), description.trim(), column);
        setTitle('');
        setDescription('');
        setWithDesc(false);
        titleRef.current?.focus();
    };

    if (!open) {
        return (
            <button
                type="button"
                data-kb-add={column}
                onClick={() => setOpen(true)}
                aria-label={`Agregar tarjeta en ${COLUMN_META[column].label}`}
                className="pm-kb-add"
            >
                <Plus size={14} aria-hidden="true" />
                Agregar tarjeta
            </button>
        );
    }

    return (
        <div className="pm-kb-composer" role="group" aria-label={`Nueva tarjeta en ${COLUMN_META[column].label}`}>
            <textarea
                ref={titleRef}
                data-kb-input={column}
                rows={2}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submit();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        close();
                    }
                }}
                placeholder="Título de la tarea…"
                aria-label="Título de la nueva tarjeta"
                className="pm-kb-field pm-kb-field--title"
            />

            {withDesc ? (
                <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            close();
                        }
                    }}
                    placeholder="Descripción (opcional)…"
                    aria-label="Descripción de la nueva tarjeta"
                    className="pm-kb-field"
                />
            ) : (
                <button type="button" onClick={() => setWithDesc(true)} className="pm-kb-linkbtn">
                    + descripción
                </button>
            )}

            <div className="flex items-center gap-2">
                <button type="button" onClick={submit} disabled={!title.trim()} className="pm-kb-btn pm-kb-btn--primary flex-1">
                    <Check size={13} aria-hidden="true" /> Crear
                </button>
                <button type="button" onClick={close} aria-label="Cancelar nueva tarjeta" className="pm-kb-btn pm-kb-btn--ghost">
                    <X size={13} aria-hidden="true" />
                </button>
            </div>
            <p className="pm-kb-hint">
                <kbd className="pm-kb-kbd">Enter</kbd> crea · <kbd className="pm-kb-kbd">Esc</kbd> cierra
            </p>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   COLUMNA
   ═══════════════════════════════════════════════════════════════════ */

interface ColumnProps {
    colKey: ColumnKey;
    items: KanbanItemT[];
    totalCount: number;
    wip: number;
    collapsed: boolean;
    compact: boolean;
    filtering: boolean;
    focusedId: number | null;
    onToggleCollapse: (key: ColumnKey) => void;
    onSetWip: (key: ColumnKey, value: number) => void;
    onCreate: (title: string, description: string, column: ColumnKey) => void;
    onFocusCard: (id: number) => void;
    onOpenCard: (item: KanbanItemT) => void;
    onPinCard: (item: KanbanItemT) => void;
    onAskRag: (item: KanbanItemT) => void;
}

function BoardColumn(props: ColumnProps) {
    const {
        colKey,
        items,
        totalCount,
        wip,
        collapsed,
        compact,
        filtering,
        focusedId,
        onToggleCollapse,
        onSetWip,
        onCreate,
        onFocusCard,
        onOpenCard,
        onPinCard,
        onAskRag,
    } = props;

    const { setNodeRef, isOver } = useDroppable({
        id: `col:${colKey}`,
        data: { type: 'column', column: colKey },
    });

    const [editingWip, setEditingWip] = useState(false);
    const [wipDraft, setWipDraft] = useState(String(wip || ''));
    const meta = COLUMN_META[colKey];
    const overLimit = wip > 0 && totalCount > wip;
    const ids = useMemo(() => items.map((item) => item.id), [items]);

    const commitWip = () => {
        const parsed = Math.max(0, Math.min(99, parseInt(wipDraft, 10) || 0));
        onSetWip(colKey, parsed);
        setEditingWip(false);
    };

    if (collapsed) {
        return (
            <section
                data-col={colKey}
                aria-label={`${meta.label} (colapsada, ${totalCount} tarjetas)`}
                className={`pm-kb-col pm-kb-col--collapsed ${isOver ? 'pm-kb-col--over' : ''}`}
            >
                <button
                    type="button"
                    onClick={() => onToggleCollapse(colKey)}
                    aria-label={`Expandir columna ${meta.label}`}
                    className="pm-kb-col__rail"
                >
                    <ChevronRight size={14} aria-hidden="true" />
                    <span className="pm-kb-col__rail-label">{meta.label}</span>
                    <span className="pm-kb-col__count">{totalCount}</span>
                </button>
                <div ref={setNodeRef} className="pm-kb-col__raildrop" aria-hidden="true" />
            </section>
        );
    }

    return (
        <section
            data-col={colKey}
            aria-label={`${meta.label}, ${totalCount} tarjetas`}
            className={`pm-kb-col ${isOver ? 'pm-kb-col--over' : ''} ${overLimit ? 'pm-kb-col--overlimit' : ''}`}
        >
            <header className="pm-panel pm-kb-col__head">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="pm-kb-col__dot" aria-hidden="true" />
                    <span className="pm-kb-col__label">{meta.label}</span>
                </div>

                <div className="flex items-center gap-1">
                    {editingWip ? (
                        <input
                            autoFocus
                            inputMode="numeric"
                            value={wipDraft}
                            onChange={(e) => setWipDraft(e.target.value.replace(/\D/g, ''))}
                            onBlur={commitWip}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitWip();
                                if (e.key === 'Escape') setEditingWip(false);
                            }}
                            aria-label={`Límite WIP de ${meta.label}, 0 para sin límite`}
                            className="pm-kb-wipinput"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setWipDraft(String(wip || ''));
                                setEditingWip(true);
                            }}
                            title="Definir límite WIP (0 = sin límite)"
                            aria-label={`${totalCount} tarjetas${wip ? ` de un límite de ${wip}` : ''}. Editar límite WIP`}
                            className={`pm-kb-col__count ${overLimit ? 'pm-kb-col__count--over' : ''}`}
                        >
                            {overLimit ? <AlertTriangle size={9} aria-hidden="true" /> : null}
                            {totalCount}
                            {wip ? <span className="opacity-60">/{wip}</span> : null}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => onToggleCollapse(colKey)}
                        aria-label={`Colapsar columna ${meta.label}`}
                        title="Colapsar columna"
                        className="pm-kb-iconbtn"
                    >
                        <ChevronLeft size={13} aria-hidden="true" />
                    </button>
                </div>
            </header>

            {wip > 0 ? (
                <div className="pm-kb-wipbar" role="presentation">
                    <span style={{ width: `${Math.min(100, (totalCount / wip) * 100)}%` }} />
                </div>
            ) : (
                <p className="pm-kb-col__hint">{meta.hint}</p>
            )}

            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div ref={setNodeRef} className={`pm-kb-list ${compact ? 'pm-kb-list--compact' : ''}`} role="list">
                    {items.map((item, index) => (
                        <div role="listitem" key={item.id}>
                            <KanbanCard
                                item={item}
                                index={index}
                                total={items.length}
                                focused={focusedId === item.id}
                                compact={compact}
                                onFocus={onFocusCard}
                                onOpen={onOpenCard}
                                onPin={onPinCard}
                                onAskRag={onAskRag}
                            />
                        </div>
                    ))}

                    {items.length === 0 ? (
                        <p className="pm-kb-empty">{filtering ? 'Sin resultados en esta columna' : 'Columna vacía'}</p>
                    ) : null}
                </div>
            </SortableContext>

            <Composer column={colKey} onCreate={onCreate} />
        </section>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   PÁGINA
   ═══════════════════════════════════════════════════════════════════ */

export default function Kanban({
    auth,
    columns: initialColumns,
}: {
    auth: { user?: { name?: string; role?: string } };
    columns: Record<string, KanbanItemT[]>;
}) {
    const user = auth?.user ?? { name: 'Invitado', role: 'operario' };

    /* ── Board: state + ref espejo para cálculos deterministas en DnD ── */
    const [board, setBoardState] = useState<Board>(() => normalizeBoard(initialColumns));
    const boardData = useRef<Board>(board);
    const setBoard = useCallback((next: Board | ((current: Board) => Board)) => {
        const value = typeof next === 'function' ? (next as (c: Board) => Board)(boardData.current) : next;
        boardData.current = value;
        setBoardState(value);
    }, []);

    /* ── UI state ── */
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [pinnedOnly, setPinnedOnly] = useState(false);
    const [compact, setCompact] = useState(false);
    const [collapsed, setCollapsed] = useState<ColumnKey[]>([]);
    const [wip, setWip] = useState<Record<ColumnKey, number>>({ todo: 0, in_progress: 0, review: 0, done: 0 });
    const [focusedId, setFocusedId] = useState<number | null>(null);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [helpOpen, setHelpOpen] = useState(false);
    const [toasts, setToasts] = useState<ToastT[]>([]);

    /* ── Inspector ── */
    const [inspectId, setInspectId] = useState<number | null>(null);
    const [draftTitle, setDraftTitle] = useState('');
    const [draftDesc, setDraftDesc] = useState('');
    const [saving, setSaving] = useState(false);

    /* ── RAG ── */
    const [ragItemId, setRagItemId] = useState<number | null>(null);
    const [ragMessages, setRagMessages] = useState<RagMessage[]>([]);
    const [ragLoading, setRagLoading] = useState(false);
    const [ragInput, setRagInput] = useState('');
    const ragBaseContext = useRef<string>('');
    const ragEndRef = useRef<HTMLDivElement>(null);

    const boardElRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const dragSnapshot = useRef<Board | null>(null);
    const pendingDeletes = useRef<Map<number, { timer: number; item: KanbanItemT; index: number }>>(new Map());
    const toastSeq = useRef(1);

    /* ═══ Preferencias locales (no hay endpoint para esto: localStorage) ═══ */
    useEffect(() => {
        setWip((prev) => ({ ...prev, ...readJSON<Partial<Record<ColumnKey, number>>>(LS_WIP, {}) }));
        setCollapsed(readJSON<ColumnKey[]>(LS_COLLAPSED, []).filter((k) => COLUMN_ORDER.includes(k)));
        setCompact(readJSON<string>(LS_DENSITY, 'cozy') === 'compact');
    }, []);

    /* ═══ Sincronización con Inertia (nunca durante un drag) ═══ */
    useEffect(() => {
        if (activeId !== null) return;
        if (initialColumns) setBoard(normalizeBoard(initialColumns));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialColumns]);

    /* ═══ Reveal. clearProps:'all' es obligatorio: un transform inline
           residual crea containing block y descuadra overlays fixed.  ═══ */
    useEffect(() => {
        if (!boardElRef.current) return;
        const columnsEl = boardElRef.current.querySelectorAll('[data-col]');
        gsap.fromTo(
            columnsEl,
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: 0.42, stagger: 0.06, ease: 'power3.out', clearProps: 'all' }
        );
    }, []);

    /* ═══ Toasts ═══ */
    const pushToast = useCallback((toast: Omit<ToastT, 'id'>, ttl = 4000) => {
        const id = toastSeq.current++;
        setToasts((prev) => [...prev, { ...toast, id }]);
        window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ttl);
        return id;
    }, []);

    const dropToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    /* ═══ Sensores ═══ */
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
        useSensor(KeyboardSensor)
    );

    /* ═══ Filtrado ═══ */
    const filtering = query.trim().length > 0 || pinnedOnly;

    const visible = useMemo<Board>(() => {
        const term = query.trim().toLowerCase();
        const out = emptyBoard();
        COLUMN_ORDER.forEach((key) => {
            out[key] = board[key].filter((item) => {
                if (pinnedOnly && !item.is_pinned) return false;
                if (!term) return true;
                return (
                    item.title?.toLowerCase().includes(term) ||
                    (item.description ?? '').toLowerCase().includes(term) ||
                    (item.rag_context ?? '').toLowerCase().includes(term)
                );
            });
        });
        return out;
    }, [board, query, pinnedOnly]);

    const totals = useMemo(() => {
        const all = COLUMN_ORDER.reduce((sum, key) => sum + board[key].length, 0);
        const done = board.done.length;
        const shown = COLUMN_ORDER.reduce((sum, key) => sum + visible[key].length, 0);
        return { all, done, shown, pct: all === 0 ? 0 : Math.round((done / all) * 100) };
    }, [board, visible]);

    /* ═══ Persistencia de reorder ═══ */
    const persistReorder = useCallback(
        async (itemId: number, column: ColumnKey, position: number, rollback: Board) => {
            try {
                const res = await api.post('/kanban/reorder', { item_id: itemId, column, position });
                if (res.data?.columns) setBoard(normalizeBoard(res.data.columns));
            } catch {
                setBoard(rollback);
                pushToast({ kind: 'error', text: 'No se pudo guardar el movimiento. Tablero restaurado.' });
            }
        },
        [pushToast, setBoard]
    );

    /* ═══ Drag & drop ═══ */
    const handleDragStart = (event: { active: { id: number | string } }) => {
        dragSnapshot.current = boardData.current;
        setActiveId(Number(event.active.id));
        setFocusedId(Number(event.active.id));
    };

    const handleDragOver = (event: { active: { id: number | string }; over: { id: number | string } | null }) => {
        const { active, over } = event;
        if (!over) return;
        const current = boardData.current;
        const from = resolveColumn(current, active.id);
        const to = resolveColumn(current, over.id);
        if (!from || !to || from === to) return;

        const moving = current[from].find((item) => item.id === Number(active.id));
        if (!moving) return;

        const overIndex = current[to].findIndex((item) => item.id === Number(over.id));
        const target = [...current[to]];
        target.splice(overIndex === -1 ? target.length : overIndex, 0, { ...moving, column: to });

        setBoard({
            ...current,
            [from]: current[from].filter((item) => item.id !== moving.id),
            [to]: target,
        } as Board);
    };

    const handleDragEnd = (event: { active: { id: number | string }; over: { id: number | string } | null }) => {
        const { active, over } = event;
        setActiveId(null);
        const snapshot = dragSnapshot.current;
        dragSnapshot.current = null;

        if (!over || !snapshot) {
            if (snapshot) setBoard(snapshot);
            return;
        }

        const current = boardData.current;
        const column = resolveColumn(current, active.id);
        if (!column) {
            setBoard(snapshot);
            return;
        }

        const id = Number(active.id);
        const oldIndex = current[column].findIndex((item) => item.id === id);
        let newIndex = oldIndex;

        if (resolveColumn(current, over.id) === column) {
            const overIndex = current[column].findIndex((item) => item.id === Number(over.id));
            if (overIndex !== -1) newIndex = overIndex;
        }

        const next: Board =
            oldIndex === newIndex
                ? current
                : ({ ...current, [column]: arrayMove(current[column], oldIndex, newIndex) } as Board);
        setBoard(next);

        const prevColumn = resolveColumn(snapshot, id);
        const prevIndex = prevColumn ? snapshot[prevColumn].findIndex((item) => item.id === id) : -1;
        if (prevColumn === column && prevIndex === newIndex) return;

        void persistReorder(id, column, newIndex, snapshot);
    };

    const handleDragCancel = () => {
        setActiveId(null);
        if (dragSnapshot.current) setBoard(dragSnapshot.current);
        dragSnapshot.current = null;
    };

    /* ═══ CRUD ═══ */
    const handleCreate = useCallback(
        async (title: string, description: string, column: ColumnKey) => {
            try {
                const res = await api.post('/kanban', {
                    title,
                    description: description || null,
                    column,
                });
                const created: KanbanItemT = res.data?.item ?? res.data;
                setBoard((current) => ({
                    ...current,
                    [column]: [...current[column], { ...created, column, is_pinned: !!created.is_pinned }],
                }));
                setFocusedId(created.id);
            } catch {
                pushToast({ kind: 'error', text: 'No se pudo crear la tarjeta.' });
            }
        },
        [pushToast, setBoard]
    );

    /** DELETE diferido: undo real sin endpoint nuevo. */
    const handleDelete = useCallback(
        (item: KanbanItemT) => {
            const current = boardData.current;
            const index = current[item.column].findIndex((entry) => entry.id === item.id);
            if (index === -1) return;

            setBoard({
                ...current,
                [item.column]: current[item.column].filter((entry) => entry.id !== item.id),
            } as Board);
            if (inspectId === item.id) setInspectId(null);

            const toastId = pushToast(
                {
                    kind: 'undo',
                    text: `"${item.title}" eliminada`,
                    actionLabel: 'Deshacer',
                    onAction: () => {
                        const pending = pendingDeletes.current.get(item.id);
                        if (pending) {
                            window.clearTimeout(pending.timer);
                            pendingDeletes.current.delete(item.id);
                        }
                        setBoard((live) => {
                            const list = [...live[item.column]];
                            list.splice(Math.min(index, list.length), 0, item);
                            return { ...live, [item.column]: list } as Board;
                        });
                        dropToast(toastId);
                    },
                },
                UNDO_MS + 400
            );

            const timer = window.setTimeout(() => {
                pendingDeletes.current.delete(item.id);
                api.delete(`/kanban/${item.id}`).catch(() => {
                    setBoard((live) => {
                        const list = [...live[item.column]];
                        list.splice(Math.min(index, list.length), 0, item);
                        return { ...live, [item.column]: list } as Board;
                    });
                    pushToast({ kind: 'error', text: 'El servidor rechazó el borrado. Tarjeta restaurada.' });
                });
            }, UNDO_MS);

            pendingDeletes.current.set(item.id, { timer, item, index });
        },
        [dropToast, inspectId, pushToast, setBoard]
    );

    /* Los borrados pendientes se confirman si el usuario navega. */
    useEffect(
        () => () => {
            pendingDeletes.current.forEach(({ timer, item }) => {
                window.clearTimeout(timer);
                api.delete(`/kanban/${item.id}`).catch(() => {});
            });
            pendingDeletes.current.clear();
        },
        []
    );

    const handlePin = useCallback(
        async (item: KanbanItemT) => {
            const optimistic = !item.is_pinned;
            setBoard((current) => ({
                ...current,
                [item.column]: current[item.column].map((entry) =>
                    entry.id === item.id ? { ...entry, is_pinned: optimistic } : entry
                ),
            }));
            try {
                const res = await api.post(`/kanban/${item.id}/pin`);
                const server: KanbanItemT = res.data?.item ?? res.data;
                setBoard((current) => ({
                    ...current,
                    [item.column]: current[item.column].map((entry) =>
                        entry.id === item.id ? { ...entry, is_pinned: !!server.is_pinned } : entry
                    ),
                }));
            } catch {
                setBoard((current) => ({
                    ...current,
                    [item.column]: current[item.column].map((entry) =>
                        entry.id === item.id ? { ...entry, is_pinned: !optimistic } : entry
                    ),
                }));
                pushToast({ kind: 'error', text: 'No se pudo cambiar el pin.' });
            }
        },
        [pushToast, setBoard]
    );

    const patchItem = useCallback(
        (id: number, patch: Partial<KanbanItemT>) => {
            setBoard((current) => {
                const next = { ...current } as Board;
                COLUMN_ORDER.forEach((key) => {
                    next[key] = current[key].map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
                });
                return next;
            });
        },
        [setBoard]
    );

    /* ═══ Mover con teclado ═══ */
    const moveAcross = useCallback(
        (item: KanbanItemT, delta: number) => {
            const fromIdx = COLUMN_ORDER.indexOf(item.column);
            const toIdx = fromIdx + delta;
            if (toIdx < 0 || toIdx >= COLUMN_ORDER.length) return;

            const target = COLUMN_ORDER[toIdx];
            const snapshot = boardData.current;
            const position = snapshot[target].length;

            setBoard({
                ...snapshot,
                [item.column]: snapshot[item.column].filter((entry) => entry.id !== item.id),
                [target]: [...snapshot[target], { ...item, column: target }],
            } as Board);

            if (collapsed.includes(target)) {
                setCollapsed((prev) => {
                    const next = prev.filter((key) => key !== target);
                    writeJSON(LS_COLLAPSED, next);
                    return next;
                });
            }

            void persistReorder(item.id, target, position, snapshot);
        },
        [collapsed, persistReorder, setBoard]
    );

    const nudgeWithin = useCallback(
        (item: KanbanItemT, delta: number) => {
            const snapshot = boardData.current;
            const list = snapshot[item.column];
            const from = list.findIndex((entry) => entry.id === item.id);
            const to = from + delta;
            if (from === -1 || to < 0 || to >= list.length) return;

            setBoard({ ...snapshot, [item.column]: arrayMove(list, from, to) } as Board);
            void persistReorder(item.id, item.column, to, snapshot);
        },
        [persistReorder, setBoard]
    );

    /* ═══ Inspector ═══ */
    const openInspector = useCallback((item: KanbanItemT) => {
        setInspectId(item.id);
        setDraftTitle(item.title);
        setDraftDesc(item.description ?? '');
    }, []);

    const inspectItem = findItem(board, inspectId);
    const dirty = !!inspectItem && (draftTitle !== inspectItem.title || draftDesc !== (inspectItem.description ?? ''));

    const saveInspector = useCallback(async () => {
        if (!inspectItem || !draftTitle.trim() || !dirty) return;
        setSaving(true);
        const patch = { title: draftTitle.trim(), description: draftDesc.trim() || null };
        patchItem(inspectItem.id, patch);
        try {
            await api.put(`/kanban/${inspectItem.id}`, patch);
            pushToast({ kind: 'info', text: 'Tarjeta actualizada.' }, 2200);
        } catch {
            patchItem(inspectItem.id, { title: inspectItem.title, description: inspectItem.description ?? null });
            pushToast({ kind: 'error', text: 'No se pudo guardar la tarjeta.' });
        } finally {
            setSaving(false);
        }
    }, [dirty, draftDesc, draftTitle, inspectItem, patchItem, pushToast]);

    /* ═══ RAG: ask-rag → chat-rag → rag-context ═══ */
    const ragItem = findItem(board, ragItemId);

    useEffect(() => {
        ragEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [ragMessages, ragLoading]);

    const callChatRag = useCallback(
        async (question: string, history: RagMessage[]) => {
            const transcript = history
                .map((msg) => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
                .join('\n');
            const prompt = [ragBaseContext.current, transcript, `Usuario: ${question}`, 'Asistente:']
                .filter(Boolean)
                .join('\n\n');
            const res = await api.post('/chat-rag', { prompt });
            return String(res.data?.response ?? 'Sin respuesta del motor RAG.');
        },
        []
    );

    const handleAskRag = useCallback(
        async (item: KanbanItemT) => {
            setRagItemId(item.id);
            setRagInput('');
            setRagMessages([]);
            setRagLoading(true);
            const opener = '¿Qué insumos del inventario se relacionan con esta tarea y qué riesgos FEFO debo considerar?';
            try {
                const ctx = await api.post('/kanban/ask-rag', { item_id: item.id });
                ragBaseContext.current = String(ctx.data?.rag_prompt ?? `Tarea: ${item.title}`);
                setRagMessages([{ role: 'user', content: opener }]);
                const answer = await callChatRag(opener, []);
                setRagMessages([{ role: 'user', content: opener }, { role: 'ai', content: answer }]);
            } catch {
                setRagMessages([
                    { role: 'user', content: opener },
                    { role: 'ai', content: 'No se pudo contactar el motor LLM. Reintenta en unos segundos.' },
                ]);
            } finally {
                setRagLoading(false);
            }
        },
        [callChatRag]
    );

    const handleRagFollowUp = useCallback(async () => {
        const question = ragInput.trim();
        if (!question || ragLoading) return;
        const history = ragMessages;
        setRagMessages([...history, { role: 'user', content: question }]);
        setRagInput('');
        setRagLoading(true);
        try {
            const answer = await callChatRag(question, history);
            setRagMessages((prev) => [...prev, { role: 'ai', content: answer }]);
        } catch {
            setRagMessages((prev) => [...prev, { role: 'ai', content: 'Fallo en la comunicación con el motor LLM.' }]);
        } finally {
            setRagLoading(false);
        }
    }, [callChatRag, ragInput, ragLoading, ragMessages]);

    const saveRagContext = useCallback(async () => {
        const lastAi = [...ragMessages].reverse().find((msg) => msg.role === 'ai');
        if (!ragItem || !lastAi) return;
        try {
            await api.post(`/kanban/${ragItem.id}/rag-context`, { rag_context: lastAi.content });
            patchItem(ragItem.id, { rag_context: lastAi.content });
            pushToast({ kind: 'info', text: 'Contexto IA guardado en la tarjeta.' }, 2600);
        } catch {
            pushToast({ kind: 'error', text: 'No se pudo guardar el contexto IA.' });
        }
    }, [patchItem, pushToast, ragItem, ragMessages]);

    /* ═══ Preferencias ═══ */
    const toggleCollapse = useCallback((key: ColumnKey) => {
        setCollapsed((prev) => {
            const next = prev.includes(key) ? prev.filter((entry) => entry !== key) : [...prev, key];
            writeJSON(LS_COLLAPSED, next);
            return next;
        });
    }, []);

    const setColumnWip = useCallback((key: ColumnKey, value: number) => {
        setWip((prev) => {
            const next = { ...prev, [key]: value };
            writeJSON(LS_WIP, next);
            return next;
        });
    }, []);

    const toggleDensity = useCallback(() => {
        setCompact((prev) => {
            writeJSON(LS_DENSITY, prev ? 'cozy' : 'compact');
            return !prev;
        });
    }, []);

    /* ═══ Roving focus ═══ */
    useEffect(() => {
        if (focusedId === null || activeId !== null) return;
        const node = document.getElementById(`pm-kb-card-${focusedId}`);
        if (node && document.activeElement !== node) node.focus({ preventScroll: false });
    }, [focusedId, activeId, visible]);

    const moveFocus = useCallback(
        (axis: 'v' | 'h', delta: number) => {
            const openColumns = COLUMN_ORDER.filter((key) => !collapsed.includes(key));
            const current = findItem(visible, focusedId);

            if (!current) {
                for (const key of openColumns) {
                    if (visible[key].length) {
                        setFocusedId(visible[key][0].id);
                        return;
                    }
                }
                return;
            }

            if (axis === 'v') {
                const list = visible[current.column];
                const index = list.findIndex((entry) => entry.id === current.id);
                const target = list[index + delta];
                if (target) setFocusedId(target.id);
                return;
            }

            const colIdx = openColumns.indexOf(current.column);
            for (let step = colIdx + delta; step >= 0 && step < openColumns.length; step += delta) {
                const list = visible[openColumns[step]];
                if (list.length) {
                    const index = visible[current.column].findIndex((entry) => entry.id === current.id);
                    setFocusedId(list[Math.min(index, list.length - 1)].id);
                    return;
                }
            }
        },
        [collapsed, focusedId, visible]
    );

    /* ═══ Atajos globales ═══ */
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const typing =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target?.isContentEditable;

            if (event.key === 'Escape') {
                if (helpOpen) setHelpOpen(false);
                else if (ragItemId !== null) setRagItemId(null);
                else if (inspectId !== null) setInspectId(null);
                else if (typing) (target as HTMLElement)?.blur();
                else if (query) setQuery('');
                return;
            }

            if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
            if (target?.closest('[data-kb-grip]')) return; // el KeyboardSensor manda
            if (ragItemId !== null || inspectId !== null || helpOpen) return;

            const focused = findItem(board, focusedId);

            switch (event.key) {
                case '/':
                    event.preventDefault();
                    searchRef.current?.focus();
                    return;
                case '?':
                    event.preventDefault();
                    setHelpOpen(true);
                    return;
                case 'j':
                case 'ArrowDown':
                    event.preventDefault();
                    if (event.shiftKey && focused) nudgeWithin(focused, 1);
                    else moveFocus('v', 1);
                    return;
                case 'k':
                case 'ArrowUp':
                    event.preventDefault();
                    if (event.shiftKey && focused) nudgeWithin(focused, -1);
                    else moveFocus('v', -1);
                    return;
                case 'h':
                case 'ArrowLeft':
                    event.preventDefault();
                    moveFocus('h', -1);
                    return;
                case 'l':
                case 'ArrowRight':
                    event.preventDefault();
                    moveFocus('h', 1);
                    return;
                case '[':
                    if (focused) {
                        event.preventDefault();
                        moveAcross(focused, -1);
                    }
                    return;
                case ']':
                    if (focused) {
                        event.preventDefault();
                        moveAcross(focused, 1);
                    }
                    return;
                default:
                    break;
            }

            const key = event.key.toLowerCase();

            if (key === 'n') {
                event.preventDefault();
                const column = focused?.column ?? COLUMN_ORDER.find((entry) => !collapsed.includes(entry)) ?? 'todo';
                const input = document.querySelector<HTMLTextAreaElement>(`[data-kb-input="${column}"]`);
                if (input) input.focus();
                else document.querySelector<HTMLButtonElement>(`[data-kb-add="${column}"]`)?.click();
                return;
            }
            if (!focused) return;
            if (key === 'e') {
                event.preventDefault();
                openInspector(focused);
            } else if (key === 'p') {
                event.preventDefault();
                void handlePin(focused);
            } else if (key === 'a') {
                event.preventDefault();
                void handleAskRag(focused);
            } else if (key === 'c') {
                event.preventDefault();
                toggleCollapse(focused.column);
            } else if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault();
                handleDelete(focused);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        board,
        collapsed,
        focusedId,
        handleAskRag,
        handleDelete,
        handlePin,
        helpOpen,
        inspectId,
        moveAcross,
        moveFocus,
        nudgeWithin,
        openInspector,
        query,
        ragItemId,
        toggleCollapse,
    ]);

    /* ═══ Anuncios de lector de pantalla ═══ */
    const announcements = useMemo(
        () => ({
            onDragStart({ active }: { active: { id: number | string } }) {
                const item = findItem(boardData.current, Number(active.id));
                return item ? `Tomaste la tarjeta ${item.title}.` : undefined;
            },
            onDragOver({ over }: { over: { id: number | string } | null }) {
                if (!over) return 'Fuera de una columna válida.';
                const column = resolveColumn(boardData.current, over.id);
                return column ? `Sobre la columna ${COLUMN_META[column].label}.` : undefined;
            },
            onDragEnd({ active }: { active: { id: number | string } }) {
                const column = resolveColumn(boardData.current, active.id);
                const item = findItem(boardData.current, Number(active.id));
                return item && column
                    ? `${item.title} quedó en ${COLUMN_META[column].label}.`
                    : 'Movimiento finalizado.';
            },
            onDragCancel() {
                return 'Movimiento cancelado. La tarjeta volvió a su lugar.';
            },
        }),
        []
    );

    const dragged = findItem(board, activeId);

    const SHORTCUTS: [string, string][] = [
        ['j / k', 'Bajar / subir el foco'],
        ['h / l', 'Columna anterior / siguiente'],
        ['Shift + ↑ / ↓', 'Reordenar dentro de la columna'],
        ['[ / ]', 'Mover la tarjeta de columna'],
        ['n', 'Nueva tarjeta en la columna enfocada'],
        ['e', 'Abrir el inspector'],
        ['p', 'Fijar / desfijar'],
        ['a', 'Consultar el motor RAG'],
        ['c', 'Colapsar la columna enfocada'],
        ['Supr', 'Eliminar (6 s para deshacer)'],
        ['/', 'Buscar'],
        ['?', 'Esta ayuda'],
        ['Esc', 'Cerrar / limpiar'],
    ];

    return (
        <div className={`pm-chrome pm-kb ${compact ? 'pm-kb--compact' : ''} flex h-screen overflow-hidden`}>
            <Head title="Kanban | Pymetory Premium" />

            <Sidebar
                sidebarOpen={sidebarOpen}
                mobileOpen={mobileOpen}
                user={user}
                activeView="/kanban"
                mode="kanban"
                onMobileClose={() => setMobileOpen(false)}
            />

            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* ── TOPBAR ── */}
                <header className="pm-kb-topbar">
                    <div className="flex items-center gap-4 min-w-0">
                        <button
                            type="button"
                            onClick={() => {
                                if (window.innerWidth >= 1024) setSidebarOpen((prev) => !prev);
                                else setMobileOpen((prev) => !prev);
                            }}
                            aria-label={sidebarOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
                            className="pm-kb-iconbtn pm-kb-iconbtn--lg hidden lg:inline-flex"
                        >
                            <Menu size={18} aria-hidden="true" />
                        </button>

                        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 min-w-0">
                            <span className="pm-kb-crumb">Pymetory /</span>
                            <h1 className="pm-kb-title">Kanban</h1>
                        </nav>

                        <div className="hidden xl:flex items-center gap-3 pl-4">
                            <div
                                className="pm-kb-progress"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={totals.pct}
                                aria-label="Progreso del tablero"
                            >
                                <span style={{ width: `${totals.pct}%` }} />
                            </div>
                            <span className="pm-kb-progress__label">
                                {totals.done}/{totals.all} · {totals.pct}%
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="pm-kb-search">
                            <Search size={13} aria-hidden="true" />
                            <input
                                ref={searchRef}
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Filtrar tarjetas…"
                                aria-label="Filtrar tarjetas por título, descripción o contexto IA"
                                className="pm-kb-search__input"
                            />
                            {query ? (
                                <button type="button" onClick={() => setQuery('')} aria-label="Limpiar filtro" className="pm-kb-iconbtn">
                                    <X size={12} aria-hidden="true" />
                                </button>
                            ) : null}
                        </div>

                        <button
                            type="button"
                            onClick={() => setPinnedOnly((prev) => !prev)}
                            aria-pressed={pinnedOnly}
                            title="Mostrar solo tarjetas fijadas"
                            className={`pm-kb-iconbtn pm-kb-iconbtn--lg ${pinnedOnly ? 'pm-kb-iconbtn--on' : ''}`}
                        >
                            <Pin size={15} aria-hidden="true" />
                            <span className="sr-only">Solo tarjetas fijadas</span>
                        </button>

                        <button
                            type="button"
                            onClick={toggleDensity}
                            aria-pressed={compact}
                            title="Alternar densidad"
                            className={`pm-kb-iconbtn pm-kb-iconbtn--lg ${compact ? 'pm-kb-iconbtn--on' : ''}`}
                        >
                            <Rows3 size={15} aria-hidden="true" />
                            <span className="sr-only">Densidad compacta</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setHelpOpen(true)}
                            title="Atajos de teclado (?)"
                            className="pm-kb-iconbtn pm-kb-iconbtn--lg"
                        >
                            <Keyboard size={15} aria-hidden="true" />
                            <span className="sr-only">Atajos de teclado</span>
                        </button>
                    </div>
                </header>

                {filtering ? (
                    <p className="pm-kb-filterbar" role="status">
                        {totals.shown} de {totals.all} tarjetas coinciden con el filtro activo.
                    </p>
                ) : null}

                {/* ── TABLERO ── */}
                <div className="flex-1 overflow-hidden">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        accessibility={{
                            announcements,
                            screenReaderInstructions: {
                                draggable:
                                    'Presiona espacio para tomar la tarjeta. Usa las flechas para moverla entre columnas y posiciones. Espacio para soltar, Escape para cancelar.',
                            },
                        }}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                        <div ref={boardElRef} className="pm-kb-board pm-kb-scroll">
                            {COLUMN_ORDER.map((colKey) => (
                                <BoardColumn
                                    key={colKey}
                                    colKey={colKey}
                                    items={visible[colKey]}
                                    totalCount={board[colKey].length}
                                    wip={wip[colKey] ?? 0}
                                    collapsed={collapsed.includes(colKey)}
                                    compact={compact}
                                    filtering={filtering}
                                    focusedId={focusedId}
                                    onToggleCollapse={toggleCollapse}
                                    onSetWip={setColumnWip}
                                    onCreate={handleCreate}
                                    onFocusCard={setFocusedId}
                                    onOpenCard={openInspector}
                                    onPinCard={handlePin}
                                    onAskRag={handleAskRag}
                                />
                            ))}
                        </div>

                        <DragOverlay dropAnimation={null} adjustScale={false}>
                            {dragged ? (
                                <div className="pm-card pm-kb-card pm-kb-card--overlay">
                                    <h4 className="pm-kb-card__title">{dragged.title}</h4>
                                    {dragged.description ? <p className="pm-kb-card__desc">{dragged.description}</p> : null}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </main>
            <MobileNav activeView="KANBAN" user={user} />

            {/* ── INSPECTOR ── */}
            {inspectItem ? (
                <aside className="pm-panel pm-kb-drawer" role="dialog" aria-modal="false" aria-label={`Inspector de ${inspectItem.title}`}>
                    <header className="pm-kb-drawer__head">
                        <div className="min-w-0">
                            <p className="pm-kb-drawer__eyebrow">{COLUMN_META[inspectItem.column].label}</p>
                            <h2 className="pm-kb-drawer__title">Inspector de tarjeta</h2>
                        </div>
                        <button type="button" onClick={() => setInspectId(null)} aria-label="Cerrar inspector" className="pm-kb-iconbtn pm-kb-iconbtn--lg">
                            <X size={16} aria-hidden="true" />
                        </button>
                    </header>

                    <div className="pm-kb-drawer__body pm-kb-scroll">
                        <label className="pm-kb-label" htmlFor="pm-kb-title">
                            Título
                        </label>
                        <textarea
                            id="pm-kb-title"
                            rows={2}
                            value={draftTitle}
                            onChange={(e) => setDraftTitle(e.target.value)}
                            className="pm-kb-field pm-kb-field--title"
                        />

                        <label className="pm-kb-label" htmlFor="pm-kb-desc">
                            Descripción
                        </label>
                        <textarea
                            id="pm-kb-desc"
                            rows={6}
                            value={draftDesc}
                            onChange={(e) => setDraftDesc(e.target.value)}
                            placeholder="Detalle, criterios de aceptación, insumos involucrados…"
                            className="pm-kb-field"
                        />

                        <div className="pm-kb-drawer__row">
                            <button
                                type="button"
                                onClick={saveInspector}
                                disabled={!dirty || saving || !draftTitle.trim()}
                                className="pm-kb-btn pm-kb-btn--primary flex-1"
                            >
                                <Save size={13} aria-hidden="true" /> {saving ? 'Guardando…' : 'Guardar'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const target = inspectItem;
                                    setInspectId(null);
                                    void handleAskRag(target);
                                }}
                                className="pm-kb-btn pm-kb-btn--ghost"
                            >
                                <Bot size={13} aria-hidden="true" /> RAG
                            </button>
                        </div>

                        <dl className="pm-kb-facts">
                            <div>
                                <dt>Posición</dt>
                                <dd>
                                    {board[inspectItem.column].findIndex((entry) => entry.id === inspectItem.id) + 1} de{' '}
                                    {board[inspectItem.column].length}
                                </dd>
                            </div>
                            <div>
                                <dt>Sin movimiento</dt>
                                <dd>{ageDays(inspectItem)} días</dd>
                            </div>
                            <div>
                                <dt>Autor</dt>
                                <dd>{inspectItem.user?.name ?? user.name}</dd>
                            </div>
                            <div>
                                <dt>Estado</dt>
                                <dd>{inspectItem.is_pinned ? 'Fijada' : 'Normal'}</dd>
                            </div>
                        </dl>

                        {inspectItem.rag_context ? (
                            <section className="pm-kb-ragbox">
                                <h3 className="pm-kb-label">
                                    <Sparkles size={11} aria-hidden="true" /> Contexto IA guardado
                                </h3>
                                <p>{inspectItem.rag_context}</p>
                            </section>
                        ) : null}

                        <div className="pm-kb-drawer__row">
                            <button
                                type="button"
                                onClick={() => moveAcross(inspectItem, -1)}
                                disabled={inspectItem.column === COLUMN_ORDER[0]}
                                className="pm-kb-btn pm-kb-btn--ghost flex-1"
                            >
                                <ChevronLeft size={13} aria-hidden="true" /> Atrás
                            </button>
                            <button
                                type="button"
                                onClick={() => moveAcross(inspectItem, 1)}
                                disabled={inspectItem.column === COLUMN_ORDER[COLUMN_ORDER.length - 1]}
                                className="pm-kb-btn pm-kb-btn--ghost flex-1"
                            >
                                Avanzar <ChevronRight size={13} aria-hidden="true" />
                            </button>
                        </div>

                        <button type="button" onClick={() => handleDelete(inspectItem)} className="pm-kb-btn pm-kb-btn--danger w-full">
                            <Trash2 size={13} aria-hidden="true" /> Eliminar tarjeta
                        </button>
                    </div>
                </aside>
            ) : null}

            {/* ── MODAL RAG ── */}
            {ragItem ? (
                <div className="pm-kb-overlay" role="presentation" onClick={() => setRagItemId(null)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Motor RAG sobre ${ragItem.title}`}
                        onClick={(e) => e.stopPropagation()}
                        className="pm-panel pm-kb-modal"
                    >
                        <header className="pm-kb-modal__head">
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="pm-kb-modal__badge">
                                    <Bot size={16} aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="pm-kb-modal__title">{ragItem.title}</h2>
                                    <p className="pm-kb-modal__sub">
                                        Motor RAG · {COLUMN_META[ragItem.column].label}
                                    </p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setRagItemId(null)} aria-label="Cerrar el chat RAG" className="pm-kb-iconbtn pm-kb-iconbtn--lg">
                                <X size={16} aria-hidden="true" />
                            </button>
                        </header>

                        <div className="pm-kb-modal__body pm-kb-scroll" aria-live="polite" aria-busy={ragLoading}>
                            {ragMessages.map((msg, index) => (
                                <article key={index} className={`pm-kb-msg ${msg.role === 'user' ? 'pm-kb-msg--user' : 'pm-kb-msg--ai'}`}>
                                    <p className="pm-kb-msg__who">{msg.role === 'user' ? 'Tú' : 'Pymetory IA'}</p>
                                    <p className="pm-kb-msg__body">{msg.content}</p>
                                </article>
                            ))}
                            {ragLoading ? (
                                <p className="pm-kb-msg pm-kb-msg--ai pm-kb-msg--loading">Consultando el inventario…</p>
                            ) : null}
                            <div ref={ragEndRef} />
                        </div>

                        <footer className="pm-kb-modal__foot">
                            <button
                                type="button"
                                onClick={saveRagContext}
                                disabled={ragLoading || !ragMessages.some((msg) => msg.role === 'ai')}
                                className="pm-kb-btn pm-kb-btn--ghost"
                            >
                                <Sparkles size={13} aria-hidden="true" /> Guardar como contexto
                            </button>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    void handleRagFollowUp();
                                }}
                                className="pm-kb-modal__form"
                            >
                                <input
                                    type="text"
                                    value={ragInput}
                                    onChange={(e) => setRagInput(e.target.value)}
                                    disabled={ragLoading}
                                    placeholder="Pregunta de seguimiento…"
                                    aria-label="Pregunta de seguimiento al motor RAG"
                                    className="pm-kb-field pm-kb-field--inline"
                                />
                                <button
                                    type="submit"
                                    disabled={ragLoading || !ragInput.trim()}
                                    aria-label="Enviar consulta"
                                    className="pm-kb-btn pm-kb-btn--primary"
                                >
                                    <Send size={14} aria-hidden="true" />
                                </button>
                            </form>
                        </footer>
                    </div>
                </div>
            ) : null}

            {/* ── AYUDA ── */}
            {helpOpen ? (
                <div className="pm-kb-overlay" role="presentation" onClick={() => setHelpOpen(false)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Atajos de teclado"
                        onClick={(e) => e.stopPropagation()}
                        className="pm-panel pm-kb-help"
                    >
                        <header className="pm-kb-modal__head">
                            <h2 className="pm-kb-modal__title">Atajos de teclado</h2>
                            <button type="button" onClick={() => setHelpOpen(false)} aria-label="Cerrar la ayuda" className="pm-kb-iconbtn pm-kb-iconbtn--lg">
                                <X size={16} aria-hidden="true" />
                            </button>
                        </header>
                        <ul className="pm-kb-help__list">
                            {SHORTCUTS.map(([keys, description]) => (
                                <li key={keys}>
                                    <kbd className="pm-kb-kbd">{keys}</kbd>
                                    <span>{description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ) : null}

            {/* ── TOASTS ── */}
            <div className="pm-kb-toasts" role="region" aria-live="polite" aria-label="Notificaciones del tablero">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`pm-panel pm-kb-toast pm-kb-toast--${toast.kind}`}>
                        {toast.kind === 'error' ? <AlertTriangle size={13} aria-hidden="true" /> : null}
                        {toast.kind === 'undo' ? <Trash2 size={13} aria-hidden="true" /> : null}
                        <span className="flex-1">{toast.text}</span>
                        {toast.onAction ? (
                            <button type="button" onClick={toast.onAction} className="pm-kb-toast__action">
                                <Undo2 size={12} aria-hidden="true" /> {toast.actionLabel}
                            </button>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
}
