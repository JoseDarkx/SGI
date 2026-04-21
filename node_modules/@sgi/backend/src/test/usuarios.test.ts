// ============================================================
// TESTS: Rutas de Usuarios — Lógica, Validaciones y Casos de Error
//
// Se prueban las 4 rutas CRUD de usuarios:
//   GET    /api/usuarios          → Listar todos los usuarios
//   DELETE /api/usuarios/:id      → Eliminar usuario (Auth + DB)
//   POST   /api/usuarios          → Crear usuario (Auth invite + perfil)
//   PUT    /api/usuarios/:id      → Actualizar usuario (Auth + perfil)
//
// Todos los accesos a Supabase y al middleware son mockeados.
// ============================================================

jest.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        deleteUser: jest.fn(),
        inviteUserByEmail: jest.fn(),
        updateUserById: jest.fn(),
      },
    },
    from: jest.fn(),
  },
}));

jest.mock('../middleware/auth', () => ({
  authenticateUser: jest.fn((_req: any, _res: any, next: any) => next()),
  authorizeAdmin:   jest.fn((_req: any, _res: any, next: any) => next()),
}));

import express from 'express';
import request from 'supertest';
import usuariosRouter from '../routes/usuarios';
import { supabaseAdmin } from '../lib/supabase';

// Montar app de prueba
const app = express();
app.use(express.json());
app.use('/api/usuarios', usuariosRouter);

// ------------------------------------
// Datos de prueba reutilizables
// ------------------------------------
const mockPerfiles = [
  {
    id: 'user-1',
    full_name: 'Ana García',
    role: 'Administrador',
    email: 'ana@sgi.com',
    proceso_id: null,
    procesos: null,
  },
  {
    id: 'user-2',
    full_name: 'Carlos López',
    role: 'Líder de Proceso',
    email: 'carlos@sgi.com',
    proceso_id: 'proc-1',
    procesos: { id: 'proc-1', nombre_proceso: 'Logística' },
  },
];

// ============================================================
// GRUPO 1: GET /api/usuarios
// ============================================================
describe('GET /api/usuarios', () => {
  beforeEach(() => jest.clearAllMocks());

  it('debe responder 200 con la lista de perfiles', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockPerfiles, error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).get('/api/usuarios');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].full_name).toBe('Ana García');
  });

  it('debe responder 500 si Supabase falla', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).get('/api/usuarios');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

