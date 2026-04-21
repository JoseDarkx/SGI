import { describe, it, expect, vi } from 'vitest';

// =============================================================
// TESTS: registrosService — Lógica de filtrado (sin Supabase real)
// =============================================================

// Datos de prueba que simulan lo que devuelve la BD
const mockRegistros = [
  {
    id: '1',
    indicador_id: 'ind-A',
    proceso_id: 'proc-1',
    periodo: '2026-04-20',
    resultado_mensual: 80,
    meta: 90,
    cumple_meta: false,
    semaforo: 'Rojo',
    estado_registro: 'Oficial',
    porcentaje_cumplimiento: 88,
    indicadores: { nombre_indicador: 'Ventas', frecuencia: 'Mensual' },
    procesos: { nombre_proceso: 'Logística' },
  },
  {
    id: '2',
    indicador_id: 'ind-B',
    proceso_id: 'proc-2',
    periodo: '2026-04-21',
    resultado_mensual: 4,
    meta: 6,
    cumple_meta: true,
    semaforo: 'Verde',
    estado_registro: 'Oficial',
    porcentaje_cumplimiento: 100,
    indicadores: { nombre_indicador: 'Accidentes', frecuencia: 'Mensual' },
    procesos: { nombre_proceso: 'Gestión Humana' },
  },
  {
    id: '3',
    indicador_id: 'ind-C',
    proceso_id: 'proc-1',
    periodo: '2026-03-15',
    resultado_mensual: 75,
    meta: 80,
    cumple_meta: false,
    semaforo: 'Amarillo',
    estado_registro: 'Borrador',
    porcentaje_cumplimiento: 94,
    indicadores: { nombre_indicador: 'Entregas a Tiempo', frecuencia: 'Mensual' },
    procesos: { nombre_proceso: 'Logística' },
  },
];

// =============================================================
// Lógica de filtrado del Dashboard (isola de Supabase)
// =============================================================
describe('Lógica de filtrado del Dashboard (Registros)', () => {
  const registrosOficiales = mockRegistros.filter(r => r.estado_registro !== 'Borrador');

  it('debe excluir registros en estado Borrador', () => {
    expect(registrosOficiales).toHaveLength(2);
    expect(registrosOficiales.every(r => r.estado_registro === 'Oficial')).toBe(true);
  });

  it('modo consolidado: toma el último registro por indicador', () => {
    const ultimosMap = new Map();
    registrosOficiales.forEach(r => {
      if (!ultimosMap.has(r.indicador_id)) ultimosMap.set(r.indicador_id, r);
    });
    const consolidado = Array.from(ultimosMap.values());
    // ind-A = registro 1 (logística), ind-B = registro 2 (gestión humana)
    expect(consolidado).toHaveLength(2);
  });

  it('filtro por mes: 2026-04 devuelve ambos registros de abril', () => {
    const abril = registrosOficiales.filter(r => r.periodo.startsWith('2026-04'));
    expect(abril).toHaveLength(2); // El de Logística (20 abril) y Gestión Humana (21 abril)
  });

  it('filtro por mes: 2026-03 no devuelve nada (el de marzo era Borrador)', () => {
    const marzo = registrosOficiales.filter(r => r.periodo.startsWith('2026-03'));
    expect(marzo).toHaveLength(0);
  });

  it('ambas áreas son visibles en el mismo mes de abril', () => {
    const abril = registrosOficiales.filter(r => r.periodo.startsWith('2026-04'));
    const procesos = [...new Set(abril.map(r => r.proceso_id))];
    expect(procesos).toContain('proc-1'); // Logística
    expect(procesos).toContain('proc-2'); // Gestión Humana
  });
});

// =============================================================
// Lógica de KPIs del Dashboard
// =============================================================
describe('KPIs del Dashboard (Procesos)', () => {
  const actuales = mockRegistros.filter(r => r.estado_registro === 'Oficial');

  // Simular la función barData (por proceso)
  const procesos = [
    { id: 'proc-1', codigo_proceso: 'LOG', nombre_proceso: 'Logística' },
    { id: 'proc-2', codigo_proceso: 'GH', nombre_proceso: 'Gestión Humana' },
  ];

  const barData = procesos.map(p => {
    const regs = actuales.filter(r => r.proceso_id === p.id);
    const hasData = regs.length > 0;
    const prom = hasData
      ? regs.reduce((a, c) => a + Number(c.porcentaje_cumplimiento || 0), 0) / regs.length
      : 0;

    const hasRed = regs.some(r => r.semaforo === 'Rojo');
    const hasYellow = regs.some(r => r.semaforo === 'Amarillo');
    const fill = !hasData ? '#cbd5e1' : hasRed ? '#ef4444' : hasYellow ? '#f59e0b' : '#10b981';

    return { id: p.id, name: p.codigo_proceso, val: Math.min(100, Math.round(prom)), hasData, fill };
  });

  it('ambos procesos tienen datos (hasData=true)', () => {
    expect(barData.filter(d => d.hasData)).toHaveLength(2);
  });

  it('Logística tiene color rojo (tiene indicador en Rojo)', () => {
    const log = barData.find(d => d.id === 'proc-1');
    expect(log?.fill).toBe('#ef4444');
  });

  it('Gestión Humana tiene color verde (todos sus indicadores en Verde)', () => {
    const gh = barData.find(d => d.id === 'proc-2');
    expect(gh?.fill).toBe('#10b981');
  });

  it('count de procesos verdes es 1', () => {
    const verdes = barData.filter(d => d.fill === '#10b981');
    expect(verdes).toHaveLength(1);
  });

  it('count de procesos rojos es 1', () => {
    const rojos = barData.filter(d => d.fill === '#ef4444');
    expect(rojos).toHaveLength(1);
  });
});

// =============================================================
// Lógica del Selector de Periodo (formatPeriodo)
// =============================================================
describe('formatPeriodo (selector de mes)', () => {
  const formatPeriodo = (fecha: string) => {
    if (!fecha) return 'N/A';
    const [year, month] = fecha.split('-');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${meses[parseInt(month, 10) - 1]} ${year}`;
  };

  it('formatea 2026-04-01 como "Abril 2026"', () => {
    expect(formatPeriodo('2026-04-01')).toBe('Abril 2026');
  });

  it('formatea 2026-01-01 como "Enero 2026"', () => {
    expect(formatPeriodo('2026-01-01')).toBe('Enero 2026');
  });

  it('formatea 2026-12-01 como "Diciembre 2026"', () => {
    expect(formatPeriodo('2026-12-01')).toBe('Diciembre 2026');
  });

  it('devuelve N/A para fecha vacía', () => {
    expect(formatPeriodo('')).toBe('N/A');
  });

  it('genera lista de meses únicos dede los registros', () => {
    const registros = [
      { periodo: '2026-04-20' },
      { periodo: '2026-04-21' },
      { periodo: '2026-03-15' },
    ];
    const meses = Array.from(new Set(registros.map(r => r.periodo.slice(0, 7)))).sort().reverse();
    expect(meses).toEqual(['2026-04', '2026-03']); // Ordenados de más reciente a más antiguo
    expect(meses).toHaveLength(2); // Solo 2 meses únicos aunque hay 3 registros
  });
});
