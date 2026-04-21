// Setup global para los tests del backend
// Silencia logs innecesarios durante los tests
process.env.NODE_ENV = 'test';
process.env.PORT = '3099'; // Puerto distinto al de producción
