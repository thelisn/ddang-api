const express = require('express')
const router = express.Router()

const teamController = require('../controllers/teamController');
const questionController = require('../controllers/questionController');

router.post('/team/list', teamController.getTeamList);
router.post('/question/current', questionController.getCurrentQuestion);

// const socketController = require('../socket/index');

// router.get('/admin', socketController.onAdminRefresh);
// router.get('/waiting', socketController.onWaitingRefresh);
// router.get('/quiz', socketController.onQuizRefresh);

module.exports = router
