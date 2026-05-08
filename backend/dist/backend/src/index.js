"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// 👇 Esta es la línea clave 1: Importamos el archivo de rutas
const usuarios_1 = __importDefault(require("./routes/usuarios"));
const indicadores_1 = __importDefault(require("./routes/indicadores"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Configuración de CORS dinámica
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://192.168.2.57:3000'];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (como Postman o apps móviles)
        if (!origin)
            return callback(null, true);
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
app.use(express_1.default.json());
// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '¡El servidor SGI está vivo! 🚀' });
});
// 👇 Esta es la línea clave 2: Conectamos la ruta al servidor
app.use('/api/usuarios', usuarios_1.default);
app.use('/api/indicadores', indicadores_1.default);
app.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`🚀 SGI Backend corriendo en el puerto ${PORT}`);
    console.log(`======================================\n`);
});
