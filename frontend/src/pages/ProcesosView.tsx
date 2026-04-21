import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TipoProceso, Proceso } from '@shared/types';
import { Building2, Layers, ShieldCheck, HelpCircle, X, ArrowRight, Activity } from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useProcesos } from '../hooks/useProcesos';
import { useIndicadores } from '../hooks/useIndicadores';
import { useRegistros } from '../hooks/useRegistros';

const ProcesosView: React.FC = () => {
  const { user } = useAuth();
  
  const { procesos, loading: loadingProc, fetchProcesos } = useProcesos();
  const { indicadores, loading: loadingInd, fetchIndicadores } = useIndicadores();
  const { registros, loading: loadingReg, fetchRegistrosFiltrados } = useRegistros();
  
  const [selectedProceso, setSelectedProceso] = useState<Proceso | null>(null);

  useEffect(() => {
    fetchProcesos();
    fetchIndicadores();
    fetchRegistrosFiltrados({
      esAdmin: user?.role === 'Administrador',
      userProcesoId: user?.proceso_id || undefined
    });
  }, [fetchProcesos, fetchIndicadores, fetchRegistrosFiltrados, user]);

  const renderGroup = (tipo: TipoProceso) => {
    const group = procesos.filter((p: any) => p.tipo_proceso === tipo);
    if (group.length === 0) return null;

    return (
      <div className="mb-10">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
          {tipo === 'Estratégico' && <ShieldCheck size={18} className="text-purple-600" />}
          {tipo === 'Misional' && <Layers size={18} className="text-blue-600" />}
          {tipo === 'Apoyo' && <HelpCircle size={18} className="text-emerald-600" />}
          Procesos {tipo}s
          <span className="ml-2 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">{group.length}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {group.map((p: any) => {
            const processIndicators = indicadores.filter((i: any) => i.proceso_id === p.id);
            const totalIndicadores = processIndicators.length;

            let cumplenMetaCount = 0;
            let tienenDatosCount = 0;

            processIndicators.forEach((ind: any) => {
              // Corrección segura ignorando los borradores
              const lastReg = registros.find((r: any) => r.indicador_id === ind.id && r.estado_registro !== 'Borrador');
              if (lastReg) {
                tienenDatosCount++;
                if (lastReg.cumple_meta) cumplenMetaCount++;
              }
            });

            let borderColorClass = 'border-slate-200 border'; 
            let stripColorClass = 'bg-slate-300';
            let textColorClass = 'text-slate-500';

            if (tienenDatosCount > 0) {
              const proporcion = cumplenMetaCount / tienenDatosCount;
              if (proporcion === 1) {
                borderColorClass = 'border-green-500 border-2 shadow-sm shadow-green-100';
                stripColorClass = 'bg-green-500';
                textColorClass = 'text-green-600';
              } else if (proporcion >= 0.5) {
                borderColorClass = 'border-yellow-400 border-2 shadow-sm shadow-yellow-100';
                stripColorClass = 'bg-yellow-400';
                textColorClass = 'text-yellow-600';
              } else {
                borderColorClass = 'border-red-500 border-2 shadow-sm shadow-red-100';
                stripColorClass = 'bg-red-500';
                textColorClass = 'text-red-600';
              }
            }

            const progresoVisual = totalIndicadores > 0 ? Math.round((cumplenMetaCount / totalIndicadores) * 100) : 0;

            return (
              <div key={p.id} onClick={() => setSelectedProceso(p)} className={`bg-white rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all group cursor-pointer ${borderColorClass}`}>
                <div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase tracking-wider">{p.codigo_proceso}</span>
                  <h4 className="text-lg font-bold text-slate-800 mt-2 mb-4 group-hover:text-red-700 transition-colors">{p.nombre_proceso}</h4>

                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Estado de Metas</p>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-3xl font-black leading-none ${textColorClass}`}>{cumplenMetaCount}</span>
                        <span className="text-xs font-bold text-slate-400 uppercase">de {totalIndicadores} cumplen</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${stripColorClass}`} style={{ width: `${progresoVisual}%` }}></div>
                  </div>

                  <div className="flex gap-4 mt-4 pt-4 border-t border-slate-50 justify-between items-center">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-[10px] text-slate-400 font-bold">Verde</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400"></div><span className="text-[10px] text-slate-400 font-bold">Amarillo</span></div>
                    </div>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const isLoading = loadingProc || loadingInd || loadingReg;

  if (isLoading) return <div className="h-screen flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">Cargando Procesos...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-[#b91c1c] to-[#0f172a] rounded-2xl p-8 text-white shadow-lg flex items-center gap-6 relative overflow-hidden">
        <div className="relative z-10"><h2 className="text-3xl font-bold tracking-tight mb-1">Procesos</h2><p className="text-red-100 text-sm font-medium opacity-90">Vista consolidada por proceso empresarial</p></div>
        <Building2 size={48} className="absolute right-10 top-1/2 -translate-y-1/2 text-white/10" />
      </div>
      <div>{renderGroup('Estratégico')}{renderGroup('Misional')}{renderGroup('Apoyo')}</div>
      {selectedProceso && (
        <ProcessModal
          proceso={selectedProceso}
          indicadores={indicadores.filter((i: any) => i.proceso_id === selectedProceso.id)}
          registros={registros.filter((r: any) => r.proceso_id === selectedProceso.id)}
          onClose={() => setSelectedProceso(null)}
        />
      )}
    </div>
  );
};

const ProcessModal = ({ proceso, indicadores, registros, onClose }: any) => {
  const navigate = useNavigate();
  const goToHistory = (indicadorNombre: string) => {
    navigate('/historico', { state: { filterProceso: proceso.nombre_proceso, filterIndicador: indicadorNombre } });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
          <div><span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-1 rounded uppercase tracking-wider">{proceso.codigo_proceso}</span><h3 className="text-xl font-bold text-slate-900 mt-2">{proceso.nombre_proceso}</h3></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Indicadores Asociados ({indicadores.length})</p>
          {indicadores.length === 0 ? <div className="text-center p-8 border-2 border-dashed border-slate-100 rounded-xl text-slate-400 text-sm">No hay indicadores.</div> :
            indicadores.map((ind: any) => {
              // Corrección segura ignorando los borradores en el modal
              const lastReg = registros.find((r: any) => r.indicador_id === ind.id && r.estado_registro !== 'Borrador');
              return (
                <div key={ind.id} onClick={() => goToHistory(ind.nombre_indicador)} className="border border-slate-100 rounded-xl p-4 hover:shadow-md hover:border-red-100 transition-all cursor-pointer group flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-red-50 p-3 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors"><Activity size={18} /></div>
                    <div><p className="font-bold text-slate-800 text-sm group-hover:text-red-700 transition-colors">{ind.nombre_indicador}</p><div className="flex gap-3 mt-1"><span className="text-[10px] text-slate-400 font-bold uppercase bg-slate-50 px-1.5 rounded border border-slate-100">{ind.codigo_indicador}</span><span className="text-[10px] text-slate-400 font-bold uppercase">Meta: {ind.meta}</span></div></div>
                  </div>
                  <div className="text-right">
                    {lastReg ? <><span className="block text-lg font-black text-slate-900">{lastReg.resultado_mensual}</span><span className={`text-[9px] font-bold uppercase ${lastReg.cumple_meta ? 'text-green-600' : 'text-red-600'}`}>{lastReg.cumple_meta ? 'Cumple' : 'No Cumple'}</span></> : <span className="text-[10px] font-bold text-slate-300 uppercase">Sin datos</span>}
                  </div>
                </div>
              );
            })
          }
        </div>
        <div className="bg-slate-50 p-4 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-100">Clic en un indicador para ver su historial detallado</div>
      </div>
    </div>
  );
};

export default ProcesosView;