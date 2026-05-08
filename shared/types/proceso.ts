export type TipoProceso = 'Estratégico' | 'Misional' | 'Apoyo';

export interface Proceso {
  id: string;
  codigo_proceso: string;
  nombre_proceso: string;
  tipo_proceso: TipoProceso;
  lider_id: string;
  proceso_padre_id?: string;
  created_at: string;
}