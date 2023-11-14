const express = require('express')
const router = express.Router()

const socketController = require('../socket/index');


router.get('/api', function(req, res, next) {
  res.send('hello world')
});

router.get('/admin', socketController.onAdminRefresh);
router.get('/waiting', socketController.onWaitingRefresh);
router.get('/quiz', socketController.onQuizRefresh);


router.get('/test', socketController.testApi)

// router.post('/p/l', projectController.getList);
// router.post('/p/i', projectController.getInfo);

// router.post('/g/l', guestbookController.getList);
// router.post('/g/c', guestbookController.createInfo);

// router.post('/s', projectController.getSearch);

module.exports = router