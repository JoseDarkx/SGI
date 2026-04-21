// ============================================================
// TESTS: Rutas de Indicadores — Lógica y Validaciones
//
// Probar que las rutas respondan correctamente según el rol
// del usuario. Todos los accesos a Supabase son mockeados.
// ============================================================

jest.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('../middleware/auth', () => ({
  authenticateUser: jest.fn((_req: any, _res: any, next: any) => next()),
  authorizeAdmin: jest.fn((_req: any, _res: any, next: any) => next()),
}));

import express from 'express';
import request from 'supertest';
import indicadoresRouter from '../routes/indicadores';
import { supabaseAdmin } from '../lib/supabase';

// Montar app de prueba
const app = express();
app.use(express.json());
app.use('/api/indicadores', indicadoresRouter);

const mockIndicadores = [
  {
    id: 'ind-1',
    codigo_indicador: 'LOG-001',
    nombre_indicador: 'Entregas a Tiempo',
    meta: 95,
    umbral_verde: 90,
    umbral_amarillo: 75,
    estado: 'Activo',
    proceso_id: 'proc-1',
  },
  {
    id: 'ind-2',
    codigo_indicador: 'GH-001',
    nombre_indicador: 'Rotación de Personal',
    meta: 5,
    umbral_verde: 5,
    umbral_amarillo: 8,
    estado: 'Activo',
    proceso_id: 'proc-2',
  },
];

// ============================================================
// GRUPO 1: GET /api/indicadores
// ============================================================
describe('GET /api/indicadores', () => {
  beforeEach(() => jest.clearAllMocks());

  it('debe responder 200 con la lista de indicadores', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockIndicadores, error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).get('/api/indicadores');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].codigo_indicador).toBe('LOG-001');
  });

  it('debe responder 500 si Supabase falla', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB Error') }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).get('/api/indicadores');

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});

// ============================================================
// GRUPO 2: GET /api/indicadores/proceso/:procesoId
// ============================================================
describe('GET /api/indicadores/proceso/:procesoId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('debe devolver solo los indicadores del proceso', async () => {
    const filtrados = mockIndicadores.filter(i => i.proceso_id === 'proc-1');
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      // Segundo eq devuelve la promesa
    };
    // El segundo .eq() resuelve con datos
    mockChain.eq
      .mockReturnValueOnce(mockChain)
      .mockResolvedValueOnce({ data: filtrados, error: null });

    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).get('/api/indicadores/proceso/proc-1');

    expect(res.status).toBe(200);
  });
});

// ============================================================
// GRUPO 3: POST /api/indicadores (Crear)
// ============================================================
describe('POST /api/indicadores', () => {
  beforeEach(() => jest.clearAllMocks());

  it('debe crear un indicador y responder 201', async () => {
    const nuevoIndicador = {
      codigo_indicador: 'COM-001',
      nombre_indicador: 'Satisfacción del Cliente',
      meta: 85,
      umbral_verde: 85,
      umbral_amarillo: 70,
      estado: 'Activo',
      proceso_id: 'proc-3',
    };

    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'new-id', ...nuevoIndicador }, error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app)
      .post('/api/indicadores')
      .send(nuevoIndicador);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 'new-id');
    expect(res.body.nombre_indicador).toBe('Satisfacción del Cliente');
  });

  it('debe responder 400 si hay error de validación en BD', async () => {
    const mockChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: new Error('Duplicate key') }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app)
      .post('/api/indicadores')
      .send({ codigo_indicador: 'LOG-001' }); // ya existe

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

// ============================================================
// GRUPO 4: PUT /api/indicadores/:id (Actualizar)
// ============================================================
describe('PUT /api/indicadores/:id', () => {
  it('debe actualizar el indicador y responder 200', async () => {
    const actualizado = { ...mockIndicadores[0], meta: 98 };
    const mockChain = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: actualizado, error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app)
      .put('/api/indicadores/ind-1')
      .send({ meta: 98 });

    expect(res.status).toBe(200);
    expect(res.body.meta).toBe(98);
  });
});

// ============================================================
// GRUPO 5: DELETE /api/indicadores/:id
// ============================================================
describe('DELETE /api/indicadores/:id', () => {
  it('debe eliminar el indicador y responder 200 con mensaje', async () => {
    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).delete('/api/indicadores/ind-1');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('eliminado');
  });

  it('debe responder 500 si falla la eliminación', async () => {
    const mockChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: new Error('FK constraint') }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const res = await request(app).delete('/api/indicadores/ind-inexistente');

    expect(res.status).toBe(500);
  });
});
