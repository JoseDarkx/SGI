// Lo que envía el frontend para crear un usuario
export interface CrearUsuarioDTO {
  email: string;
  password: string;
  full_name: string;
  role: string;
  proceso_id?: string | null;
}

// Lo que envía el frontend para editar un usuario
export interface EditarUsuarioDTO {
  full_name?: string;
  role?: string;
  proceso_id?: string | null;
  password?: string; // opcional: solo si quiere cambiar contraseña
}