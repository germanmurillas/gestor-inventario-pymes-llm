import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';
import {
    Bot,
    Check,
    GripVertical,
    Loader2,
    Menu,
    MoreHorizontal,
    Pin,
    PinOff,
    Save,
    Search,
    Send,
    Trash2,
    X,
} from 'lucide-react';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MeasuringStrategy,
    PointerSensor,
    TouchSensor,
    closestCenter,
    pointerWithin,
    rectIntersection,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type {
    Announcements,
    CollisionDetection,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    UniqueIdentifier,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Sidebar from '../Components/Sidebar';

/* ------------------------------------------------------------------ *
 * Contrato de datos (espejo exacto de KanbanController)
 * ------------------------------------------------------------------ */

type ColumnKey = 'todo' | 'in_progress' | 'review' | 'done';

interface KanbanCard {
    id: number;
    title: string;
    description: string | null;
    column: ColumnKey;
    position: number;
    is_pinned: boolean;
    rag_context?: string | null;
}

type Board = Record<ColumnKey, KanbanCard[]>;

interface PageProps {
    auth?: { user?: { name: string; role?: string } };
    columns?: Partial<Record<ColumnKey, KanbanCard[]>>;
}

const COLUMN_ORDER: ColumnKey[] = ['todo', 'in_progress', 'review', 'done'];

/**
 * Único lugar donde vive la identidad visual de una columna.
 * `tone` es una cadena de fallback de tokens del tema: nada hardcodeado,
 * y si el token no existe todavía cae en el acento genérico.
 */
const COLUMN_META: Record<ColumnKey, { label: string; hint: string; tone: string }> = {
    todo: {
        label: 'Por hacer',
        hint: 'Backlog priorizado',
        tone: 'var(--pm-tone-neutral, var(--pm-muted, currentColor))',
    },
    in_progress: {
        label: 'En progreso',
        hint: 'Trabajo activo',
        tone: 'var(--pm-tone-info, var(--pm-accent, currentColor))',
    },
    review: {
        label: 'En revisión',
        hint: 'Esperando validación',
        tone: 'var(--pm-tone-warning, var(--pm-accent-2, var(--pm-accent, currentColor)))',
    },
    done: {
        label: 'Completado',
        hint: 'Cerrado y auditado',
        tone: 'var(--pm-tone-success, var(--pm-accent-2, var(--pm-accent, currentColor)))',
    },
};

/* ------------------------------------------------------------------ *
 * Identidad de nodos dnd-kit
 * ------------------------------------------------------------------ */

const cardNodeId = (id: number): UniqueIdentifier => `card:${id}`;
const columnNodeId = (key: ColumnKey): UniqueIdentifier => `col:${key}`;

const parseCardId = (raw: UniqueIdentifier): number | null => {
    const s = String(raw);
    return s.startsWith('card:') ? Number(s.slice(5)) : null;
};

const parseColumnId = (raw: UniqueIdentifier): ColumnKey | null => {
    const s = String(raw);
    if (!s.startsWith('col:')) return null;
    const key = s.slice(4) as ColumnKey;
    return COLUMN_ORDER.includes(key) ? key : null;
};

/* ------------------------------------------------------------------ *
 * Tokens derivados: todo tinte cuelga de --pm-col
 * ------------------------------------------------------------------ */

const tint = (pct: number) => `color-mix(in oklab, var(--pm-col) ${pct}%, transparent)`;
const hairline = 'color-mix(in oklab, currentColor 12%, transparent)';

const withTone = (tone: string, extra?: React.CSSProperties): React.CSSProperties =>
    ({ '--pm-col': tone, ...extra }) as React.CSSProperties;

/* ------------------------------------------------------------------ *
 * pm-upload: pool común de escrituras
 *  - cola secuencial: mata las races entre drags rápidos
 *  - CSRF en un solo sitio
 *  - contador en vuelo: evita que Inertia clobbee el estado optimista
 * ------------------------------------------------------------------ */

type PmMethod = 'POST' | 'PUT' | 'DELETE';

function csrfToken(): string {
    return document.head.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

function createUploadPool() {
    let chain: Promise<unknown> = Promise.resolve();
    let inFlight = 0;
    let seq = 0;

    async function request<T>(method: PmMethod, url: string, body?: unknown): Promise<T> {
        const res = await fetch(url, {
            method,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': csrfToken(),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`${method} ${url} → ${res.status}`);
        return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
    }

    return {
        /** Encola la escritura y devuelve su token de secuencia para descartar respuestas viejas. */
        push<T>(method: PmMethod, url: string, body?: unknown): { ticket: number; result: Promise<T> } {
            const ticket = ++seq;
            inFlight += 1;
            const result = chain.then(
                () => request<T>(method, url, body),
                () => request<T>(method, url, body),
            );
            chain = result.catch(() => undefined).finally(() => {
                inFlight -= 1;
            });
            return { ticket, result };
        },
        isLatest(ticket: number) {
            return ticket === seq;
        },
        get busy() {
            return inFlight > 0;
        },
    };
}

const pmUpload = createUploadPool();

/* ------------------------------------------------------------------ *
 * Normalización
 * ------------------------------------------------------------------ */

function emptyBoard(): Board {
    return { todo: [], in_progress: [], review: [], done: [] };
}

function normalize(raw?: Partial<Record<ColumnKey, KanbanCard[]>>): Board {
    const board = emptyBoard();
    for (const key of COLUMN_ORDER) {
        const items = [...(raw?.[key] ?? [])];
        items.sort((a, b) => a.position - b.position);
        board[key] = items.map((item, index) => ({
            ...item,
            column: key,
            position: index,
            is_pinned: Boolean(item.is_pinned),
        }));
    }
    return board;
}

/** Firma estable del payload: permite detectar cambios reales del servidor. */
function signature(board: Board): string {
    return COLUMN_ORDER.map(k => `${k}:${board[k].map(i => `${i.id}.${i.position}.${i.is_pinned ? 1 : 0}`).join(',')}`).join('|');
}

function reindex(board: Board): Board {
    const next = emptyBoard();
    for (const key of COLUMN_ORDER) {
        next[key] = board[key].map((item, index) => ({ ...item, column: key, position: index }));
    }
    return next;
}

function locate(board: Board, cardId: number): { column: ColumnKey; index: number } | null {
    for (const key of COLUMN_ORDER) {
        const index = board[key].findIndex(i => i.id === cardId);
        if (index !== -1) return { column: key, index };
    }
    return null;
}

/* ------------------------------------------------------------------ *
 * Detección de colisiones en dos fases (multi-contenedor)
 * ------------------------------------------------------------------ */

const boardCollision: CollisionDetection = args => {
    const pointer = pointerWithin(args);
    const candidates = pointer.length > 0 ? pointer : rectIntersection(args);
    if (candidates.length === 0) return closestCenter(args);

    // Si el puntero cae sobre una tarjeta y sobre su columna, gana la tarjeta:
    // eso permite insertar en un hueco exacto en lugar de "al final".
    const card = candidates.find(c => String(c.id).startsWith('card:'));
    return card ? [card] : candidates;
};

/* ------------------------------------------------------------------ *
 * Tarjeta
 * ------------------------------------------------------------------ */

interface CardProps {
    card: KanbanCard;
    tone: string;
    dragDisabled: boolean;
    onPin: (id: number) => void;
    onSave: (id: number, patch: { title?: string; description?: string | null }) => void;
    onDelete: (id: number) => void;
    onAskRag: (card: KanbanCard) => void;
    onFocusCard: (id: number) => void;
}

function SortableCard({
    card,
    tone,
    dragDisabled,
    onPin,
    onSave,
    onDelete,
    onAskRag,
    onFocusCard,
}: CardProps) {
    const [editing, setEditing] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [draftTitle, setDraftTitle] = useState(card.title);
    const [draftDesc, setDraftDesc] = useState(card.description ?? '');

    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: cardNodeId(card.id),
        disabled: dragDisabled,
        data: { type: 'card', columnKey: card.column, cardId: card.id },
    });

    useEffect(() => {
        if (!editing) {
            setDraftTitle(card.title);
            setDraftDesc(card.description ?? '');
        }
    }, [card.title, card.description, editing]);

    const commit = () => {
        const title = draftTitle.trim();
        const description = draftDesc.trim();
        const patch: { title?: string; description?: string | null } = {};
        if (title && title !== card.title) patch.title = title;
        if (description !== (card.description ?? '')) patch.description = description || null;
        if (Object.keys(patch).length > 0) onSave(card.id, patch);
        setEditing(false);
    };

    const cancel = () => {
        setDraftTitle(card.title);
        setDraftDesc(card.description ?? '');
        setEditing(false);
    };

    return (
        <li
            ref={setNodeRef}
            role="listitem"
            tabIndex={0}
            onFocus={() => onFocusCard(card.id)}
            aria-label={`${card.title}. Columna ${COLUMN_META[card.column].label}. Posición ${card.position + 1}.${
                card.is_pinned ? ' Fijada.' : ''
            } Alt más flechas para mover.`}
            style={withTone(tone, {
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.45 : 1,
                borderColor: card.is_pinned ? tint(45) : hairline,
                boxShadow: `inset 3px 0 0 0 ${tint(70)}`,
            })}
            className="pm-chrome pm-on-card group relative rounded-2xl border p-3.5 outline-none
                       transition-[box-shadow,border-color] duration-200
                       focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--pm-col)_65%,transparent)]"
        >
            <div className="flex items-start gap-2">
                <button
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    disabled={dragDisabled}
                    aria-label={`Arrastrar ${card.title}`}
                    title={dragDisabled ? 'Limpia el filtro para reordenar' : 'Arrastrar'}
                    className="pm-on-card mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-1 opacity-70
                               transition-opacity hover:opacity-100 active:cursor-grabbing
                               disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <GripVertical size={14} aria-hidden="true" />
                </button>

                <div className="min-w-0 flex-1">
                    {editing ? (
                        <div className="space-y-2">
                            <input
                                autoFocus
                                value={draftTitle}
                                onChange={e => setDraftTitle(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') commit();
                                    if (e.key === 'Escape') cancel();
                                }}
                                aria-label="Título de la tarjeta"
                                style={{ borderColor: tint(40), background: tint(8) }}
                                className="pm-on-card w-full rounded-lg border px-2 py-1 text-sm font-semibold outline-none"
                            />
                            <textarea
                                rows={3}
                                value={draftDesc}
                                onChange={e => setDraftDesc(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Escape') cancel();
                                }}
                                placeholder="Descripción…"
                                aria-label="Descripción de la tarjeta"
                                style={{ borderColor: hairline, background: tint(6) }}
                                className="pm-on-card w-full resize-none rounded-lg border px-2 py-1.5 text-xs leading-relaxed outline-none placeholder:opacity-50"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={commit}
                                    style={{ background: tint(18), borderColor: tint(45) }}
                                    className="pm-on-card flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold"
                                >
                                    <Save size={12} aria-hidden="true" /> Guardar
                                </button>
                                <button
                                    onClick={cancel}
                                    style={{ borderColor: hairline }}
                                    className="pm-on-card rounded-lg border px-2.5 py-1 text-[11px] font-bold opacity-70 hover:opacity-100"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => setEditing(true)}
                                className="pm-on-card block w-full text-left text-sm font-semibold leading-snug hover:underline"
                            >
                                {card.title}
                            </button>
                            {card.description && (
                                <p className="pm-on-card mt-1.5 line-clamp-3 text-[11.5px] leading-relaxed opacity-70">
                                    {card.description}
                                </p>
                            )}
                        </>
                    )}
                </div>

                {!editing && (
                    <div className="flex shrink-0 items-center gap-0.5">
                        <button
                            onClick={() => onPin(card.id)}
                            aria-pressed={card.is_pinned}
                            aria-label={card.is_pinned ? `Desfijar ${card.title}` : `Fijar ${card.title}`}
                            style={card.is_pinned ? { background: tint(16) } : undefined}
                            className={`pm-on-card rounded-lg p-1.5 transition-opacity ${
                                card.is_pinned ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                            }`}
                        >
                            {card.is_pinned ? <Pin size={13} aria-hidden="true" /> : <PinOff size={13} aria-hidden="true" />}
                        </button>
                        <button
                            onClick={() => onAskRag(card)}
                            aria-label={`Consultar el motor RAG sobre ${card.title}`}
                            className="pm-on-card rounded-lg p-1.5 opacity-60 transition-opacity hover:opacity-100"
                        >
                            <Bot size={13} aria-hidden="true" />
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setMenuOpen(o => !o);
                                    setConfirming(false);
                                }}
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                aria-label={`Acciones de ${card.title}`}
                                className="pm-on-card rounded-lg p-1.5 opacity-60 transition-opacity hover:opacity-100"
                            >
                                <MoreHorizontal size={14} aria-hidden="true" />
                            </button>
                            {menuOpen && (
                                <div
                                    role="menu"
                                    onMouseLeave={() => {
                                        setMenuOpen(false);
                                        setConfirming(false);
                                    }}
                                    style={{ borderColor: hairline }}
                                    className="pm-chrome pm-on-card absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border p-1 shadow-xl"
                                >
                                    {confirming ? (
                                        <div className="space-y-1 p-1">
                                            <p className="pm-on-card text-[10.5px] font-bold uppercase tracking-wide opacity-70">
                                                ¿Eliminar definitivamente?
                                            </p>
                                            <div className="flex gap-1">
                                                <button
                                                    role="menuitem"
                                                    onClick={() => onDelete(card.id)}
                                                    style={{ background: tint(20), borderColor: tint(50) }}
                                                    className="pm-on-card flex-1 rounded-lg border px-2 py-1 text-[11px] font-bold"
                                                >
                                                    Sí, eliminar
                                                </button>
                                                <button
                                                    role="menuitem"
                                                    onClick={() => setConfirming(false)}
                                                    className="pm-on-card rounded-lg px-2 py-1 text-[11px] font-bold opacity-70"
                                                >
                                                    No
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            role="menuitem"
                                            onClick={() => setConfirming(true)}
                                            className="pm-on-card flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11.5px] font-bold hover:opacity-80"
                                        >
                                            <Trash2 size={12} aria-hidden="true" /> Eliminar tarjeta
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {card.is_pinned && (
                <div
                    style={{ borderColor: hairline }}
                    className="mt-3 flex items-center gap-1.5 border-t pt-2"
                >
                    <span className="h-1 w-1 rounded-full" style={{ background: tint(90) }} aria-hidden="true" />
                    <span className="pm-on-card text-[9px] font-black uppercase tracking-[0.18em] opacity-70">Fijada</span>
                </div>
            )}
        </li>
    );
}

/* ------------------------------------------------------------------ *
 * Alta de tarjeta
 * ------------------------------------------------------------------ */

function AddCardForm({ columnKey, tone, onAdd }: { columnKey: ColumnKey; tone: string; onAdd: (t: string, c: ColumnKey) => void }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    const submit = () => {
        const clean = title.trim();
        if (!clean) return;
        onAdd(clean, columnKey);
        setTitle('');
        setOpen(false);
    };

    if (!open) {
        return (
            <button
                data-add={columnKey}
                onClick={() => setOpen(true)}
                style={withTone(tone, { borderColor: hairline })}
                className="pm-on-card mt-2 flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed
                           p-2.5 text-[11px] font-bold uppercase tracking-wider opacity-65 transition-opacity hover:opacity-100"
            >
                <Plus size={14} aria-hidden="true" /> Agregar tarjeta
            </button>
        );
    }

    return (
        <div style={withTone(tone, { borderColor: hairline })} className="pm-chrome mt-2 shrink-0 space-y-2 rounded-xl border p-2.5">
            <input
                ref={inputRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') submit();
                    if (e.key === 'Escape') {
                        setOpen(false);
                        setTitle('');
                    }
                }}
                placeholder="Nueva tarea…"
                aria-label={`Nueva tarea en ${COLUMN_META[columnKey].label}`}
                style={{ borderColor: tint(35), background: tint(8) }}
                className="pm-on-card w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none placeholder:opacity-50"
            />
            <div className="flex gap-2">
                <button
                    onClick={submit}
                    disabled={!title.trim()}
                    style={{ background: tint(18), borderColor: tint(45) }}
                    className="pm-on-card flex-1 rounded-lg border px-3 py-1.5 text-[11px] font-bold disabled:opacity-40"
                >
                    Guardar
                </button>
                <button
                    onClick={() => {
                        setOpen(false);
                        setTitle('');
                    }}
                    aria-label="Cancelar"
                    style={{ borderColor: hairline }}
                    className="pm-on-card rounded-lg border px-2.5 py-1.5 opacity-70 hover:opacity-100"
                >
                    <X size={13} aria-hidden="true" />
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ *
 * Columna
 * ------------------------------------------------------------------ */

interface ColumnProps {
    columnKey: ColumnKey;
    cards: KanbanCard[];
    total: number;
    dragDisabled: boolean;
    children: (card: KanbanCard) => React.ReactNode;
    onAdd: (title: string, column: ColumnKey) => void;
}

function BoardColumn({ columnKey, cards, total, dragDisabled, children, onAdd }: ColumnProps) {
    const meta = COLUMN_META[columnKey];
    const { setNodeRef, isOver } = useDroppable({
        id: columnNodeId(columnKey),
        data: { type: 'column', columnKey },
    });
    const headingId = `pm-col-${columnKey}`;

    return (
        <section
            aria-labelledby={headingId}
            style={withTone(meta.tone)}
            className="flex min-h-0 w-[19.5rem] shrink-0 flex-col"
        >
            <header
                style={{ background: tint(10), borderColor: tint(28) }}
                className="pm-chrome mb-3 flex shrink-0 items-center justify-between rounded-2xl border px-3 py-2.5"
            >
                <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tint(100) }} aria-hidden="true" />
                    <div className="min-w-0">
                        <h2 id={headingId} className="pm-on-card truncate text-[10.5px] font-black uppercase tracking-[0.18em]">
                            {meta.label}
                        </h2>
                        <p className="pm-on-card truncate text-[9.5px] font-semibold uppercase tracking-wider opacity-70">
                            {meta.hint}
                        </p>
                    </div>
                </div>
                <span
                    style={{ background: tint(16) }}
                    className="pm-on-card shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums"
                >
                    {cards.length === total ? total : `${cards.length}/${total}`}
                </span>
            </header>

            <ul
                ref={setNodeRef}
                role="list"
                style={{
                    background: isOver ? tint(10) : 'transparent',
                    borderColor: isOver ? tint(38) : 'transparent',
                }}
                className="custom-scrollbar flex min-h-[7rem] flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain
                           rounded-2xl border border-dashed p-1.5 transition-colors duration-150"
            >
                <SortableContext items={cards.map(c => cardNodeId(c.id))} strategy={verticalListSortingStrategy}>
                    {cards.map(children)}
                </SortableContext>
                {cards.length === 0 && (
                    <li className="pm-on-card flex flex-1 items-center justify-center px-2 py-6 text-center text-[10.5px] font-bold uppercase tracking-wider opacity-55">
                        Suelta una tarjeta aquí
                    </li>
                )}
            </ul>

            <AddCardForm columnKey={columnKey} tone={meta.tone} onAdd={onAdd} />
        </section>
    );
}

/* ------------------------------------------------------------------ *
 * Diálogo RAG (accesible, con focus trap)
 * ------------------------------------------------------------------ */

interface RagMessage {
    role: 'user' | 'ai';
    content: string;
}

function RagDialog({
    card,
    onClose,
    onPersist,
}: {
    card: KanbanCard;
    onClose: () => void;
    onPersist: (id: number, context: string) => void;
}) {
    const [messages, setMessages] = useState<RagMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const restoreRef = useRef<HTMLElement | null>(null);
    const tone = COLUMN_META[card.column].tone;

    const ask = useCallback(
        async (prompt: string) => {
            setLoading(true);
            setMessages(prev => [...prev, { role: 'user', content: prompt }]);
            try {
                const res = await fetch('/chat-rag', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                    body: JSON.stringify({ prompt }),
                });
                const data = await res.json();
                setMessages(prev => [...prev, { role: 'ai', content: data.response || 'Sin respuesta del motor RAG.' }]);
            } catch {
                setMessages(prev => [...prev, { role: 'ai', content: 'No se pudo contactar el motor LLM.' }]);
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    // Arranque: el prompt lo construye el backend (POST /kanban/ask-rag),
    // que es quien conoce rag_context. Luego se envía a /chat-rag.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            let prompt = `Analiza la tarea del Kanban "${card.title}" y los insumos de inventario relacionados.`;
            try {
                const { result } = pmUpload.push<{ rag_prompt: string }>('POST', '/kanban/ask-rag', { item_id: card.id });
                const data = await result;
                if (data?.rag_prompt) prompt = `${data.rag_prompt}\n\n¿Qué insumos del inventario están relacionados y qué riesgo FEFO implica?`;
            } catch {
                /* se usa el prompt de respaldo */
            }
            if (!cancelled) await ask(prompt);
        })();
        return () => {
            cancelled = true;
        };
    }, [card.id, card.title, ask]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, loading]);

    // Focus trap + Escape + restauración del foco.
    useEffect(() => {
        restoreRef.current = document.activeElement as HTMLElement | null;
        const node = dialogRef.current;
        node?.querySelector<HTMLElement>('input, button')?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
                return;
            }
            if (e.key !== 'Tab' || !node) return;
            const focusables = Array.from(
                node.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea, [href]'),
            ).filter(el => el.offsetParent !== null);
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('keydown', onKey, true);
            restoreRef.current?.focus?.();
        };
    }, [onClose]);

    const lastAi = [...messages].reverse().find(m => m.role === 'ai')?.content ?? '';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={withTone(tone)}>
            <button
                aria-label="Cerrar"
                tabIndex={-1}
                onClick={onClose}
                className="absolute inset-0 cursor-default backdrop-blur-sm"
                style={{ background: 'color-mix(in oklab, currentColor 55%, transparent)' }}
            />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="pm-rag-title"
                style={{ borderColor: tint(30) }}
                className="pm-chrome relative flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border shadow-2xl"
            >
                <div style={{ borderColor: hairline }} className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                        <span
                            style={{ background: tint(16), borderColor: tint(35) }}
                            className="pm-on-card flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
                        >
                            <Bot size={17} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <h3 id="pm-rag-title" className="pm-on-card truncate text-sm font-bold">
                                Motor RAG — {card.title}
                            </h3>
                            <p className="pm-on-card text-[10px] font-bold uppercase tracking-wider opacity-70">
                                {COLUMN_META[card.column].label}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {lastAi && (
                            <button
                                onClick={() => onPersist(card.id, lastAi)}
                                title="Guardar este análisis como contexto de la tarjeta"
                                className="pm-on-card flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-bold opacity-75 hover:opacity-100"
                            >
                                <Save size={13} aria-hidden="true" /> Guardar contexto
                            </button>
                        )}
                        <button onClick={onClose} aria-label="Cerrar chat RAG" className="pm-on-card rounded-xl p-2 opacity-70 hover:opacity-100">
                            <X size={17} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div aria-live="polite" className="custom-scrollbar flex-1 space-y-3 overflow-y-auto overscroll-contain p-5">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                style={{
                                    background: msg.role === 'user' ? tint(14) : 'transparent',
                                    borderColor: msg.role === 'user' ? tint(32) : hairline,
                                }}
                                className="pm-on-card max-w-[85%] whitespace-pre-wrap rounded-2xl border px-3.5 py-2.5 text-[13px] leading-relaxed"
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="pm-on-card flex items-center gap-2 text-xs font-bold opacity-75">
                            <Loader2 size={13} className="animate-spin" aria-hidden="true" /> Consultando el inventario…
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                <form
                    onSubmit={e => {
                        e.preventDefault();
                        const prompt = input.trim();
                        if (!prompt || loading) return;
                        setInput('');
                        void ask(prompt);
                    }}
                    style={{ borderColor: hairline }}
                    className="shrink-0 border-t p-3.5"
                >
                    <div className="relative">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            disabled={loading}
                            placeholder="Pregunta de seguimiento…"
                            aria-label="Pregunta de seguimiento"
                            style={{ borderColor: hairline, background: tint(7) }}
                            className="pm-on-card w-full rounded-xl border py-2.5 pl-3.5 pr-11 text-sm outline-none placeholder:opacity-50 disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            aria-label="Enviar consulta"
                            style={{ background: tint(18) }}
                            className="pm-on-card absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 disabled:opacity-30"
                        >
                            <Send size={15} aria-hidden="true" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ *
 * Página
 * ------------------------------------------------------------------ */

