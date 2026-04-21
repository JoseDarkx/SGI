import { supabase } from '../lib/supabase';
import { RegistroMensual } from '@shared/types';

export const registrosService = {
  // Registros de un proceso específico (para Líder)
  async getPorProceso(procesoId: string, limit = 20): Promise<RegistroMensual[]> {
    const { data, error } = await supabase
      .from('registro_mensual_indicadores')
      .select('id, indicador_id, resultado_mensual, meta, periodo, cumple_meta, semaforo, estado_registro, accion_mejora, indicadores(codigo_indicador, nombre_indicador)')
      .eq('proceso_id', procesoId)
      .order('periodo', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data as unknown as RegistroMensual[] || [];
  },

  // Todos los registros (para Admin)
  async getTodos(limit = 300): Promise<RegistroMensual[]> {
    const { data, error } = await supabase
      .from('registro_mensual_indicadores')
      .select('id, proceso_id, periodo, porcentaje_cumplimiento, resultado_mensual, meta, cumple_meta, semaforo, unidad_medida, estado_registro, indicadores(nombre_indicador, frecuencia), procesos(nombre_proceso)')
      .order('periodo', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data as unknown as RegistroMensual[] || [];
  },

  // Registros con filtros (para Histórico)
  async getFiltrado(params: {
    procesoId?: string;
    indicadorId?: string;
    frecuencia?: string;
    desde?: string;
    hasta?: string;
    esAdmin: boolean;
    userProcesoId?: string;
  }): Promise<RegistroMensual[]> {
    let query = supabase
      .from('registro_mensual_indicadores')
      .select('*, indicadores(id, codigo_indicador, nombre_indicador, frecuencia, procesos(nombre_proceso)), procesos(id, nombre_proceso, codigo_proceso)')
      .order('periodo', { ascending: false });

    if (!params.esAdmin && params.userProcesoId) {
      query = query.eq('proceso_id', params.userProcesoId);
    } else if (params.procesoId && params.procesoId !== 'Todos los procesos') {
      query = query.eq('proceso_id', params.procesoId);
    }

    if (params.indicadorId && params.indicadorId !== 'Todos los indicadores') {
      query = query.eq('indicador_id', params.indicadorId);
    }
    if (params.desde) query = query.gte('periodo', params.desde);
    if (params.hasta) query = query.lte('periodo', params.hasta);

    const { data, error } = await query.limit(500);
    if (error) throw new Error(error.message);
    return data as unknown as RegistroMensual[] || [];
  },

  // Verificar si existe borrador
  async getBorrador(indicadorId: string, periodo: string): Promise<RegistroMensual | null> {
    const { data } = await supabase
      .from('registro_mensual_indicadores')
      .select('*')
      .eq('indicador_id', indicadorId)
      .eq('periodo', periodo)
      .maybeSingle();

    return data?.estado_registro === 'Borrador' ? (data as unknown as RegistroMensual) : null;
  },

  async crear(registro: Partial<RegistroMensual>): Promise<RegistroMensual> {
    const { data, error } = await supabase
      .from('registro_mensual_indicadores')
      .insert([registro])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as RegistroMensual;
  },

  async actualizar(id: string, registro: Partial<RegistroMensual>): Promise<RegistroMensual> {
    const { data, error } = await supabase
      .from('registro_mensual_indicadores')
      .update(registro)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as unknown as RegistroMensual;
  },

  async eliminar(id: string): Promise<void> {
    const { error } = await supabase
      .from('registro_mensual_indicadores')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },
};