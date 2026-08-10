const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
    console.log('[DB] Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[DB] Erro na conexão:', err.message);
});

module.exports = pool;
