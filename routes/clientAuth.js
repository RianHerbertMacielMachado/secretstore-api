const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientAuthController');
const authMiddleware = require('../middleware/auth');

// Rotas públicas (sem token)
router.post('/login', controller.login);
router.post('/request-reset', controller.requestReset);
router.get('/reset-status', controller.checkResetStatus);

// Rotas protegidas (requer token)
router.post('/change-password', authMiddleware, controller.changePassword);
router.post('/set-password', authMiddleware, controller.setPassword);
router.post('/logout', authMiddleware, controller.logout);
router.get('/verify', authMiddleware, controller.verify);

module.exports = router;
