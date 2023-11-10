const express = require('express')
const router = express.Router()

const questionController = require('../controllers/questionController')
const teamController = require('../controllers/teamController')
const userController = require('../controllers/userController')

router.get('/api', function(req, res, next) {
  res.send('hello world')
});

// router.get('/u/l', userController.getUsers);
// 예시 controller에서 함수를 정의한다음 불러온다.

// router.post('/d/l', designerController.getList);
// router.post('/d/i', designerController.getInfo);

// router.post('/p/l', projectController.getList);
// router.post('/p/i', projectController.getInfo);

// router.post('/g/l', guestbookController.getList);
// router.post('/g/c', guestbookController.createInfo);

// router.post('/s', projectController.getSearch);

module.exports = router