import { Proceso } from './proceso';

export type TipoIndicador = 'Eficiencia' | 'Eficacia' | 'Efectividad' | 'Cumplimiento';
export type EstadoIndicador = 'Activo' | 'Inactivo';
export type Frecuencia = 'Mensual' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual';

export interface Indicador {
  id: string;
  codigo_indicador: string;
  nombre_indicador: string;
  proceso_id: string;
  tipo_indicador: TipoIndicador;
  descripcion: string;
  formula_calculo: string;
  meta: number;
  unidad_medida: string;
  frecuencia: Frecuencia;
  fuente_informacion: string;
  estado: EstadoIndicador;
  umbral_verde: number;
  umbral_amarillo: number;
  umbral_rojo: number;
  created_at: string;
  procesos?: Proceso;
}