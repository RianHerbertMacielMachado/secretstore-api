const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminAuthController');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Login do admin (público)
router.post('/login', controller.login);

// Verificar token (protegido)
router.get('/verify', adminAuthMiddleware, controller.verify);

module.exports = router;
