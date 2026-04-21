import { useState, useCallback } from 'react';
import { indicadoresService } from '../services/indicadores.service';
import { Indicador } from '@shared/types';
import { useAuth } from '../context/AuthContext';

export const useIndicadores = () => {
  const { session } = useAuth();
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIndicadores = useCallback(async (procesoId?: string) => {
    if (!session?.access_token) return;
    
    setLoading(true);
    try {
      const data = procesoId 
        ? await indicadoresService.getPorProceso(session.access_token, procesoId)
        : await indicadoresService.getAll(session.access_token);
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