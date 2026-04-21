import { Proceso } from './proceso';
export type UserRole = 'Administrador' | 'Líder de Proceso';

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role: UserRole;
  proceso_id?: string | null;
  status?: 'Activo' | 'Inactivo';
  procesos?: Proceso; // Nota: marcaremos error aquí hasta que exista proceso.ts
}