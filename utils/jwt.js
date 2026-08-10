const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secretstore-default-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_ADMIN_EXPIRES_IN = process.env.JWT_ADMIN_EXPIRES_IN || '24h';

function generateToken(userId, role = 'client') {
    const expiresIn = role === 'admin' ? JWT_ADMIN_EXPIRES_IN : JWT_EXPIRES_IN;
    return jwt.sign(
        { userId, role },
        JWT_SECRET,
        { expiresIn }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

module.exports = { generateToken, verifyToken };
