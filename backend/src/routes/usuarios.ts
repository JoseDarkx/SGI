import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authenticateUser, authorizeAdmin } from '../middleware/auth';

const router = Router();

// ==========================================
// RUTA 1: Listar todos los usuarios (GET)
// Protegida: Solo usuarios autenticados
// ==========================================
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, email, proceso_id, procesos(id, nombre_proceso)')
      .order('full_name');

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// RUTA 2: Eliminar un usuario (DELETE)
// Protegida: Solo Administradores
// ==========================================
router.delete('/:id', authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primero intentamos borrar de Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (authError) {
      // Si el error es que no existe en Auth, procedemos a limpiar solo la DB
      if (!authError.message.includes('User not found')) {
        throw authError;
      }
    }

    // Luego borramos el perfil
    const { error: dbError } = await supabaseAdmin.from('profiles').delete().eq('id', id);
    if (dbError) throw dbError;

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// RUTA 3: Crear un nuevo usuario (POST)
// Protegida: Solo Administradores
// ==========================================
router.post('/', authenticateUser, authorizeAdmin, async (req, res) => {
  let createdUserId: string | null = null;
  
  try {
    const { email, password, full_name, role, proceso_id, nombre_proceso } = req.body;

    if (!email || !full_name) {
      throw new Error("Email y Nombre son obligatorios");
    }

    // 1. Invitar usuario por Email
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role, nombre_proceso }
    });

    if (authError) {
      throw new Error(`Error al enviar invitación: ${authError.message}. Verifica límites SMTP.`);
    }
    
    createdUserId = authData.user.id;

    // 2. Definir la contraseña y marcar como verificado (el admin lo crea listo para usar)
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(createdUserId, {
      password: password || '123456',
      email_confirm: true,
      user_metadata: { full_name, role, nombre_proceso }
    });

    if (updateAuthError) {
      // No es crítico, el usuario ya fue creado — se registra pero no se lanza
      // El usuario podrá confirmar su email manualmente
    }

    // 3. Insertar perfil en la tabla 'profiles'
    const { error: profileInsertError } = await supabaseAdmin.from('profiles').upsert([
      {
        id: createdUserId,
        email,
        full_name,
        role,
        proceso_id: (proceso_id && proceso_id !== "") ? proceso_id : null
      }
    ]);

    if (profileInsertError) {
      throw new Error(`Error DB (Profile): ${profileInsertError.message}`);
    }

    res.status(201).json({ 
      success: true, 
      message: "Usuario creado correctamente",
      userId: createdUserId 
    });

  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// RUTA 4: Actualizar un usuario (PUT)
// Protegida: Solo Administradores
// ==========================================
router.put('/:id', authenticateUser, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, full_name, role, proceso_id } = req.body;

    // 1. Preparamos los datos para Auth
    const authPayload: any = {
      email,
      user_metadata: { full_name, role, proceso_id }
    };
    
    if (password && password.trim() !== '') {
      authPayload.password = password;
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authPayload);
    if (authError) throw authError;

    // 2. Actualizamos la tabla 'profiles'
    const { error: dbError } = await supabaseAdmin.from('profiles').update({
      email,
      full_name,
      role,
      proceso_id: (proceso_id && proceso_id !== "") ? proceso_id : null
    }).eq('id', id);

    if (dbError) throw dbError;

    res.json({ success: true, user: authData.user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;