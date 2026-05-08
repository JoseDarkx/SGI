import { useState, useCallback } from 'react';
import { indicadoresService } from '../services/indicadores.service';
import { Indicador } from '@shared/types';
import { useAuth } from '../context/AuthContext';

export const useIndicadores = () => {
  const { session } = useAuth();
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIndicadores = useCallback(async (procesoId?: string, isHierarchical: boolean = false) => {
    if (!session?.access_token) return;
    
    setLoading(true);
    try {
      // REFUERZO: Si el procesoId es el de SGI (padre), forzamos la carga jerárquica
      const esProcesoSGI = procesoId === 'd1aa17de-5003-4f65-a010-e3e81e3ec906';
      
      let data;
      if (procesoId) {
        data = (isHierarchical || esProcesoSGI)
          ? await indicadoresService.getPorProcesoPadre(session.access_token, procesoId)
          : await indicadoresService.getPorProceso(session.access_token, procesoId);
      } else {
        data = await indicadoresService.getAll(session.access_token);
      }
      setIndicadores(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error("Error al cargar indicadores:", err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  return { indicadores, loading, error, fetchIndicadores };
};