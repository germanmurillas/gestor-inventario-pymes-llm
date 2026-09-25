import React from 'react';
import { Package, FileText, Clock, DollarSign } from 'lucide-react';
import FigmaKpiCard from './FigmaKpiCard';
import FigmaBodegaBar from './FigmaBodegaBar';
import FigmaQuickActions from './FigmaQuickActions';
import FigmaActivityItem from './FigmaActivityItem';
import FigmaFefoTimer from './FigmaFefoTimer';

const FigmaTablero = ({ stats, user, onViewChange, onOpenBodega, onManageBodegas }: { stats: any; user: any; onViewChange: (view: any) => void; onOpenBodega?: (code: string) => void; onManageBodegas?: (inicial: 'nueva' | number | null) => void }) => {
    const summary = stats?.summary || { totalMaterials: 0, totalLotes: 0, lotesCriticos: 0, totalInventoryValue: 0, totalInventoryVolume: 0 };
    const efficiency = stats?.efficiency || { accuracy: 0, turnoverRatio: 0, occupancyTotal: 0 };
    const activity = stats?.recentActivity || [];
    const bodegas = stats?.bodegas || [];
    const fefoAlerts = stats?.fefoAlerts || [];
    const trends = stats?.trends || {};

    const isAdmin = user.role === 'admin';

    const formattedValue = summary.totalInventoryValue > 0
        ? `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(summary.totalInventoryValue)}`
        : '—';

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700 pb-4 sm:pb-12">
            {/* ── Encabezado + Quick Actions ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight font-display">
                        Tablero de Control
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                        Vista general del inventario · {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                </div>
                <FigmaQuickActions onAction={onViewChange} isAdmin={isAdmin} />
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <FigmaKpiCard
                    icon={<Package size={20} />}
                    count={summary.totalMaterials}
                    label="Insumos Activos"
                    color="indigo"
                    trend={trends.materiales?.startsWith('+') ? 'up' : 'down'}
                    trendValue={trends.materiales}
                />
                <FigmaKpiCard
                    icon={<FileText size={20} />}
                    count={summary.totalLotes}
                    label="Lotes en Bodega"
                    color="blue"
                    trend={trends.lotes?.startsWith('+') ? 'up' : 'down'}
                    trendValue={trends.lotes}
                />
                <FigmaKpiCard
                    icon={<Clock size={20} />}
                    count={summary.lotesCriticos}
                    label="Críticos FEFO"
                    color="red"
                    trend={Number(trends.criticos) > 0 ? 'up' : 'down'}
                    trendValue={trends.criticos}
                />
                <FigmaKpiCard
                    icon={<DollarSign size={20} />}
                    count={formattedValue}
                    label="Valorización COP"
                    color="emerald"
                    trend="up"
                    trendValue={trends.valor}
                />
            </div>

            {/* ── Grid principal: Actividad + Panel derecho ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Actividad (Kardex) ── */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] font-display">
                            Kardex de Actividad
                        </h3>
                        <button
                            onClick={() => onViewChange('LOG_MAESTRO')}
                            className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-wider transition-colors"
                        >
                            Ver historial completo →
                        </button>
                    </div>

                    <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/40 rounded-2xl overflow-hidden min-h-[300px]">
                        {activity.length > 0 ? (
                            activity.map((act: any) => (
                                <FigmaActivityItem
                                    key={act.id}
                                    id={act.id}
                                    material={act.material}
                                    code={act.code}
                                    batch={act.batch}
                                    user={act.user}
                                    quantity={act.quantity}
                                    unit={act.unit}
                                    time={act.time}
                                    action={act.action}
                                    type={act.type}
                                />
                            ))
                        ) : (
                            <div className="p-12 text-center text-slate-600 text-xs font-bold uppercase tracking-wider">
                                Sin movimientos registrados
                            </div>
                        )}
                        <div className="p-4 border-t border-slate-700/30 flex justify-center bg-slate-800/20">
                            <button
                                onClick={() => onViewChange('LOG_MAESTRO')}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors"
                            >
                                Ver historial completo
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Panel derecho: Bodegas + FEFO ── */}
                <div className="space-y-6">
                    {/* Bodegas */}
                    <div>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] font-display">Bodegas</h3>
                            {user?.role === 'admin' && onManageBodegas && (
                                <button onClick={() => onManageBodegas(null)} className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200">Gestionar</button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {bodegas.length > 0 ? (
                                bodegas.map((b: any) => (
                                    <FigmaBodegaBar
                                        key={b.code}
                                        bodega={b}
                                        onOpen={() => onOpenBodega?.(b.code)}
                                        onEdit={user?.role === 'admin' && onManageBodegas ? () => onManageBodegas(b.id) : undefined}
                                    />
                                ))
                            ) : (
                                <div className="bg-slate-800/20 border border-dashed border-slate-700/30 rounded-xl p-6 text-center text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                                    Sin bodegas
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Estado de Eficiencia */}
                    <div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] font-display mb-4">
                            Eficiencia Operativa
                        </h3>
                        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/40 rounded-xl p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precisión</span>
                                <span className="text-sm font-black text-emerald-400 font-display">{efficiency.accuracy}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rotación</span>
                                <span className="text-sm font-black text-indigo-400 font-display">{efficiency.turnoverRatio}x</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ocupación Total</span>
                                <span className={`text-sm font-black font-display ${efficiency.occupancyTotal >= 80 ? 'text-red-400' : efficiency.occupancyTotal >= 60 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {efficiency.occupancyTotal}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* FEFO Countdown */}
                    {fefoAlerts.length > 0 && (
                        <div>
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] font-display mb-4">
                                Alerta FEFO · Próximos Vencimientos
                            </h3>
                            <div className="space-y-3">
                                {fefoAlerts.map((alert: any) => (
                                    <FigmaFefoTimer
                                        key={alert.id}
                                        material={alert.material}
                                        codigo={alert.codigo}
                                        lote={alert.lote}
                                        diasRestantes={alert.diasRestantes}
                                        vencimiento={alert.vencimiento}
                                        bodega={alert.bodega}
                                        nivel={alert.nivel}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FigmaTablero;
