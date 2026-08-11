const express = require('express');
const router = express.Router();
const pool = require('../database/connection');

router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT titulo, conteudo FROM help_info WHERE ativo = true ORDER BY ordem ASC'
        );
        res.json({ success: true, items: result.rows });
    } catch (error) {
        console.error('[Help]', error.message);
        res.status(500).json({ success: false, message: 'Erro ao buscar ajuda' });
    }
});

module.exports = router;
