const express = require('express');
const router = express.Router();
const controller = require('../controllers/usersController');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Todas as rotas requerem autenticação de admin
router.use(adminAuthMiddleware);

router.get('/', controller.listAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.patch('/:id/status', controller.updateStatus);
router.patch('/:id/modules', controller.updateModules);
router.patch('/:id/reset-password', controller.resetPassword);
router.patch('/:id/approve-reset', controller.approveReset);
router.delete('/:id', controller.remove);

module.exports = router;
