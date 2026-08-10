const express = require('express');
const router = express.Router();
const controller = require('../controllers/helpController');
const adminAuthMiddleware = require('../middleware/adminAuth');

// Pública (programa desktop busca isso)
router.get('/public', controller.getPublic);

// Admin (CRUD)
router.get('/', adminAuthMiddleware, controller.listAll);
router.post('/', adminAuthMiddleware, controller.create);
router.put('/:id', adminAuthMiddleware, controller.update);
router.delete('/:id', adminAuthMiddleware, controller.remove);

module.exports = router;
