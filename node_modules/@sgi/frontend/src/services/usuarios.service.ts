import { apiClient } from './api';
import { UserProfile } from '@shared/types';
import { CrearUsuarioDTO, EditarUsuarioDTO } from '@shared/dtos/usuario.dto';

export const usuariosService = {
  async listar(token: string): Promise<UserProfile[]> {
    return apiClient.get('/usuarios', token);
  },

  async crear(token: string, data: CrearUsuarioDTO): Promise<{ success: boolean; userId: string }> {
    return apiClient.post('/usuarios', token, data);
  },

  async editar(token: string, id: string, data: EditarUsuarioDTO): Promise<{ success: boolean }> {
    return apiClient.put(`/usuarios/${id}`, token, data);
  },

  async eliminar(token: string, id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/usuarios/${id}`, token);
  },
}; 