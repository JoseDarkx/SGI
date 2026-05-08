import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRegistros } from '../hooks/useRegistros';
import { useProcesos } from '../hooks/useProcesos';
import { useIndicadores } from '../hooks/useIndicadores';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { Activity, Target, CheckCircle2, XCircle, X, List, TrendingUp, User, Filter } from 'lucide-react';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    if (!user) return null;
    return user.role === 'Administrador' ? <AdminDashboard /> : <LeaderDashboard user={user} />;
};

// ==========================================
// 1. VISTA DE ADMINISTRADOR (Vista General)
// ==========================================
const AdminDashboard = () => {
    const { registros, loading: loadingReg, fetchRegistrosFiltrados } = useRegistros();
    const { procesos, loading: loadingProc, fetchProcesos } = useProcesos();
    const { indicadores, loading: loadingInd, fetchIndicadores } = useIndicadores();
    
    const [modalInfo, setModalInfo] = useState<{ title: string; data: any[]; type: 'proceso' | 'indicador' } | null>(null);
    const [filtroFrecuencia, setFiltroFrecuencia] = useState<string>('Todas');
    const [filtroPeriodo, setFiltroPeriodo] = useState<string>('Consolidado');

    // Función Helper para agrupar por mes (YYYY-MM-DD -> "Mes Año")
    const formatPeriodo = (fecha: string) => {
        if (!fecha) return 'N/A';
        const [year, month] = fecha.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `${meses[parseInt(month, 10) - 1]} ${year}`;
    };

    useEffect(() => {
        fetchProcesos();
        fetchIndicadores();
        // Cargamos todos los registros del administrador limitados a 300 (lógica de tu servicio)
        fetchRegistrosFiltrados({ esAdmin: true });
    }, [fetchProcesos, fetchIndicadores, fetchRegistrosFiltrados]);

    const registrosOficiales = useMemo(() => registros.filter(r => r.estado_registro !== 'Borrador'), [registros]);
    
    // Lista de meses disponibles para el selector
    const opcionesPeriodo = useMemo(() => {
        const meses = Array.from(new Set(registrosOficiales.map(r => r.periodo.slice(0, 7))));
        return meses.sort().reverse(); // De más reciente a más antiguo
    }, [registrosOficiales]);

    const actuales = useMemo(() => {
        if (filtroPeriodo === 'Consolidado') {
            // Lógica de Últimos Datos de cada Indicador
            const ultimosMap = new Map();
            registrosOficiales.forEach(r => {
                if (!ultimosMap.has(r.indicador_id)) {
                    ultimosMap.set(r.indicador_id, r);
                }
            });
            const data = Array.from(ultimosMap.values());
            if (filtroFrecuencia === 'Todas') return data;
            return data.filter((r: any) => r.indicadores?.frecuencia === filtroFrecuencia);
        } else {
            // Filtrar por el Mes/Año seleccionado (YYYY-MM)
            const porMes = registrosOficiales.filter((r: any) => r.periodo.startsWith(filtroPeriodo));
            if (filtroFrecuencia === 'Todas') return porMes;
            return porMes.filter((r: any) => r.indicadores?.frecuencia === filtroFrecuencia);
        }
    }, [registrosOficiales, filtroPeriodo, filtroFrecuencia]);

    const tituloPeriodo = useMemo(() => {
        if (filtroPeriodo === 'Consolidado') return 'Últimos Reportes Consolidados';
        return `Reportes de ${formatPeriodo(filtroPeriodo + '-01')}`;
    }, [filtroPeriodo]);

    const barData = useMemo(() => {
        return (procesos || []).map((p: any) => {
            const regs = actuales.filter((r: any) => r.proceso_id === p.id);
            const hasData = regs.length > 0;
            const prom = hasData ? regs.reduce((a, c) => a + Number(c.porcentaje_cumplimiento || 0), 0) / regs.length : 0;

            let fill = '#cbd5e1'; 
            if (hasData) {
                const hasRed = regs.some(r => r.semaforo === 'Rojo');
                const hasYellow = regs.some(r => r.semaforo === 'Amarillo');
                if (hasRed) fill = '#ef4444'; 
                else if (hasYellow) fill = '#f59e0b'; 
                else fill = '#10b981'; 
            }

            let valCalculado = Math.min(100, Math.round(prom));
            if (isNaN(valCalculado)) valCalculado = 0;

            return {
                id: p.id,
                name: p.codigo_proceso,
                fullName: p.nombre_proceso,
                val: valCalculado,
                hasData,
                fill
            };
        });
    }, [procesos, actuales]);

    const procesosConDatos = useMemo(() => barData.filter(d => d.hasData), [barData]);

    const cumplimientoGlobal = useMemo(() => {
        if (procesosConDatos.length === 0) return 0;
        const promedioBruto = procesosConDatos.reduce((acc, curr) => acc + curr.val, 0) / procesosConDatos.length;
        return Math.min(100, Math.round(promedioBruto));
    }, [procesosConDatos]);

    const procesosVerdes = procesosConDatos.filter(d => d.fill === '#10b981');
    const procesosAmarillos = procesosConDatos.filter(d => d.fill === '#f59e0b');
    const procesosRojos = procesosConDatos.filter(d => d.fill === '#ef4444');

    const colorGlobalPie = procesosVerdes.length === procesosConDatos.length && procesosConDatos.length > 0 ? '#10b981' : procesosRojos.length > procesosVerdes.length ? '#ef4444' : '#f59e0b';

    const handleCardClick = (tipo: string) => {
        if (tipo === 'total') setModalInfo({ title: "Listado General de Procesos", data: barData.sort((a, b) => b.val - a.val), type: 'proceso' });
        else if (tipo === 'indicadores_total') setModalInfo({ title: "Total de Indicadores Registrados", data: indicadores, type: 'indicador' });
        else if (tipo === 'activos') setModalInfo({ title: tituloPeriodo, data: actuales, type: 'indicador' });
        else if (tipo === 'cumplen') setModalInfo({ title: "Procesos que Cumplen (100% de sus metas)", data: procesosVerdes.sort((a, b) => b.val - a.val), type: 'proceso' });
        else if (tipo === 'incumplen') setModalInfo({ title: "Procesos en Riesgo o Incumplimiento", data: [...procesosAmarillos, ...procesosRojos].sort((a, b) => a.val - b.val), type: 'proceso' });
    };

    if (loadingReg || loadingProc || loadingInd) return <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Cargando Panorama General...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 relative">
            <div className="bg-gradient-to-r from-[#b91c1c] to-[#0f172a] rounded-2xl p-8 text-white shadow-lg flex items-center gap-6 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold tracking-tight mb-1">Vista General</h2>
                    <p className="text-red-100 text-sm font-medium opacity-90">Consolidado de indicadores y procesos</p>
                </div>
                <Activity size={48} className="absolute right-10 top-1/2 -translate-y-1/2 text-white/10" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 z-20 relative">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                            <Filter size={14} />
                            Ver Mes:
                        </div>
                        <select
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-red-500 focus:border-red-500 block p-2 outline-none font-bold cursor-pointer"
                            value={filtroPeriodo}
                            onChange={(e) => setFiltroPeriodo(e.target.value)}
                        >
                            <option value="Consolidado">Últimos Datos Consolidados</option>
                            {opcionesPeriodo.map(mes => (
                                <option key={mes} value={mes}>{formatPeriodo(mes + '-01')}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                            <Activity size={14} />
                            Frecuencia:
                        </div>
                        <select
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none font-bold cursor-pointer"
                            value={filtroFrecuencia}
                            onChange={(e) => setFiltroFrecuencia(e.target.value)}
                        >
                            <option value="Todas">Todas</option>
                            <option value="Mensual">Mensuales</option>
                            <option value="Bimestral">Bimestrales</option>
                            <option value="Trimestral">Trimestrales</option>
                            <option value="Semestral">Semestrales</option>
                            <option value="Anual">Anuales</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <KpiCard title="Total Procesos" value={procesos.length} icon={<Target size={24} />} color="bg-blue-600" onClick={() => handleCardClick('total')} />
                <KpiCard title="Total Indicadores" value={indicadores.length} icon={<List size={24} />} color="bg-slate-700" onClick={() => handleCardClick('indicadores_total')} />
                <KpiCard title="Reportes Activos" value={actuales.length} icon={<Activity size={24} />} color="bg-purple-600" onClick={() => handleCardClick('activos')} />
                <KpiCard title="Procesos Cumplen" value={procesosVerdes.length} icon={<CheckCircle2 size={24} />} color="bg-green-600" valColor="text-green-600" onClick={() => handleCardClick('cumplen')} />
                <KpiCard title="Procesos Riesgo" value={procesosRojos.length + procesosAmarillos.length} icon={<XCircle size={24} />} color="bg-red-600" valColor="text-red-600" onClick={() => handleCardClick('incumplen')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-6">Cumplimiento por Proceso - {tituloPeriodo}</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                                    {barData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center relative overflow-hidden">
                    <div className="w-full flex justify-between items-start mb-2">
                        <div>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cumplimiento Global</h3>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase">Promedio de Procesos Activos</p>
                        </div>
                        <div className={`p-2 rounded-lg text-white shadow-sm ${colorGlobalPie === '#10b981' ? 'bg-green-500' : colorGlobalPie === '#ef4444' ? 'bg-red-500' : 'bg-yellow-400'}`}>
                            <Target size={18} />
                        </div>
                    </div>

                    <div className="w-full flex-1 min-h-[220px] relative mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    cy="70%"
                                    data={[
                                        { value: Math.min(100, cumplimientoGlobal) },
                                        { value: Math.max(0, 100 - cumplimientoGlobal) }
                                    ]}
                                    innerRadius={90}
                                    outerRadius={115}
                                    startAngle={180}
                                    endAngle={0}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill={colorGlobalPie} />
                                    <Cell fill="#f1f5f9" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 flex flex-col items-center pb-2 w-full">
                            <span className="text-5xl font-black tracking-tighter" style={{ color: colorGlobalPie }}>
                                {cumplimientoGlobal}%
                            </span>
                            {cumplimientoGlobal > 100 ? (
                                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full mt-2 flex items-center justify-center gap-1 border border-green-200">
                                    <TrendingUp size={12} /> +{cumplimientoGlobal - 100}% SOBRE META
                                </span>
                            ) : (
                                <span className="text-[11px] font-bold text-slate-400 uppercase mt-2 tracking-widest">
                                    Meta: 100%
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-800 mb-4">Semaforización de Procesos con Datos ({procesosConDatos.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <LegendBox color="bg-green-500" text="Verde - Cumplen 100%" subtext={`${Math.round((procesosVerdes.length / (procesosConDatos.length || 1)) * 100)}% de activos`} />
                    <LegendBox color="bg-yellow-400" text="Amarillo - Cumplen Parcial" subtext={`${Math.round((procesosAmarillos.length / (procesosConDatos.length || 1)) * 100)}% de activos`} />
                    <LegendBox color="bg-red-500" text="Rojo - No Cumplen" subtext={`${Math.round((procesosRojos.length / (procesosConDatos.length || 1)) * 100)}% de activos`} />
                </div>
            </div>

            {modalInfo && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setModalInfo(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">{modalInfo.title}</h3>
                            <button onClick={() => setModalInfo(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"><X size={20} /></button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
                            {modalInfo.data.length === 0 ? <div className="text-center text-slate-400 text-sm py-8">Sin datos.</div> : modalInfo.data.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4 text-left">
                                        {modalInfo.type === 'proceso' ? (
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-inner" style={{ backgroundColor: item.fill }}>{item.val}%</div>
                                        ) : (
                                            <div className="bg-slate-100 p-2 rounded-lg text-slate-500"><Activity size={18} /></div>
                                        )}
                                        <div className="text-left">
                                            <p className="font-bold text-slate-800 text-sm">{modalInfo.type === 'proceso' ? item.fullName : (item.indicadores?.nombre_indicador || item.nombre_indicador)}</p>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{modalInfo.type === 'proceso' ? item.name : (item.procesos?.nombre_proceso || 'N/A')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {modalInfo.type === 'proceso' ? (
                                            <span className="text-xs font-bold px-3 py-1 rounded-full uppercase border" style={{ backgroundColor: `${item.fill}15`, color: item.fill, borderColor: `${item.fill}30` }}>
                                                {item.fill === '#10b981' ? 'Cumple' : item.fill === '#cbd5e1' ? 'Sin Datos' : 'Riesgo'}
                                            </span>
                                        ) : (
                                            <>
                                                <p className="text-lg font-black text-slate-900 leading-none">{item.resultado_mensual}{item.unidad_medida?.includes('%') ? '%' : ''}</p>
                                                <p className={`text-[10px] font-bold mt-1 ${item.cumple_meta ? 'text-green-600' : 'text-red-600'}`}>Meta: {item.meta}{item.unidad_medida?.includes('%') ? '%' : ''}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// 2. VISTA DE LÍDER (Mi Vista)
// ==========================================
const LeaderDashboard = ({ user }: { user: any }) => {
    const { registros, loading, fetchRegistrosFiltrados } = useRegistros();
    const [filtroPeriodo, setFiltroPeriodo] = useState<string>('Consolidado');

    const formatPeriodo = (fecha: string) => {
        if (!fecha) return 'N/A';
        const [year, month] = fecha.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return `${meses[parseInt(month, 10) - 1]} ${year}`;
    };

    useEffect(() => {
        if (user?.proceso_id) {
            // Detección por nombre o por ID directo del proceso SGI
            const isSGI = user.procesos?.nombre_proceso?.includes('Integral') || 
                         user.proceso_id === 'd1aa17de-5003-4f65-a010-e3e81e3ec906';
            
            fetchRegistrosFiltrados({ 
                esAdmin: false, 
                userProcesoId: user.proceso_id,
                isHierarchical: isSGI 
            });
        }
    }, [user, fetchRegistrosFiltrados]);

    const registrosOficiales = useMemo(() => registros.filter(r => r.estado_registro !== 'Borrador'), [registros]);

    const opcionesPeriodo = useMemo(() => {
        const meses = Array.from(new Set(registrosOficiales.map(r => r.periodo.slice(0, 7))));
        return meses.sort().reverse();
    }, [registrosOficiales]);

    const actuales = useMemo(() => {
        if (filtroPeriodo === 'Consolidado') {
            const ultimosMap = new Map();
            registrosOficiales.forEach(r => {
                if (!ultimosMap.has(r.indicador_id)) ultimosMap.set(r.indicador_id, r);
            });
            return Array.from(ultimosMap.values());
        }
        return registrosOficiales.filter((r: any) => r.periodo.startsWith(filtroPeriodo));
    }, [registrosOficiales, filtroPeriodo]);

    const chartData = useMemo(() => {
        return actuales.map((r: any) => ({
            name: r.indicadores?.codigo_indicador || 'N/A',
            Meta: Number(r.meta) || 0,
            Resultado: Number(r.resultado_mensual) || 0
        }));
    }, [actuales]);

    const tituloPeriodo = useMemo(() => {
        if (filtroPeriodo === 'Consolidado') return 'Últimos Reportes';
        return formatPeriodo(filtroPeriodo + '-01');
    }, [filtroPeriodo]);

    const totalRegistros = actuales.length;
    const cumplen = actuales.filter(r => r.semaforo === 'Verde').length;
    const riesgo = actuales.filter(r => r.semaforo === 'Amarillo').length;
    const noCumplen = actuales.filter(r => r.semaforo === 'Rojo').length;
    const porcentaje = totalRegistros > 0 ? Math.round((cumplen / totalRegistros) * 100) : 0;

    if (loading) return <div className="p-10 text-center text-slate-400 text-xs font-bold uppercase">Cargando Mi Vista...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-gradient-to-r from-[#b91c1c] to-[#0f172a] rounded-2xl p-8 text-white shadow-lg flex items-center gap-6 relative overflow-hidden">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm"><User size={32} className="text-white" /></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold tracking-tight mb-1">Mi Vista - {user.procesos?.codigo_proceso || 'SGI'}</h2>
                    <p className="text-red-100 text-sm font-medium opacity-90">{user.procesos?.nombre_proceso || 'Sistema de Gestión Integral'}</p>
                </div>
                <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20">
                    <select
                        className="bg-white/10 border border-white/20 text-white text-xs rounded-lg focus:ring-white focus:border-white block p-2 outline-none font-bold cursor-pointer backdrop-blur-md"
                        value={filtroPeriodo}
                        onChange={(e) => setFiltroPeriodo(e.target.value)}
                    >
                        <option value="Consolidado" className="text-slate-900">Últimos Datos</option>
                        {opcionesPeriodo.map(mes => (
                            <option key={mes} value={mes} className="text-slate-900">{formatPeriodo(mes + '-01')}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div><p className="text-[10px] font-bold text-slate-500 uppercase">Total Registros</p><p className="text-3xl font-bold text-slate-800">{totalRegistros}</p></div>
                    <div className="bg-blue-600 text-white p-3 rounded-lg"><List size={20} /></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div><p className="text-[10px] font-bold text-slate-500 uppercase">En Seguimiento</p><p className="text-3xl font-bold text-amber-600">{riesgo}</p></div>
                    <div className="bg-amber-100 text-amber-600 p-3 rounded-lg"><Activity size={20} /></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div><p className="text-[10px] font-bold text-slate-500 uppercase">Indicadores Críticos</p><p className="text-3xl font-bold text-red-600">{noCumplen}</p></div>
                    <div className="bg-red-100 text-red-600 p-3 rounded-lg"><XCircle size={20} /></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div><p className="text-[10px] font-bold text-slate-500 uppercase">% Cumplimiento</p><p className="text-3xl font-bold text-slate-800">{porcentaje}%</p></div>
                    <div className="bg-[#b91c1c] text-white p-3 rounded-lg"><TrendingUp size={20} /></div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-6">Resultado vs Meta - {tituloPeriodo}</h3>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barGap={0} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }} />
                            <Bar dataKey="Meta" fill="#10b981" name="Meta Esperada" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Resultado" fill="#b91c1c" name="Resultado Obtenido" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Mis Registros Recientes</h3>
                {registros.map((reg) => (
                    <div key={reg.id} className="border border-slate-100 p-6 rounded-xl hover:border-slate-300 transition-all">
                        <div className="flex justify-between items-start mb-4 border-b border-slate-50 pb-4">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-red-700 font-bold text-sm">{reg.indicadores?.codigo_indicador}</span>
                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 uppercase">{reg.periodo}</span>
                                    <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${reg.cumple_meta ? 'text-green-600' : 'text-red-600'}`}>
                                        <div className={`w-2 h-2 rounded-full ${reg.cumple_meta ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                        {reg.cumple_meta ? 'Cumple' : 'No Cumple'}
                                    </span>
                                </div>
                                <h4 className="text-base font-bold text-slate-800">{reg.indicadores?.nombre_indicador}</h4>
                            </div>
                            <span className="bg-black text-white text-[9px] font-bold px-3 py-1 rounded-full uppercase">{reg.estado_registro}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div><span className="text-slate-400 font-bold uppercase block text-[9px]">Resultado:</span><span className="font-medium text-slate-700">{reg.resultado_mensual} (Meta: {reg.meta})</span></div>
                            <div><span className="text-slate-400 font-bold uppercase block text-[9px]">Acción:</span><span className="font-medium text-slate-700 truncate block">{reg.accion_mejora || 'Sin acción'}</span></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// UI HELPERS (No se tocaron)
const KpiCard = ({ title, value, icon, color, valColor = "text-slate-800", onClick }: any) => (
    <div onClick={onClick} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group">
        <div><p className="text-[11px] text-slate-500 font-bold mb-1 group-hover:text-slate-800">{title}</p><p className={`text-3xl font-bold ${valColor}`}>{value}</p></div>
        <div className={`p-3 rounded-lg text-white ${color} shadow-md group-hover:scale-110 transition-transform`}>{icon}</div>
    </div>
);

const LegendBox = ({ color, text, subtext }: any) => (
    <div className="flex items-center gap-4 p-4 border border-slate-100 rounded-lg bg-slate-50"><div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${color}`}>%</div><div><p className="text-xs font-bold text-slate-700">{text}</p><p className="text-[10px] text-slate-400 font-bold">{subtext}</p></div></div>
);

export default Dashboard;