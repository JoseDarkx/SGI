import { Indicador } from './indicador';
import { Proceso } from './proceso';

export type EstadoRegistro = 'Borrador' | 'Enviado' | 'Revisado';
export type Semaforo = 'Verde' | 'Amarillo' | 'Rojo';

export interface RegistroMensual {
  id: string;
  indicador_id: string;
  proceso_id: string;
  periodo: string;
  resultado_mensual: number;
  meta: number;
  unidad_medida: string;
  cumple_meta: boolean;
  porcentaje_cumplimiento: number;
  semaforo: Semaforo;
  observaciones: string;
  accion_mejora: string;
  usuario_sistema: string;
  nombre_responsable_registro: string;
  fecha_registro: string;
  estado_registro: EstadoRegistro;
  indicadores?: Indicador;
  procesos?: Proceso;
}