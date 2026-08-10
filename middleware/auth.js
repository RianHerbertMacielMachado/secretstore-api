const { verifyToken } = require('../utils/jwt');
const pool = require('../database/connection');

async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token de autenticação não fornecido.'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido ou expirado.'
            });
        }

        // Buscar cliente no banco
        const result = await pool.query(
            'SELECT id, nome, email, status, modulos_permitidos, is_senha_temporaria FROM clientes WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado.'
            });
        }

        const user = result.rows[0];

        if (user.status !== 'ativo') {
            return res.status(403).json({
                success: false,
                message: 'Conta desativada. Entre em contato com o suporte.'
            });
        }

        req.user = user;
        req.userId = user.id;
        next();

    } catch (error) {
        console.error('[Auth Middleware]', error.message);
        return res.status(401).json({
            success: false,
            message: 'Erro na autenticação.'
        });
    }
}

module.exports = authMiddleware;
