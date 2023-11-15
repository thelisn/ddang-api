const express = require('express')
const router = express.Router()

const socketController = require('../socket/index');

router.get('/admin', socketController.onAdminRefresh);
router.get('/waiting', socketController.onWaitingRefresh);
router.get('/quiz', socketController.onQuizRefresh);

module.exports = router
