const { verifyToken } = require('../utils/jwt');
const pool = require('../database/connection');

async function adminAuthMiddleware(req, res, next) {
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

        if (!decoded || decoded.role !== 'admin') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido ou sem permissão de administrador.'
            });
        }

        // Buscar admin no banco
        const result = await pool.query(
            'SELECT id, nome, email, status FROM admins WHERE id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Administrador não encontrado.'
            });
        }

        const admin = result.rows[0];

        if (admin.status !== 'ativo') {
            return res.status(403).json({
                success: false,
                message: 'Conta de administrador desativada.'
            });
        }

        req.admin = admin;
        req.adminId = admin.id;
        next();

    } catch (error) {
        console.error('[Admin Auth Middleware]', error.message);
        return res.status(401).json({
            success: false,
            message: 'Erro na autenticação.'
        });
    }
}

module.exports = adminAuthMiddleware;
