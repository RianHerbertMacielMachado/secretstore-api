const pool = require('../database/connection');

const helpController = {

    // Público — Programa desktop busca isso
    async getPublic(req, res) {
        try {
            const result = await pool.query(
                'SELECT titulo, conteudo FROM help_info WHERE ativo = true ORDER BY ordem ASC'
            );
            return res.status(200).json({ success: true, items: result.rows });
        } catch (error) {
            return res.status(500).json({ success: false, items: [] });
        }
    },

    // Admin — Listar todos
    async listAll(req, res) {
        try {
            const result = await pool.query('SELECT * FROM help_info ORDER BY ordem ASC');
            return res.status(200).json({ success: true, items: result.rows });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Erro ao listar.' });
        }
    },

    // Admin — Criar
    async create(req, res) {
        try {
            const { titulo, conteudo, ordem } = req.body;
            if (!titulo || !conteudo) {
                return res.status(400).json({ success: false, message: 'Título e conteúdo são obrigatórios.' });
            }
            const result = await pool.query(
                'INSERT INTO help_info (titulo, conteudo, ordem) VALUES ($1, $2, $3) RETURNING *',
                [titulo, conteudo, ordem || 0]
            );
            return res.status(201).json({ success: true, item: result.rows[0] });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Erro ao criar.' });
        }
    },

    // Admin — Atualizar
    async update(req, res) {
        try {
            const { id } = req.params;
            const { titulo, conteudo, ordem, ativo } = req.body;

            const result = await pool.query(
                'UPDATE help_info SET titulo = COALESCE($1, titulo), conteudo = COALESCE($2, conteudo), ordem = COALESCE($3, ordem), ativo = COALESCE($4, ativo) WHERE id = $5 RETURNING *',
                [titulo, conteudo, ordem, ativo, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Item não encontrado.' });
            }

            return res.status(200).json({ success: true, item: result.rows[0] });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Erro ao atualizar.' });
        }
    },

    // Admin — Remover
    async remove(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query('DELETE FROM help_info WHERE id = $1 RETURNING id', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Item não encontrado.' });
            }

            return res.status(200).json({ success: true, message: 'Removido!' });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Erro ao remover.' });
        }
    }
};

module.exports = helpController;
