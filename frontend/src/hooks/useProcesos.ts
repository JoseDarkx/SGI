import { useState, useCallback } from 'react';
import { procesosService } from '../services/procesos.service';
import { Proceso } from '@shared/types';

export const useProcesos = () => {
  const [procesos, setProcesos] = useState<Proceso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProcesos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await procesosService.getAll();
      setProcesos(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error("Error al cargar procesos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { procesos, loading, error, fetchProcesos };
};