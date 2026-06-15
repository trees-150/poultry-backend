const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.post('/:id/read', notificationController.markAsRead);
router.post('/mark-all-read', notificationController.markAllRead);

module.exports = router;
