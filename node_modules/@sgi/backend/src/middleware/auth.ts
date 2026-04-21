import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';

export interface AuthRequest extends Request {
  user?: any;
}

/**
 * Middleware para autenticar usuarios mediante el JWT de Supabase
 */
export const authenticateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No se proporcionó un token de autorización válido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error('Error en autenticación:', error.message);
    res.status(500).json({ error: 'Error interno del servidor en autenticación' });
  }
};

/**
 * Middleware para asegurar que el usuario tenga el rol 'Administrador'
 * Debe ejecutarse después de authenticateUser
 */
export const authorizeAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: 'No se encontró el perfil del usuario' });
    }

    if (profile.role !== 'Administrador') {
      return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de Administrador' });
    }

    next();
  } catch (error: any) {
    console.error('Error en autorización:', error.message);
    res.status(500).json({ error: 'Error interno del servidor en autorización' });
  }
};
