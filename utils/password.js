const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

async function comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

function validatePasswordStrength(password) {
    if (!password || password.length < 6) {
        return { valid: false, message: 'A senha deve ter pelo menos 6 caracteres.' };
    }
    if (password.length > 128) {
        return { valid: false, message: 'A senha não pode ter mais de 128 caracteres.' };
    }
    return { valid: true };
}

module.exports = { hashPassword, comparePassword, validatePasswordStrength };