const pool = require('../database/connection');
const { generateToken } = require('../utils/jwt');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/password');

const clientAuthController = {

    // ─── LOGIN ────────────────────────────────────────────────────────────────
    async login(req, res) {
        try {
            const { email, password, device_id } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email e senha são obrigatórios.'
                });
            }

            // Buscar cliente
            const result = await pool.query(
                'SELECT * FROM clientes WHERE email = $1',
                [email.trim().toLowerCase()]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'invalid_credentials',
                    message: 'Email ou senha incorretos.'
                });
            }

            const cliente = result.rows[0];

            // Verificar status
            if (cliente.status !== 'ativo') {
                return res.status(403).json({
                    success: false,
                    error: 'inactive',
                    message: 'Conta desativada. Entre em contato com o suporte.'
                });
            }

            // Verificar senha
            const senhaValida = await comparePassword(password, cliente.senha_hash);
            if (!senhaValida) {
                // Log de tentativa falha
                await pool.query(
                    'INSERT INTO logs_acesso (cliente_id, email, acao, detalhes, device_id) VALUES ($1, $2, $3, $4, $5)',
                    [cliente.id, email, 'login_falha', 'Senha incorreta', device_id || null]
                );

                return res.status(401).json({
                    success: false,
                    error: 'invalid_credentials',
                    message: 'Email ou senha incorretos.'
                });
            }

            // Atualizar device_id e último login
            await pool.query(
                'UPDATE clientes SET device_id = $1, ultimo_login = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2',
                [device_id || cliente.device_id, cliente.id]
            );

            // Gerar token JWT
            const token = generateToken(cliente.id, 'client');

            // Log de sucesso
            await pool.query(
                'INSERT INTO logs_acesso (cliente_id, email, acao, detalhes, device_id) VALUES ($1, $2, $3, $4, $5)',
                [cliente.id, email, 'login_sucesso', null, device_id || null]
            );

            // Buscar help_info
            const helpResult = await pool.query(
                'SELECT titulo, conteudo FROM help_info WHERE ativo = true ORDER BY ordem ASC'
            );

            // Responder
            return res.status(200).json({
                success: true,
                token,
                user: {
                    id: cliente.id,
                    nome: cliente.nome,
                    email: cliente.email,
                    status: cliente.status,
                    modulos_permitidos: cliente.modulos_permitidos || [],
                    is_senha_temporaria: cliente.is_senha_temporaria || false
                },
                help_info: helpResult.rows
            });

        } catch (error) {
            console.error('[Client Login]', error.message);
            return res.status(500).json({
                success: false,
                message: 'Erro interno ao fazer login.'
            });
        }
    },

    // ─── CHANGE PASSWORD ──────────────────────────────────────────────────────
    async changePassword(req, res) {
        try {
            const { current_password, new_password } = req.body;
            const userId = req.userId;

            if (!current_password || !new_password) {
                return res.status(400).json({
                    success: false,
                    message: 'Senha atual e nova senha são obrigatórias.'
                });
            }

            // Validar força da nova senha
            const validation = validatePasswordStrength(new_password);
            if (!validation.valid) {
                return res.status(400).json({ success: false, message: validation.message });
            }

            // Buscar senha atual
            const result = await pool.query('SELECT senha_hash FROM clientes WHERE id = $1', [userId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
            }

            // Verificar senha atual
            const senhaValida = await comparePassword(current_password, result.rows[0].senha_hash);
            if (!senhaValida) {
                return res.status(401).json({ success: false, message: 'Senha atual incorreta.' });
            }

            // Atualizar senha
            const novaHash = await hashPassword(new_password);
            await pool.query(
                'UPDATE clientes SET senha_hash = $1, is_senha_temporaria = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2',
                [novaHash, userId]
            );

            // Log
            await pool.query(
                'INSERT INTO logs_acesso (cliente_id, acao, detalhes) VALUES ($1, $2, $3)',
                [userId, 'senha_alterada', 'Senha alterada pelo usuário']
            );

            return res.status(200).json({ success: true, message: 'Senha alterada com sucesso!' });

        } catch (error) {
            console.error('[Change Password]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao alterar senha.' });
        }
    },

    // ─── SET PASSWORD (após reset/senha temporária) ───────────────────────────
    async setPassword(req, res) {
        try {
            const { new_password } = req.body;
            const userId = req.userId;

            if (!new_password) {
                return res.status(400).json({ success: false, message: 'Nova senha é obrigatória.' });
            }

            const validation = validatePasswordStrength(new_password);
            if (!validation.valid) {
                return res.status(400).json({ success: false, message: validation.message });
            }

            const novaHash = await hashPassword(new_password);
            await pool.query(
                'UPDATE clientes SET senha_hash = $1, is_senha_temporaria = false, reset_solicitado = false, reset_aprovado = false, atualizado_em = CURRENT_TIMESTAMP WHERE id = $2',
                [novaHash, userId]
            );

            // Log
            await pool.query(
                'INSERT INTO logs_acesso (cliente_id, acao, detalhes) VALUES ($1, $2, $3)',
                [userId, 'senha_definida', 'Nova senha definida após reset']
            );

            return res.status(200).json({ success: true, message: 'Senha definida com sucesso!' });

        } catch (error) {
            console.error('[Set Password]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao definir senha.' });
        }
    },

    // ─── REQUEST RESET ────────────────────────────────────────────────────────
    async requestReset(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ success: false, message: 'Email é obrigatório.' });
            }

            const result = await pool.query(
                'SELECT id FROM clientes WHERE email = $1',
                [email.trim().toLowerCase()]
            );

            if (result.rows.length === 0) {
                // Não revelar se o email existe
                return res.status(200).json({
                    success: true,
                    message: 'Se o email estiver cadastrado, a solicitação foi enviada.'
                });
            }

            // Marcar reset_solicitado
            await pool.query(
                'UPDATE clientes SET reset_solicitado = true, atualizado_em = CURRENT_TIMESTAMP WHERE id = $1',
                [result.rows[0].id]
            );

            // Log
            await pool.query(
                'INSERT INTO logs_acesso (cliente_id, email, acao) VALUES ($1, $2, $3)',
                [result.rows[0].id, email, 'reset_solicitado']
            );

            return res.status(200).json({
                success: true,
                message: 'Solicitação de reset enviada. Entre em contato com a Secret Store para receber sua nova senha.'
            });

        } catch (error) {
            console.error('[Request Reset]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao solicitar reset.' });
        }
    },

    // ─── CHECK RESET STATUS ──────────────────────────────────────────────────
    async checkResetStatus(req, res) {
        try {
            const { email } = req.query;

            if (!email) {
                return res.status(400).json({ success: false, message: 'Email é obrigatório.' });
            }

            const result = await pool.query(
                'SELECT reset_aprovado, is_senha_temporaria FROM clientes WHERE email = $1',
                [email.trim().toLowerCase()]
            );

            if (result.rows.length === 0) {
                return res.status(200).json({ success: true, approved: false });
            }

            const cliente = result.rows[0];
            return res.status(200).json({
                success: true,
                approved: cliente.reset_aprovado || false
            });

        } catch (error) {
            console.error('[Check Reset Status]', error.message);
            return res.status(500).json({ success: false, message: 'Erro ao verificar status.' });
        }
    },

    // ─── VERIFY (token válido?) ───────────────────────────────────────────────
    async verify(req, res) {
        return res.status(200).json({
            success: true,
            user: req.user
        });
    },

    // ─── LOGOUT ───────────────────────────────────────────────────────────────
    async logout(req, res) {
        try {
            // Log
            await pool.query(
                'INSERT INTO logs_acesso (cliente_id, acao) VALUES ($1, $2)',
                [req.userId, 'logout']
            );

            return res.status(200).json({ success: true, message: 'Logout realizado.' });
        } catch (error) {
            return res.status(200).json({ success: true });
        }
    }
};

module.exports = clientAuthController;
