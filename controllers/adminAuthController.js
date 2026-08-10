const pool = require('../database/connection');
const { generateToken } = require('../utils/jwt');
const { comparePassword } = require('../utils/password');

const adminAuthController = {

    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email e senha são obrigatórios.'
                });
            }

            const result = await pool.query(
                'SELECT * FROM admins WHERE email = $1',
                [email.trim().toLowerCase()]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas.'
                });
            }

            const admin = result.rows[0];

            if (admin.status !== 'ativo') {
                return res.status(403).json({
                    success: false,
                    message: 'Conta de administrador desativada.'
                });
            }

            const senhaValida = await comparePassword(password, admin.senha_hash);
            if (!senhaValida) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciais inválidas.'
                });
            }

            // Atualizar último acesso
            await pool.query(
                'UPDATE admins SET atualizado_em = CURRENT_TIMESTAMP WHERE id = $1',
                [admin.id]
            );

            const token = generateToken(admin.id, 'admin');

            return res.status(200).json({
                success: true,
                token,
                admin: {
                    id: admin.id,
                    nome: admin.nome,
                    email: admin.email
                }
            });

        } catch (error) {
            console.error('[Admin Login]', error.message);
            return res.status(500).json({ success: false, message: 'Erro interno.' });
        }
    },

    async verify(req, res) {
        return res.status(200).json({
            success: true,
            admin: req.admin
        });
    }
};

module.exports = adminAuthController;
