"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// ==========================================
// RUTA 1: Listar todos los indicadores (GET)
// Accesible para todos los autenticados (pero solo lectura)
// ==========================================
router.get('/', auth_1.authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('indicadores')
            .select('id, codigo_indicador, nombre_indicador, tipo_indicador, estado, descripcion, meta, unidad_medida, frecuencia, umbral_verde, umbral_amarillo, umbral_rojo, formula_calculo, proceso_id, procesos(id, nombre_proceso)')
            .order('codigo_indicador');
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error("Error al listar indicadores:", error);
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// RUTA 2: Listar indicadores por proceso (GET)
// ==========================================
router.get('/proceso/:procesoId', auth_1.authenticateUser, async (req, res) => {
    try {
        const { procesoId } = req.params;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('indicadores')
            .select('id, codigo_indicador, nombre_indicador, meta, unidad_medida, frecuencia, umbral_verde, umbral_amarillo, umbral_rojo, descripcion, formula_calculo, proceso_id')
            .eq('proceso_id', procesoId)
            .eq('estado', 'Activo');
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error("Error al listar indicadores por proceso:", error);
        res.status(500).json({ error: error.message });
    }
});
// ==========================================
// RUTA 3: Crear indicador (POST)
// Protegida: Solo Administradores
// ==========================================
router.post('/', auth_1.authenticateUser, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const indicador = req.body;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('indicadores')
            .insert([indicador])
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json(data);
    }
    catch (error) {
        console.error("Error al crear indicador:", error);
        res.status(400).json({ error: error.message });
    }
});
// ==========================================
// RUTA 4: Actualizar indicador (PUT)
// Protegida: Solo Administradores
// ==========================================
router.put('/:id', auth_1.authenticateUser, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const indicador = req.body;
        const { data, error } = await supabase_1.supabaseAdmin
            .from('indicadores')
            .update(indicador)
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (error) {
        console.error("Error al actualizar indicador:", error);
        res.status(400).json({ error: error.message });
    }
});
// ==========================================
// RUTA 5: Eliminar indicador (DELETE)
// Protegida: Solo Administradores
// ==========================================
router.delete('/:id', auth_1.authenticateUser, auth_1.authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase_1.supabaseAdmin.from('indicadores').delete().eq('id', id);
        if (error)
            throw error;
        res.json({ message: 'Indicador eliminado correctamente' });
    }
    catch (error) {
        console.error("Error al eliminar indicador:", error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