// ============================================================
// GRUPO 2: DELETE /api/usuarios/:id
// ============================================================
describe('DELETE /api/usuarios/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('debe eliminar usuario en Auth y en DB — responde 200', async () => {
    (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({ error: null });
    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).delete('/api/usuarios/user-1');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('eliminado');
  });

  it('debe continuar y borrar perfil aunque Auth diga "User not found"', async () => {
    (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({
      error: { message: 'User not found' },
    });
    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).delete('/api/usuarios/user-huerfano');

    // El flujo debe continuar limpiando el perfil huérfano
    expect(res.status).toBe(200);
  });

  it('debe responder 500 si Auth falla con error real (no "User not found")', async () => {
    (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({
      error: { message: 'Internal server error' },
    });

    const res = await request(app).delete('/api/usuarios/user-1');

    expect(res.status).toBe(500);
  });

  it('debe responder 500 si falla el borrado en la tabla profiles', async () => {
    (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({ error: null });
    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: new Error('FK constraint') }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).delete('/api/usuarios/user-1');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

// ============================================================
// GRUPO 3: POST /api/usuarios (Crear)
// ============================================================
describe('POST /api/usuarios', () => {
  beforeEach(() => jest.clearAllMocks());

  const nuevoUsuario = {
    email: 'nuevo@sgi.com',
    password: 'pass1234',
    full_name: 'Nuevo Usuario',
    role: 'Líder de Proceso',
    proceso_id: 'proc-2',
    nombre_proceso: 'Gestión Humana',
  };

  it('debe crear usuario, invitar por email, y responder 201', async () => {
    (supabaseAdmin.auth.admin.inviteUserByEmail as jest.Mock).mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });
    (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({ error: null });
    const mockChain = {
      upsert: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).post('/api/usuarios').send(nuevoUsuario);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.userId).toBe('new-user-id');
  });

  it('debe responder 400 si faltan campos requeridos (email)', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .send({ full_name: 'Sin Email', role: 'Administrador' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('obligatorios');
  });

  it('debe responder 400 si faltan campos requeridos (full_name)', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .send({ email: 'sin-nombre@sgi.com', role: 'Administrador' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('obligatorios');
  });

  it('debe responder 400 si Supabase Auth falla al invitar', async () => {
    (supabaseAdmin.auth.admin.inviteUserByEmail as jest.Mock).mockResolvedValue({
      data: null,
      error: { message: 'rate limit exceeded' },
    });

    const res = await request(app).post('/api/usuarios').send(nuevoUsuario);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('invitación');
  });

  it('debe responder 400 si falla la inserción del perfil en DB', async () => {
    (supabaseAdmin.auth.admin.inviteUserByEmail as jest.Mock).mockResolvedValue({
      data: { user: { id: 'new-user-id' } },
      error: null,
    });
    (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({ error: null });
    const mockChain = {
      upsert: jest.fn().mockResolvedValue({ error: new Error('unique constraint violation') }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).post('/api/usuarios').send(nuevoUsuario);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('debe crear usuario sin proceso_id si proceso_id viene vacío', async () => {
    (supabaseAdmin.auth.admin.inviteUserByEmail as jest.Mock).mockResolvedValue({
      data: { user: { id: 'new-user-id-2' } },
      error: null,
    });
    (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({ error: null });
    const mockChain = {
      upsert: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app)
      .post('/api/usuarios')
      .send({ ...nuevoUsuario, proceso_id: '' });

    expect(res.status).toBe(201);
    // El upsert se llamó con proceso_id: null
    expect(mockChain.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ proceso_id: null }),
      ])
    );
  });
});

// ============================================================
// GRUPO 4: PUT /api/usuarios/:id (Actualizar)
// ============================================================
describe('PUT /api/usuarios/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('debe actualizar Auth y perfil — responde 200 con user', async () => {
    const usuarioActualizado = { ...mockPerfiles[1], role: 'Administrador' };
    (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
      data: { user: usuarioActualizado },
      error: null,
    });
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app)
      .put('/api/usuarios/user-2')
      .send({ email: 'carlos@sgi.com', full_name: 'Carlos López', role: 'Administrador', proceso_id: 'proc-1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('Administrador');
  });

  it('debe actualizar contraseña si se envía en el body', async () => {
    (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
      data: { user: mockPerfiles[0] },
      error: null,
    });
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app)
      .put('/api/usuarios/user-1')
      .send({ email: 'ana@sgi.com', full_name: 'Ana García', role: 'Administrador', password: 'nueva123' });

    expect(res.status).toBe(200);
    // Verifica que se pasó la contraseña a Auth
    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ password: 'nueva123' })
    );
  });

  it('NO debe incluir password si se envía vacío', async () => {
    (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
      data: { user: mockPerfiles[0] },
      error: null,
    });
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    await request(app)
      .put('/api/usuarios/user-1')
      .send({ email: 'ana@sgi.com', full_name: 'Ana García', role: 'Administrador', password: '   ' });

    // El password vacío (solo espacios) NO debe incluirse en el payload
    expect(supabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith(
      'user-1',
      expect.not.objectContaining({ password: expect.anything() })
    );
  });

  it('debe responder 500 si Auth falla al actualizar', async () => {
    (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
      data: null,
      error: new Error('Auth error'),
    });

    const res = await request(app)
      .put('/api/usuarios/user-1')
      .send({ email: 'ana@sgi.com', full_name: 'Ana García', role: 'Administrador' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('debe responder 500 si DB falla al actualizar perfil', async () => {
    (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
      data: { user: mockPerfiles[0] },
      error: null,
    });
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: new Error('DB constraint') }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app)
      .put('/api/usuarios/user-1')
      .send({ email: 'ana@sgi.com', full_name: 'Ana García', role: 'Administrador' });

    expect(res.status).toBe(500);
  });
});
