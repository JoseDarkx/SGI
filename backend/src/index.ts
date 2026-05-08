import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// 👇 Esta es la línea clave 1: Importamos el archivo de rutas
import usuariosRoutes from './routes/usuarios';
import indicadoresRoutes from './routes/indicadores';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de CORS dinámica
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:3000', 'http://192.168.2.57:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (como Postman o apps móviles)
    if (!origin) return callback(null, true);
    
    // Si el origen está en la lista de permitidos
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Flexibilidad para desarrollo local y red local
    if (origin.startsWith('http://localhost') || origin.startsWith('http://192.168.')) {
      return callback(null, true);
    }

    callback(new Error('No permitido por CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '¡El servidor SGI está vivo! 🚀' });
});

// 👇 Esta es la línea clave 2: Conectamos la ruta al servidor
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/indicadores', indicadoresRoutes);

app.listen(PORT, () => {
  console.log(`\n======================================`);
  console.log(`🚀 SGI Backend corriendo en el puerto ${PORT}`);
  console.log(`======================================\n`);
});