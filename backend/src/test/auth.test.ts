// ============================================================
// TESTS: Middleware de Autenticación y Autorización
//
// Probamos la LÓGICA de los middlewares sin llamar a Supabase real.
// Usamos jest.mock() para simular las respuestas de Supabase.
// ============================================================

// --- Mocks de dependencias externas ---
jest.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

import { Request, Response, NextFunction } from 'express';
import { authenticateUser, authorizeAdmin, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

// Helper para crear mocks de Request/Response
const mockReq = (headers: Record<string, string> = {}): Partial<AuthRequest> => ({
  headers,
});

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

// ============================================================
// GRUPO 1: authenticateUser
// ============================================================
describe('authenticateUser middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('debe devolver 401 si no hay cabecera Authorization', async () => {
    const req = mockReq({});
    const res = mockRes();

    await authenticateUser(req as AuthRequest, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('token') })
    );
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debe devolver 401 si la cabecera no empieza con "Bearer "', async () => {
    const req = mockReq({ authorization: 'Token abc123' });
    const res = mockRes();

    await authenticateUser(req as AuthRequest, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debe devolver 401 si Supabase dice que el token es inválido', async () => {
    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null },
      error: new Error('Token expirado'),
    });

    const req = mockReq({ authorization: 'Bearer token.invalido' });
    const res = mockRes();

    await authenticateUser(req as AuthRequest, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debe llamar a next() si el token es válido', async () => {
    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: 'user-uuid-1', email: 'test@sgi.com' } },
      error: null,
    });

    const req = mockReq({ authorization: 'Bearer token.valido.jwt' });
    const res = mockRes();
    const next = jest.fn();

    await authenticateUser(req as AuthRequest, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect((req as AuthRequest).user).toBeDefined();
    expect((req as AuthRequest).user.id).toBe('user-uuid-1');
  });
});

// ============================================================
// GRUPO 2: authorizeAdmin
// ============================================================
describe('authorizeAdmin middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('debe devolver 401 si no hay usuario en req (no autenticado)', async () => {
    const req: Partial<AuthRequest> = { user: undefined };
    const res = mockRes();
    const next = jest.fn();

    await authorizeAdmin(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('debe devolver 403 si el usuario existe pero NO es Administrador', async () => {
    // Mock: el perfil tiene role = 'Líder de Proceso'
    const mockChain = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { role: 'Líder de Proceso' },
        error: null,
      }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const req: Partial<AuthRequest> = { user: { id: 'user-1' } };
    const res = mockRes();
    const next = jest.fn();

    await authorizeAdmin(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('debe llamar a next() si el usuario es Administrador', async () => {
    const mockChain = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { role: 'Administrador' },
        error: null,
      }),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const req: Partial<AuthRequest> = { user: { id: 'admin-1' } };
    const res = mockRes();
    const next = jest.fn();

    await authorizeAdmin(req as AuthRequest, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('debe devolver 500 si supabase lanza una excepción inesperada', async () => {
    // Simulamos un error de red / excepción en tiempo de ejecución
    const mockChain = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockRejectedValue(new Error('Network error')),
    };
    (supabaseAdmin.from as jest.Mock).mockReturnValue(mockChain);

    const req: Partial<AuthRequest> = { user: { id: 'user-error' } };
    const res = mockRes();
    const next = jest.fn();

    await authorizeAdmin(req as AuthRequest, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Error interno') })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
