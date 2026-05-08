import { useState, useCallback } from 'react';
import { registrosService } from '../services/registros.service';
import { RegistroMensual } from '@shared/types';

export const useRegistros = () => {
  const [registros, setRegistros] = useState<RegistroMensual[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRegistrosFiltrados = useCallback(async (filtros: {
    procesoId?: string;
    indicadorId?: string;
    desde?: string;
    hasta?: string;
    esAdmin: boolean;
    userProcesoId?: string;
    isHierarchical?: boolean;
  }) => {
    setLoading(true);
    try {
      const data = await registrosService.getFiltrado(filtros);
      setRegistros(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error("Error al filtrar registros:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { registros, loading, error, fetchRegistrosFiltrados };
};