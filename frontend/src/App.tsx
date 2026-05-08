import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProfile } from '@shared/types';
import { LayoutGrid, ClipboardList, Building2, History, Settings, LogOut, FilePlus2 } from 'lucide-react';
import Swal from 'sweetalert2';

// --- IMPORTACIONES LAZY (CARGA PEREZOSA) ---
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MatrizIndicadores = lazy(() => import('./pages/MatrizIndicadores'));
const RegistroIndicadores = lazy(() => import('./pages/RegistroIndicadores'));
const Historico = lazy(() => import('./pages/Historico'));
const ProcesosView = lazy(() => import('./pages/ProcesosView'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

// Componente de Carga
const LoadingScreen = () => (
  <div className="h-full w-full min-h-[500px] flex flex-col items-center justify-center text-slate-400 gap-4">
    <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
    <span className="text-xs font-bold uppercase tracking-widest">Cargando...</span>
  </div>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs font-bold uppercase tracking-widest">Cargando Sur Company...</span>
    </div>
  );

  return (
    <Router>
      <Suspense fallback={<div className="h-screen w-screen bg-slate-900 flex items-center justify-center"><LoadingScreen /></div>}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/*" element={<ProtectedRoute />}>
            <Route index element={<Dashboard />} />
            <Route path="matriz" element={<MatrizIndicadores />} />
            <Route path="registro" element={<RegistroIndicadores />} />
            <Route path="procesos" element={<ProcesosView />} />
            <Route path="historico" element={<Historico />} />
            <Route path="admin" element={<AdminRoute />}>
              <Route index element={<AdminPanel />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
};

const AdminRoute: React.FC = () => {
  const { user } = useAuth();
  if (user?.role !== 'Administrador') return <Navigate to="/" replace />;
  return <Outlet />;
};

// Componente Protegido (¡Aquí está tu Navbar original!)
const ProtectedRoute: React.FC = () => {
  const location = useLocation();
  const { user, signOut, loading } = useAuth();

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#f3f4f6]">
      <LoadingScreen />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  const isAdmin = user.role === 'Administrador';

  return (
    <div className="flex flex-col min-h-screen bg-[#f3f4f6] font-sans">
      {/* HEADER */}
      <header className="bg-[#1e293b] text-white h-16 flex items-center justify-between px-8 shadow-md z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white overflow-hidden flex items-center justify-center border-2 border-white/20 shadow-lg flex-shrink-0">
            <img src="/logof.png" alt="Logo SUR COMPANY" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight leading-none uppercase">INDICADORES DE PROCESO</h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-[0.2em] uppercase">SUR COMPANY SAS</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">{user.full_name || 'Usuario'}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {user.role}
            </p>
          </div>

          <button
            onClick={async () => {
              const result = await Swal.fire({
                title: '¿Cerrar sesión?',
                text: 'Se cerrará tu sesión actual.',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#b91c1c',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Cancelar',
              });
              if (result.isConfirmed) signOut();
            }}
            className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200 px-8 py-2 shadow-sm sticky top-0 z-40">
        <nav className="flex justify-start gap-2 overflow-x-auto">
          <NavItem to="/" label={isAdmin || user.procesos?.nombre_proceso?.includes('Integral') ? 'Vista General' : 'Mi Vista'} icon={<LayoutGrid size={16} />} active={location.pathname === '/'} />
          {(isAdmin || user.procesos?.nombre_proceso?.includes('Integral')) && (
            <>
              <NavItem to="/matriz" label="Matriz de Indicadores" icon={<ClipboardList size={16} />} active={location.pathname === '/matriz'} />
              <NavItem to="/procesos" label="Procesos" icon={<Building2 size={16} />} active={location.pathname === '/procesos'} />
            </>
          )}
          {!isAdmin && <NavItem to="/registro" label="Registrar Indicador" icon={<FilePlus2 size={16} />} active={location.pathname === '/registro'} />}
          <NavItem to="/historico" label="Histórico" icon={<History size={16} />} active={location.pathname === '/historico'} />
          {isAdmin && <NavItem to="/admin" label="Configuración" icon={<Settings size={16} />} active={location.pathname === '/admin'} />}
        </nav>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-8 animate-in fade-in zoom-in-95 duration-300">
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ to: string; label: string; icon: React.ReactNode; active: boolean }> = ({ to, label, icon, active }) => (
  <Link to={to} className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${active ? 'bg-slate-900 text-white shadow-md transform scale-105' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
    {icon} <span>{label}</span>
  </Link>
);

export default App;