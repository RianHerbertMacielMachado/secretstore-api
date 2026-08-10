const pool = require('../database/connection');
const { hashPassword } = require('../utils/password');

const usersController = {

    // ─── LISTAR TODOS ─────────────────────────────────────────────────────────
    async listAll(req, res) {
        try {
            const result = await pool.query(`
                SELECT id, nome, email, status, modulos_permitidos, is_senha_temporaria,
                       device_id, ultimo_login, reset_solicitado, reset_aprovado, notas,
                       criado_em, atualizado_em
                FROM clientes
                ORDER BY criado_em DESC
            `);

            return res.status(200).json({
                success: true,
                users: result.rows,
                total: result.rows.length
            });
        } catch (error) {
            console.error('[Users List]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao listar usuários.' });
        }
    },

    // ─── BUSCAR POR ID ────────────────────────────────────────────────────────
    async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await pool.query(
                'SELECT id, nome, email, status, modulos_permitidos, is_senha_temporaria, device_id, ultimo_login, reset_solicitado, reset_aprovado, notas, criado_em, atualizado_em FROM clientes WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            }

            // Buscar logs recentes
            const logsResult = await pool.query(
                'SELECT acao, detalhes, device_id, criado_em FROM logs_acesso WHERE cliente_id = $1 ORDER BY criado_em DESC LIMIT 20',
                [id]
            );

            return res.status(200).json({
                success: true,
                user: result.rows[0],
                logs: logsResult.rows
            });
        } catch (error) {
            console.error('[Users GetById]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao buscar usuário.' });
        }
    },

    // ─── CRIAR ────────────────────────────────────────────────────────────────
    async create(req, res) {
        try {
            const { nome, email, senha, modulos_permitidos, notas } = req.body;

            if (!nome || !email || !senha) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome, email e senha são obrigatórios.'
                });
            }

            // Verificar se já existe
            const existing = await pool.query('SELECT id FROM clientes WHERE email = $1', [email.trim().toLowerCase()]);
            if (existing.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Já existe um usuário com este email.'
                });
            }

            const senhaHash = await hashPassword(senha);
            const modulos = modulos_permitidos || ['mapas', 'veiculos', 'roupas', 'peds', 'weapons'];

            const result = await pool.query(`
                INSERT INTO clientes (nome, email, senha_hash, modulos_permitidos, is_senha_temporaria, notas)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, nome, email, status, modulos_permitidos, criado_em
            `, [nome.trim(), email.trim().toLowerCase(), senhaHash, modulos, true, notas || null]);

            return res.status(201).json({
                success: true,
                message: 'Usuário criado com sucesso!',
                user: result.rows[0]
            });

        } catch (error) {
            console.error('[Users Create]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao criar usuário.' });
        }
    },

    // ─── ATUALIZAR ────────────────────────────────────────────────────────────
    async update(req, res) {
        try {
            const { id } = req.params;
            const { nome, email, notas } = req.body;

            const fields = [];
            const values = [];
            let paramCount = 0;

            if (nome) { paramCount++; fields.push(`nome = $${paramCount}`); values.push(nome.trim()); }
            if (email) { paramCount++; fields.push(`email = $${paramCount}`); values.push(email.trim().toLowerCase()); }
            if (notas !== undefined) { paramCount++; fields.push(`notas = $${paramCount}`); values.push(notas); }

            if (fields.length === 0) {
                return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar.' });
            }

            paramCount++;
            fields.push(`atualizado_em = CURRENT_TIMESTAMP`);
            values.push(id);

            const result = await pool.query(
                `UPDATE clientes SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, nome, email, status, modulos_permitidos`,
                values
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            }

            return res.status(200).json({ success: true, message: 'Usuário atualizado!', user: result.rows[0] });

        } catch (error) {
            console.error('[Users Update]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar usuário.' });
        }
    },

    // ─── ATUALIZAR STATUS ─────────────────────────────────────────────────────
    async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!['ativo', 'inativo', 'suspenso'].includes(status)) {
                return res.status(400).json({ success: false, message: 'Status inválido. Use: ativo, inativo ou suspenso.' });
            }

            const result = await pool.query(
                'UPDATE clientes SET status = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, nome, email, status',
                [status, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            }

            return res.status(200).json({ success: true, message: `Status alterado para "${status}".`, user: result.rows[0] });

        } catch (error) {
            console.error('[Users UpdateStatus]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar status.' });
        }
    },

    // ─── ATUALIZAR MÓDULOS ────────────────────────────────────────────────────
    async updateModules(req, res) {
        try {
            const { id } = req.params;
            const { modulos_permitidos } = req.body;

            if (!Array.isArray(modulos_permitidos)) {
                return res.status(400).json({ success: false, message: 'modulos_permitidos deve ser um array.' });
            }

            const validModules = ['mapas', 'veiculos', 'roupas', 'peds', 'weapons'];
            const invalid = modulos_permitidos.filter(m => !validModules.includes(m));
            if (invalid.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Módulos inválidos: ${invalid.join(', ')}. Válidos: ${validModules.join(', ')}`
                });
            }

            const result = await pool.query(
                'UPDATE clientes SET modulos_permitidos = $1, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, nome, email, modulos_permitidos',
                [modulos_permitidos, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            }

            return res.status(200).json({
                success: true,
                message: 'Módulos atualizados!',
                user: result.rows[0]
            });

        } catch (error) {
            console.error('[Users UpdateModules]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao atualizar módulos.' });
        }
    },

    // ─── RESET PASSWORD (admin define senha temporária) ───────────────────────
    async resetPassword(req, res) {
        try {
            const { id } = req.params;
            const { nova_senha } = req.body;

            if (!nova_senha) {
                return res.status(400).json({ success: false, message: 'nova_senha é obrigatória.' });
            }

            const senhaHash = await hashPassword(nova_senha);

            const result = await pool.query(
                'UPDATE clientes SET senha_hash = $1, is_senha_temporaria = true, reset_solicitado = false, reset_aprovado = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, nome, email',
                [senhaHash, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            }

            // Log
            await pool.query(
                'INSERT INTO logs_acesso (cliente_id, acao, detalhes) VALUES ($1, $2, $3)',
                [id, 'reset_senha_admin', 'Senha resetada pelo administrador']
            );

            return res.status(200).json({
                success: true,
                message: 'Senha resetada com sucesso! O usuário precisará definir uma nova senha no próximo login.',
                user: result.rows[0]
            });

        } catch (error) {
            console.error('[Users ResetPassword]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao resetar senha.' });
        }
    },

    // ─── APROVAR RESET ────────────────────────────────────────────────────────
    async approveReset(req, res) {
        try {
            const { id } = req.params;

            const result = await pool.query(
                'UPDATE clientes SET reset_aprovado = true, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, nome, email',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            }

            return res.status(200).json({ success: true, message: 'Reset aprovado!', user: result.rows[0] });

        } catch (error) {
            console.error('[Users ApproveReset]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao aprovar reset.' });
        }
    },

    // ─── REMOVER ──────────────────────────────────────────────────────────────
    async remove(req, res) {
        try {
            const { id } = req.params;

            const result = await pool.query('DELETE FROM clientes WHERE id = $1 RETURNING id, nome, email', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            }

            return res.status(200).json({
                success: true,
                message: 'Usuário removido permanentemente.',
                user: result.rows[0]
            });

        } catch (error) {
            console.error('[Users Remove]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao remover usuário.' });
        }
    }
};

module.exports = usersController;
