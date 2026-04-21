import { describe, it, expect } from 'vitest';
import {
  calcularCumplimiento,
  determinarSemaforoDinamico,
  verificarCumplimientoDinamico,
  getHexSemaforoDinamico,
  formatPercent,
} from '../utils/calculos';

// =============================================================
// TESTS: calcularCumplimiento
// =============================================================
describe('calcularCumplimiento', () => {
  it('indicador directo: 80% de 100 devuelve 80', () => {
    expect(calcularCumplimiento(80, 100, 90, 80)).toBe(80);
  });

  it('indicador directo: 100% de 100 devuelve 100', () => {
    expect(calcularCumplimiento(100, 100, 90, 80)).toBe(100);
  });

  it('indicador directo: resultado mayor a la meta se limita a 100', () => {
    expect(calcularCumplimiento(120, 100, 90, 80)).toBe(100);
  });

  it('indicador inverso: resultado igual a la meta devuelve 100', () => {
    // umbral verde (5) < umbral amarillo (8) => inverso
    expect(calcularCumplimiento(5, 5, 5, 8)).toBe(100);
  });

  it('indicador inverso: resultado menor a la meta devuelve 100', () => {
    expect(calcularCumplimiento(3, 5, 5, 8)).toBe(100);
  });

  it('caso especial meta cero: resultado cero devuelve 100', () => {
    expect(calcularCumplimiento(0, 0, 0, 0)).toBe(100);
  });

  it('caso especial meta cero: resultado mayor a cero devuelve 0', () => {
    expect(calcularCumplimiento(1, 0, 0, 0)).toBe(0);
  });
});

// =============================================================
// TESTS: determinarSemaforoDinamico
// =============================================================
describe('determinarSemaforoDinamico', () => {
  // --- INDICADOR DIRECTO (Ej: Ventas - Más es Mejor) ---
  // umbral verde 90, amarillo 70 (verde > amarillo => DIRECTO)

  it('directo: resultado >= verde => Verde', () => {
    expect(determinarSemaforoDinamico(95, 90, 70)).toBe('Verde');
  });

  it('directo: resultado exactamente en verde => Verde', () => {
    expect(determinarSemaforoDinamico(90, 90, 70)).toBe('Verde');
  });

  it('directo: resultado entre amarillo y verde => Amarillo', () => {
    expect(determinarSemaforoDinamico(75, 90, 70)).toBe('Amarillo');
  });

  it('directo: resultado exactamente en amarillo => Amarillo', () => {
    expect(determinarSemaforoDinamico(70, 90, 70)).toBe('Amarillo');
  });

  it('directo: resultado por debajo de amarillo => Rojo', () => {
    expect(determinarSemaforoDinamico(60, 90, 70)).toBe('Rojo');
  });

  // --- INDICADOR INVERSO (Ej: Accidentes - Menos es Mejor) ---
  // El caso que falló originalmente: meta 6, verde 6, amarillo 8
  // Si resultado=8 y meta=6, debe ser Rojo (SE SUPERÓ EL LÍMITE)

  it('inverso: resultado <= verde => Verde', () => {
    // umbral verde 6, amarillo 8 (verde < amarillo => INVERSO)
    expect(determinarSemaforoDinamico(4, 6, 8)).toBe('Verde');
  });

  it('inverso: resultado exactamente en verde => Verde', () => {
    expect(determinarSemaforoDinamico(6, 6, 8)).toBe('Verde');
  });

  it('inverso: resultado entre verde y amarillo => Amarillo', () => {
    expect(determinarSemaforoDinamico(7, 6, 8)).toBe('Amarillo');
  });

  it('inverso: resultado exactamente en amarillo => Amarillo', () => {
    expect(determinarSemaforoDinamico(8, 6, 8)).toBe('Amarillo');
  });

  it('🚨 BUG ORIGINAL: inverso con resultado=8, verde=6, amarillo=8 => Amarillo (no Verde)', () => {
    // Resultado 8 = exactamente el umbral amarillo → Amarillo (límite inferior del Rojo)
    expect(determinarSemaforoDinamico(8, 6, 8)).toBe('Amarillo');
    expect(determinarSemaforoDinamico(8, 6, 8)).not.toBe('Verde');
  });

  it('inverso: resultado mayor a amarillo => Rojo', () => {
    expect(determinarSemaforoDinamico(10, 6, 8)).toBe('Rojo');
  });
});

// =============================================================
// TESTS: verificarCumplimientoDinamico
// =============================================================
describe('verificarCumplimientoDinamico', () => {
  // --- INDICADOR DIRECTO ---
  it('directo: resultado >= meta => cumple', () => {
    expect(verificarCumplimientoDinamico(90, 80, 90, 70)).toBe(true);
  });

  it('directo: resultado < meta => no cumple', () => {
    expect(verificarCumplimientoDinamico(70, 80, 90, 70)).toBe(false);
  });

  it('directo: resultado exactamente en meta => cumple', () => {
    expect(verificarCumplimientoDinamico(80, 80, 90, 70)).toBe(true);
  });

  // --- INDICADOR INVERSO ---
  it('🚨 BUG ORIGINAL: resultado=8, meta=6, indicador inverso => NO CUMPLE', () => {
    // verde=6, amarillo=8 → inverso → resultado 8 > meta 6 → NO CUMPLE
    expect(verificarCumplimientoDinamico(8, 6, 6, 8)).toBe(false);
  });

  it('inverso: resultado <= meta => cumple', () => {
    expect(verificarCumplimientoDinamico(4, 6, 6, 8)).toBe(true);
  });

  it('inverso: resultado exactamente en meta => cumple', () => {
    expect(verificarCumplimientoDinamico(6, 6, 6, 8)).toBe(true);
  });

  it('inverso: resultado mayor a meta => no cumple', () => {
    expect(verificarCumplimientoDinamico(9, 6, 6, 8)).toBe(false);
  });
});

// =============================================================
// TESTS: getHexSemaforoDinamico
// =============================================================
describe('getHexSemaforoDinamico', () => {
  it('devuelve verde (#10b981) para indicador verde', () => {
    expect(getHexSemaforoDinamico(95, 90, 70)).toBe('#10b981');
  });

  it('devuelve amarillo (#f59e0b) para indicador amarillo', () => {
    expect(getHexSemaforoDinamico(75, 90, 70)).toBe('#f59e0b');
  });

  it('devuelve rojo (#b91c1c) para indicador rojo', () => {
    expect(getHexSemaforoDinamico(50, 90, 70)).toBe('#b91c1c');
  });
});

// =============================================================
// TESTS: formatPercent
// =============================================================
describe('formatPercent', () => {
  it('formatea número entero', () => {
    expect(formatPercent(75)).toBe('75%');
  });

  it('redondea decimales', () => {
    expect(formatPercent(75.6)).toBe('76%');
  });

  it('formatea cero', () => {
    expect(formatPercent(0)).toBe('0%');
  });

  it('formatea 100', () => {
    expect(formatPercent(100)).toBe('100%');
  });
});
