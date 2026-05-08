import { apiClient } from './api';
import { Indicador } from '@shared/types';

export const indicadoresService = {
  async getAll(token: string): Promise<Indicador[]> {
    return apiClient.get('/indicadores', token);
  },

  async getPorProceso(token: string, procesoId: string): Promise<Indicador[]> {
    return apiClient.get(`/indicadores/proceso/${procesoId}`, token);
  },
  
  async getPorProcesoPadre(token: string, padreId: string): Promise<Indicador[]> {
    return apiClient.get(`/indicadores/proceso-padre/${padreId}`, token);
  },

  async crear(token: string, indicador: Partial<Indicador>): Promise<Indicador> {
    return apiClient.post('/indicadores', token, indicador);
  },

  async actualizar(token: string, id: string, indicador: Partial<Indicador>): Promise<Indicador> {
    return apiClient.put(`/indicadores/${id}`, token, indicador);
  },

  async eliminar(token: string, id: string): Promise<void> {
    return apiClient.delete(`/indicadores/${id}`, token);
  },
};