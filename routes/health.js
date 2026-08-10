const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

// GET /health — Verificar se a API está rodando
router.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({
            success: true,
            status: 'online',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'database_error',
            message: 'Erro na conexão com o banco de dados.'
        });
    }
});

module.exports = router;
