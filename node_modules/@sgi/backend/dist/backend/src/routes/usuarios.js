"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ==========================================
// RUTA 1: Listar todos los usuarios (GET)
// Protegida: Solo usuarios autenticados
// ==========================================
router.get('/', auth_1.authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('profiles')
            .select('id, full_name, role, email, proceso_id, procesos(id, nombre_proceso)')
            .order('full_name');
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error("Error al listar usuarios:", error);
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// RUTA 2: Eliminar un usuario (DELETE)
// Protegida: Solo Administradores
// ==========================================
router.delete('/:id', auth_1.authenticateUser, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Primero intentamos borrar de Auth
        const { error: authError } = await supabase_1.supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) {
            // Si el error es que no existe, procedemos a limpiar la DB
            if (authError.message.includes('User not found')) {
                console.warn("Usuario no encontrado en Auth, procediendo a borrar perfil DB...");
            }
            else {
                throw authError;
            }
        }
        // Luego borramos el perfil
        const { error: dbError } = await supabase_1.supabaseAdmin.from('profiles').delete().eq('id', id);
        if (dbError)
            throw dbError;
        res.json({ message: 'Usuario eliminado correctamente' });
    }
    catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// RUTA 3: Crear un nuevo usuario (POST)
// Protegida: Solo Administradores
// ==========================================
router.post('/', auth_1.authenticateUser, auth_1.authorizeAdmin, async (req, res) => {
    let createdUserId = null;
    try {
        const { email, password, full_name, role, proceso_id, nombre_proceso } = req.body;
        console.log(`CREAR-USUARIO: Iniciando proceso para ${email}`);
        if (!email || !full_name) {
            throw new Error("Email y Nombre son obligatorios");
        }
        // 1. Invitar usuario por Email
        console.log("Enviando invitación por email...");
        const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: { full_name, role, nombre_proceso }
        });
        if (authError) {
            console.error(`Error Auth (Invitation): ${authError.message}`);
            throw new Error(`Error al enviar invitación: ${authError.message}. Verifica límites SMTP.`);
        }
        createdUserId = authData.user.id;
        console.log(`Usuario invitado exitosamente. ID: ${createdUserId}`);
        // 2. Definir la contraseña y marcar como verificado (el admin lo crea listo para usar)
        console.log("Asignando contraseña inicial y confirmando email...");
        const { error: updateAuthError } = await supabase_1.supabaseAdmin.auth.admin.updateUserById(createdUserId, {
            password: password || '123456',
            email_confirm: true,
            user_metadata: { full_name, role, nombre_proceso }
        });
        if (updateAuthError) {
            console.warn("Aviso: No se pudo auto-confirmar el usuario:", updateAuthError.message);
        }
        // 3. Insertar perfil en la tabla 'profiles'
        console.log("Creando registro en tabla de perfiles...");
        const { error: profileInsertError } = await supabase_1.supabaseAdmin.from('profiles').upsert([
            {
                id: createdUserId,
                email,
                full_name,
                role,
                proceso_id: (proceso_id && proceso_id !== "") ? proceso_id : null
            }
        ]);
        if (profileInsertError) {
            console.error("Error al insertar perfil:", profileInsertError.message);
            // OPTIONAL: Rollback user in Auth if profile creation fails?
            // await supabaseAdmin.auth.admin.deleteUser(createdUserId);
            throw new Error(`Error DB (Profile): ${profileInsertError.message}`);
        }
        console.log("Usuario creado y perfil sincronizado correctamente.");
        res.status(201).json({
            success: true,
            message: "Usuario creado correctamente",
            userId: createdUserId
        });
    }
    catch (error) {
        console.error("Error en crear-usuario:", error.message);
        res.status(400).json({ error: error.message });
    }
});
// ==========================================
// RUTA 4: Actualizar un usuario (PUT)
// Protegida: Solo Administradores
// ==========================================
router.put('/:id', auth_1.authenticateUser, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, full_name, role, proceso_id } = req.body;
        // 1. Preparamos los datos para Auth
        const authPayload = {
            email,
            user_metadata: { full_name, role, proceso_id }
        };
        if (password && password.trim() !== '') {
            authPayload.password = password;
        }
        const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.admin.updateUserById(id, authPayload);
        if (authError)
            throw authError;
        // 2. Actualizamos la tabla 'profiles'
        const { error: dbError } = await supabase_1.supabaseAdmin.from('profiles').update({
            email,
            full_name,
            role,
            proceso_id: (proceso_id && proceso_id !== "") ? proceso_id : null
        }).eq('id', id);
        if (dbError)
            throw dbError;
        res.json({ success: true, user: authData.user });
    }
    catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
