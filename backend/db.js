// backend/db.js
require('dotenv').config(); // Carga las variables de entorno de .env

const { Pool } = require('pg');

// Configuración del Pool de conexiones para PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,      // Nombre de usuario de PostgreSQL desde .env
  host: process.env.DB_HOST,      // Host de la base de datos desde .env
  database: process.env.DB_NAME,  // Nombre de la base de datos desde .env
  password: process.env.DB_PASSWORD, // Contraseña del usuario desde .env
  port: process.env.DB_PORT,      // Puerto de PostgreSQL desde .env (por defecto 5432)
});

// Opcional pero muy recomendado: Probar la conexión al iniciar el pool
pool.connect((err, client, release) => {
  if (err) {
    // Si hay un error al intentar conectar, imprímelo
    return console.error('❌ Error al conectar a la base de datos PostgreSQL:', err.stack);
  }
  // Si la conexión es exitosa, imprime un mensaje
  console.log('✅ Conexión exitosa a PostgreSQL');
  // Libera el cliente inmediatamente; solo queríamos probar la conexión
  release();
});

// Exportar el pool para que pueda ser utilizado en otros archivos (ej. server.js)
module.exports = pool;