export default function Kanban({ auth, columns: incoming }: PageProps) {
    const [board, setBoard] = useState<Board>(() => normalize(incoming));
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [onlyPinned, setOnlyPinned] = useState(false);
    const [status, setStatus] = useState<{ tone: 'idle' | 'busy' | 'ok' | 'error'; text: string }>({
        tone: 'idle',
        text: '',
    });
    const [ragCard, setRagCard] = useState<KanbanCard | null>(null);

    const snapshotRef = useRef<Board>(board);
    const serverSigRef = useRef<string>(signature(board));
    const focusedRef = useRef<number | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const user = auth?.user ?? { name: '—', role: 'operario' };
    const filtering = query.trim().length > 0 || onlyPinned;

    /* --- sincronización con Inertia sin clobber del estado optimista --- */
    useEffect(() => {
        const next = normalize(incoming);
        const sig = signature(next);
        if (sig === serverSigRef.current || pmUpload.busy) return;
        serverSigRef.current = sig;
        setBoard(next);
    }, [incoming]);

    const applyServer = useCallback((raw?: Partial<Record<ColumnKey, KanbanCard[]>>) => {
        if (!raw) return;
        const next = normalize(raw);
        serverSigRef.current = signature(next);
        setBoard(next);
    }, []);

    const flash = useCallback((tone: 'ok' | 'error', text: string) => {
        setStatus({ tone, text });
        window.setTimeout(() => setStatus(s => (s.text === text ? { tone: 'idle', text: '' } : s)), 2600);
    }, []);

    /* --- sensores: puntero, táctil y teclado real --- */
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    /* --- vista filtrada (sólo presentación; nunca alimenta índices de persistencia) --- */
    const view = useMemo(() => {
        const term = query.trim().toLowerCase();
        const out = emptyBoard();
        for (const key of COLUMN_ORDER) {
            out[key] = board[key].filter(card => {
                if (onlyPinned && !card.is_pinned) return false;
                if (!term) return true;
                return (
                    card.title.toLowerCase().includes(term) ||
                    (card.description ?? '').toLowerCase().includes(term)
                );
            });
        }
        return out;
    }, [board, query, onlyPinned]);

    /* --- único camino de escritura de orden --- */
    const persistMove = useCallback(
        (cardId: number, column: ColumnKey, position: number, rollback: Board) => {
            setStatus({ tone: 'busy', text: 'Guardando…' });
            const { ticket, result } = pmUpload.push<{ columns: Partial<Record<ColumnKey, KanbanCard[]>> }>(
                'POST',
                '/kanban/reorder',
                { item_id: cardId, column, position },
            );
            result
                .then(data => {
                    if (!pmUpload.isLatest(ticket)) return; // respuesta obsoleta
                    applyServer(data?.columns);
                    flash('ok', 'Orden guardado');
                })
                .catch(() => {
                    setBoard(rollback);
                    flash('error', 'No se pudo guardar. Se restauró el orden anterior.');
                });
        },
        [applyServer, flash],
    );

    const moveCard = useCallback(
        (cardId: number, targetColumn: ColumnKey, targetIndex: number) => {
            const rollback = board;
            const at = locate(board, cardId);
            if (!at) return;

            const bounded = Math.max(0, Math.min(targetIndex, board[targetColumn].length - (at.column === targetColumn ? 1 : 0)));
            if (at.column === targetColumn && at.index === bounded) return;

            let next: Board;
            if (at.column === targetColumn) {
                next = reindex({ ...board, [targetColumn]: arrayMove(board[targetColumn], at.index, bounded) });
            } else {
                const source = [...board[at.column]];
                const [card] = source.splice(at.index, 1);
                const dest = [...board[targetColumn]];
                dest.splice(bounded, 0, { ...card, column: targetColumn });
                next = reindex({ ...board, [at.column]: source, [targetColumn]: dest });
            }

            setBoard(next);
            persistMove(cardId, targetColumn, bounded, rollback);
        },
        [board, persistMove],
    );

    /* --- drag & drop --- */
    const containerOf = useCallback(
        (id: UniqueIdentifier, source: Board): ColumnKey | null => {
            const col = parseColumnId(id);
            if (col) return col;
            const cardId = parseCardId(id);
            return cardId === null ? null : (locate(source, cardId)?.column ?? null);
        },
        [],
    );

    const handleDragStart = (event: DragStartEvent) => {
        snapshotRef.current = board;
        setActiveId(event.active.id);
    };

    // Mueve entre contenedores en vivo: el hueco que ve el usuario es el hueco real.
    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;
        const activeCardId = parseCardId(active.id);
        if (activeCardId === null) return;

        setBoard(prev => {
            const from = containerOf(active.id, prev);
            const to = containerOf(over.id, prev);
            if (!from || !to || from === to) return prev;

            const source = [...prev[from]];
            const index = source.findIndex(c => c.id === activeCardId);
            if (index === -1) return prev;
            const [card] = source.splice(index, 1);

            const dest = [...prev[to]];
            const overCardId = parseCardId(over.id);
            const overIndex = overCardId === null ? -1 : dest.findIndex(c => c.id === overCardId);
            const insertAt = overIndex === -1 ? dest.length : overIndex;
            dest.splice(insertAt, 0, { ...card, column: to });

            return reindex({ ...prev, [from]: source, [to]: dest });
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        const cardId = parseCardId(active.id);
        if (cardId === null || !over) {
            setBoard(snapshotRef.current);
            return;
        }

        const target = containerOf(over.id, board);
        const at = locate(board, cardId);
        if (!target || !at) {
            setBoard(snapshotRef.current);
            return;
        }

        const overCardId = parseCardId(over.id);
        const overIndex = overCardId === null ? -1 : board[target].findIndex(c => c.id === overCardId);
        const desired = overIndex === -1 ? board[target].length - (at.column === target ? 1 : 0) : overIndex;

        const rollback = snapshotRef.current;
        const finalBoard =
            at.column === target
                ? reindex({ ...board, [target]: arrayMove(board[target], at.index, Math.max(0, desired)) })
                : board; // handleDragOver ya dejó la tarjeta en su contenedor destino

        setBoard(finalBoard);
        const settled = locate(finalBoard, cardId);
        if (!settled) return;
        if (signature(finalBoard) === signature(rollback)) return; // nada cambió: no se escribe
        persistMove(cardId, settled.column, settled.index, rollback);
    };

    const handleDragCancel = () => {
        setActiveId(null);
        setBoard(snapshotRef.current);
    };

    /* --- CRUD de tarjetas --- */
    const handleAdd = (title: string, column: ColumnKey) => {
        const rollback = board;
        setStatus({ tone: 'busy', text: 'Creando…' });
        pmUpload
            .push<KanbanCard>('POST', '/kanban', { title, column })
            .result.then(created => {
                setBoard(prev => reindex({ ...prev, [column]: [...prev[column], { ...created, column }] }));
                flash('ok', 'Tarjeta creada');
            })
            .catch(() => {
                setBoard(rollback);
                flash('error', 'No se pudo crear la tarjeta.');
            });
    };

    const handleSave = (id: number, patch: { title?: string; description?: string | null }) => {
        const rollback = board;
        setBoard(prev =>
            reindex({
                ...prev,
                ...Object.fromEntries(
                    COLUMN_ORDER.map(k => [k, prev[k].map(c => (c.id === id ? { ...c, ...patch } : c))]),
                ),
            } as Board),
        );
        pmUpload
            .push<KanbanCard>('PUT', `/kanban/${id}`, patch)
            .result.then(() => flash('ok', 'Tarjeta actualizada'))
            .catch(() => {
                setBoard(rollback);
                flash('error', 'No se pudo actualizar la tarjeta.');
            });
    };

    const handlePin = (id: number) => {
        const rollback = board;
        // El pin es visual: NO reordena arrays, así índice y position siguen alineados.
        setBoard(prev =>
            ({
                ...prev,
                ...Object.fromEntries(
                    COLUMN_ORDER.map(k => [k, prev[k].map(c => (c.id === id ? { ...c, is_pinned: !c.is_pinned } : c))]),
                ),
            }) as Board,
        );
        pmUpload
            .push<KanbanCard>('POST', `/kanban/${id}/pin`)
            .result.then(updated => {
                setBoard(prev =>
                    ({
                        ...prev,
                        ...Object.fromEntries(
                            COLUMN_ORDER.map(k => [
                                k,
                                prev[k].map(c => (c.id === updated.id ? { ...c, is_pinned: Boolean(updated.is_pinned) } : c)),
                            ]),
                        ),
                    }) as Board,
                );
            })
            .catch(() => {
                setBoard(rollback);
                flash('error', 'No se pudo cambiar el estado de fijado.');
            });
    };

    const handleDelete = (id: number) => {
        const rollback = board;
        setBoard(prev =>
            reindex({
                ...prev,
                ...Object.fromEntries(COLUMN_ORDER.map(k => [k, prev[k].filter(c => c.id !== id)])),
            } as Board),
        );
        pmUpload
            .push('DELETE', `/kanban/${id}`)
            .result.then(() => flash('ok', 'Tarjeta eliminada'))
            .catch(() => {
                setBoard(rollback);
                flash('error', 'No se pudo eliminar la tarjeta.');
            });
    };

    const handlePersistRagContext = (id: number, context: string) => {
        pmUpload
            .push<KanbanCard>('POST', `/kanban/${id}/rag-context`, { rag_context: context })
            .result.then(() => flash('ok', 'Contexto RAG guardado en la tarjeta'))
            .catch(() => flash('error', 'No se pudo guardar el contexto RAG.'));
    };

    /* --- atajos globales + movimiento por teclado (Alt + flechas) --- */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (ragCard) return; // el diálogo tiene su propio manejo
            const target = e.target as HTMLElement | null;
            const typing =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target?.isContentEditable;

            if (e.altKey && focusedRef.current !== null) {
                const id = focusedRef.current;
                const at = locate(board, id);
                if (!at) return;
                const colIndex = COLUMN_ORDER.indexOf(at.column);
                if (e.key === 'ArrowLeft' && colIndex > 0) {
                    e.preventDefault();
                    moveCard(id, COLUMN_ORDER[colIndex - 1], board[COLUMN_ORDER[colIndex - 1]].length);
                } else if (e.key === 'ArrowRight' && colIndex < COLUMN_ORDER.length - 1) {
                    e.preventDefault();
                    moveCard(id, COLUMN_ORDER[colIndex + 1], board[COLUMN_ORDER[colIndex + 1]].length);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    moveCard(id, at.column, at.index - 1);
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    moveCard(id, at.column, at.index + 1);
                }
                return;
            }

            if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                searchRef.current?.focus();
            }
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                document.querySelector<HTMLButtonElement>('[data-add="todo"]')?.click();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [board, moveCard, ragCard]);

    const announcements: Announcements = {
        onDragStart: ({ active }) => {
            const id = parseCardId(active.id);
            const card = id === null ? null : board[locate(board, id)?.column ?? 'todo'].find(c => c.id === id);
            return card ? `Tomaste la tarjeta ${card.title}.` : 'Tarjeta tomada.';
        },
        onDragOver: ({ over }) => {
            const col = over ? containerOf(over.id, board) : null;
            return col ? `Sobre la columna ${COLUMN_META[col].label}.` : 'Fuera de una columna válida.';
        },
        onDragEnd: ({ active, over }) => {
            const id = parseCardId(active.id);
            const at = id === null ? null : locate(board, id);
            if (!over || !at) return 'Movimiento cancelado.';
            return `Tarjeta movida a ${COLUMN_META[at.column].label}, posición ${at.index + 1}.`;
        },
        onDragCancel: () => 'Movimiento cancelado, la tarjeta volvió a su lugar.',
    };

    const activeCard = useMemo(() => {
        const id = activeId ? parseCardId(activeId) : null;
        if (id === null) return null;
        const at = locate(board, id);
        return at ? board[at.column][at.index] : null;
    }, [activeId, board]);

    const totalCards = COLUMN_ORDER.reduce((sum, k) => sum + board[k].length, 0);

    return (
        <div className="flex h-dvh overflow-hidden font-sans">
            <Head title="Kanban | Pymetory" />

            <Sidebar
                sidebarOpen={sidebarOpen}
                mobileOpen={mobileOpen}
                user={user}
                activeView="/kanban"
                mode="kanban"
                onMobileClose={() => setMobileOpen(false)}
            />

            <main className="flex min-h-0 min-w-0 flex-1 flex-col">
                <header
                    style={{ borderColor: hairline }}
                    className="pm-chrome flex h-16 shrink-0 items-center justify-between gap-4 border-b px-5"
                >
                    <div className="flex min-w-0 items-center gap-4">
                        <button
                            onClick={() => (window.innerWidth >= 1024 ? setSidebarOpen(o => !o) : setMobileOpen(o => !o))}
                            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
                            className="pm-on-card rounded-xl p-2 opacity-75 transition-opacity hover:opacity-100"
                        >
                            <Menu size={19} aria-hidden="true" />
                        </button>
                        <nav aria-label="Ruta" className="flex min-w-0 items-baseline gap-2">
                            <span className="pm-on-card text-[10.5px] font-bold uppercase tracking-[0.18em] opacity-70">
                                Pymetory /
                            </span>
                            <h1 className="pm-on-card truncate text-[11px] font-black uppercase tracking-[0.18em]">
                                Tablero Kanban
                            </h1>
                            <span className="pm-on-card text-[10px] font-bold tabular-nums opacity-60">{totalCards}</span>
                        </nav>
                    </div>

                    <div className="flex items-center gap-2">
                        <p
                            aria-live="polite"
                            className={`pm-on-card hidden items-center gap-1.5 text-[10.5px] font-bold sm:flex ${
                                status.tone === 'idle' ? 'opacity-0' : 'opacity-85'
                            }`}
                        >
                            {status.tone === 'busy' && <Loader2 size={12} className="animate-spin" aria-hidden="true" />}
                            {status.tone === 'ok' && <Check size={12} aria-hidden="true" />}
                            {status.text}
                        </p>

                        <button
                            onClick={() => setOnlyPinned(v => !v)}
                            aria-pressed={onlyPinned}
                            style={{ borderColor: hairline }}
                            className={`pm-on-card flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10.5px] font-bold uppercase tracking-wider transition-opacity ${
                                onlyPinned ? 'opacity-100' : 'opacity-65 hover:opacity-100'
                            }`}
                        >
                            <Pin size={12} aria-hidden="true" /> Fijadas
                        </button>

                        <div className="relative">
                            <Search size={13} aria-hidden="true" className="pm-on-card absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                            <input
                                ref={searchRef}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Filtrar tarjetas…"
                                aria-label="Filtrar tarjetas por título o descripción"
                                style={{ borderColor: hairline }}
                                className="pm-on-card w-44 rounded-xl border bg-transparent py-2 pl-8 pr-8 text-[12px] font-semibold outline-none placeholder:opacity-55"
                            />
                            {query && (
                                <button
                                    onClick={() => setQuery('')}
                                    aria-label="Limpiar filtro"
                                    className="pm-on-card absolute right-2 top-1/2 -translate-y-1/2 opacity-65 hover:opacity-100"
                                >
                                    <X size={12} aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {filtering && (
                    <p
                        role="status"
                        style={{ borderColor: hairline }}
                        className="pm-on-card shrink-0 border-b px-5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider opacity-75"
                    >
                        Vista filtrada — reordenar está deshabilitado para no corromper las posiciones
                    </p>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={boardCollision}
                    measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                    autoScroll={{ threshold: { x: 0.18, y: 0.22 }, acceleration: 12 }}
                    accessibility={{
                        announcements,
                        screenReaderInstructions: {
                            draggable:
                                'Presiona espacio para tomar la tarjeta. Usa las flechas para moverla, espacio para soltarla y Escape para cancelar. ' +
                                'Alternativa sin arrastre: con la tarjeta enfocada, Alt más flechas la mueve entre columnas y posiciones.',
                        },
                    }}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
                    <div className="custom-scrollbar flex min-h-0 flex-1 gap-5 overflow-x-auto overscroll-x-contain px-5 py-5">
                        {COLUMN_ORDER.map(key => (
                            <BoardColumn
                                key={key}
                                columnKey={key}
                                cards={view[key]}
                                total={board[key].length}
                                dragDisabled={filtering}
                                onAdd={handleAdd}
                            >
                                {card => (
                                    <SortableCard
                                        key={card.id}
                                        card={card}
                                        tone={COLUMN_META[key].tone}
                                        dragDisabled={filtering}
                                        onPin={handlePin}
                                        onSave={handleSave}
                                        onDelete={handleDelete}
                                        onAskRag={setRagCard}
                                        onFocusCard={id => {
                                            focusedRef.current = id;
                                        }}
                                    />
                                )}
                            </BoardColumn>
                        ))}
                    </div>

                    <DragOverlay adjustScale={false}>
                        {activeCard && (
                            <div
                                style={withTone(COLUMN_META[activeCard.column].tone, {
                                    borderColor: tint(50),
                                    boxShadow: `0 18px 40px -18px ${tint(70)}, inset 3px 0 0 0 ${tint(90)}`,
                                    rotate: '1.5deg',
                                })}
                                className="pm-chrome pm-on-card w-[19rem] rounded-2xl border p-3.5"
                            >
                                <p className="pm-on-card text-sm font-semibold leading-snug">{activeCard.title}</p>
                                {activeCard.description && (
                                    <p className="pm-on-card mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed opacity-70">
                                        {activeCard.description}
                                    </p>
                                )}
                            </div>
                        )}
                    </DragOverlay>
                </DndContext>
            </main>

            {ragCard && (
                <RagDialog card={ragCard} onClose={() => setRagCard(null)} onPersist={handlePersistRagContext} />
            )}
        </div>
    );
}