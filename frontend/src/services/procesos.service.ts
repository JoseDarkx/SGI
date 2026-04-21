import { supabase } from '../lib/supabase';
import { Proceso } from '@shared/types';

export const procesosService = {
  async getAll(): Promise<Proceso[]> {
    const { data, error } = await supabase
      .from('procesos')
      .select('id, codigo_proceso, nombre_proceso, tipo_proceso, lider_id')
      .order('codigo_proceso');

    if (error) throw new Error(error.message);
    return data as unknown as Proceso[] || [];
  },
};