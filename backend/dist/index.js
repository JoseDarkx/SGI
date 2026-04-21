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
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://192.168.2.57:3000'],
    credentials: true
}));
app.use(express_1.default.json());
// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '¡El servidor SGI está vivo! 🚀' });
});
// 👇 Esta es la línea clave 2: Conectamos la ruta al servidor
app.use('/api/usuarios', usuarios_1.default);
app.listen(PORT, () => {
    console.log(`\n======================================`);
    console.log(`🚀 SGI Backend corriendo en el puerto ${PORT}`);
    console.log(`======================================\n`);
});
