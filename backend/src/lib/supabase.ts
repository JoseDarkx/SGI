import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargamos las variables de tu archivo .env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Faltan variables de entorno de Supabase en el backend (.env)');
}

// Creamos el cliente con la llave maestra (service_role)
// Esto nos permite gestionar usuarios de Auth directamente
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});