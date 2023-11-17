const { User, sequelize } = require('../models')
const { Team } = require('../models')
const { QuestionStatus } = require('../models')
const { Question } = require('../models')
const { UserAlive } = require('../models')
const { UserAnswer } = require('../models')
const { Event } = require('../models')
const { Answer } = require('../models')
const EVENTNUM = 1;
const Op = require('sequelize').Op;

exports.login = async function (socket, value) {
  if (!value) {
    return socket.emit('login', {
      error: true,
      msg: '입력된 값이 없습니다.'
    }); 
  }

  // 유저 정보
  User.belongsTo(Team, { foreignKey: 'teamId' });

  const userInfo = await User.findAll({
    where: {
      einumber: value
    },
    include: [Team]
  });

  if (!userInfo[0]) {
    return socket.emit('login', {
      error: true,
      msg: '사용자가 존재하지 않습니다.'
    });
  }


  // 대기실 정보
  let teamData = [];
  const teamInfo = await User.findAll({
    include: [Team]
  });
  
  for (const team of teamInfo) {
    let obj = {};
    obj['einumber'] = team.einumber,
    obj['name'] = team.name,
    obj['team'] = team.Team.name

    teamData.push(obj);
  }

  // 현재 진행중인 문제
  let currentQuestion = null;
  const questionInfo = await Event.findAll({
    where: {
      id: EVENTNUM
    },
    attributes: ['currQuestion']
  });

  currentQuestion = questionInfo[0].dataValues.currQuestion;

  // 사용자가 생존했는지 확인을 위한 테이블 생성
  if (!userInfo[0].isAdmin) {
    UserAlive.create({
      userId: userInfo[0].id,
      deletedAt: null,
      einumber: userInfo[0].einumber
    });
  };

  
  // 결과
  let result = {
    error: false,
    userData: {
      id: userInfo[0].id,
      einumber: userInfo[0].einumber,
      name: userInfo[0].name,
      isAdmin: userInfo[0].isAdmin,
      team: userInfo[0].Team.name
    },
    teamData,
    currentQuestion
  }
  
  // 메인 페이지에 login 이벤트 트리거
  socket.emit('login', result);

  // User, Admin 페이지에 login 이벤트 트리거
  setTimeout(() => {
    socket.emit('login', result);
  }, 10);
}

exports.joinQuiz = async function (socket, data) {
  // 퀴즈 정보 가져오기
  Question.hasMany(Answer);
  Answer.belongsTo(Question, { foreignKey: 'questionId' });

  let questionData = {};
  let currQuestion = null;

  await Event.findAll({
    where: {
      id: EVENTNUM
    },
    attributes: ['currQuestion']
  }).then(async (res) => {
    currQuestion = res[0].dataValues.currQuestion;

    const questionInfo = await Question.findAll({
      where: {
        number : currQuestion
      },
      include: [Answer]
    });

    let answers = [];
    for (const answer of questionInfo[0].Answers) {
      answers.push({ text: answer.dataValues.text })
    };

    questionData['number'] = questionInfo[0].dataValues.number;
    questionData['question'] = questionInfo[0].dataValues.question;
    questionData['type'] = questionInfo[0].dataValues.type;
    questionData['answers'] = answers;
  });

  // 사용자가 탈락했는지 확인
  let isAlive = await UserAlive.findAll({
    where: {
      einumber: data.einumber
    }
  }).then((res) => {
    if (res[0].dataValues.deletedAt) {
      return false;
    } else {
      return true;
    }
  });

  questionData['isAlive'] = isAlive;

  // UserAnswer에 row 추가
  await UserAnswer.findAll({
    where: {
      einumber: data.einumber,
      questionId: currQuestion
    }
  }).then(async (res) => {
    console.log(res)
    if (!res.length) {
      await UserAnswer.create({
        questionId: currQuestion,
        einumber: data.einumber
      });

      // 퀴즈 푼 인원 업데이트
      await QuestionStatus.update({ totalUserCount: sequelize.literal('totalUserCount + 1') }, {
        where: {
          questionId: currQuestion
        }
      });
    } else {
      await UserAnswer.findAll({
        where: {
          einumber: data.einumber,
          questionId: currQuestion
        }
      }).then((res) => {
        if (res[0].dataValues.answer) {
          questionData['selectedAnswer'] = res[0].dataValues.answer;
        }
      })
    }
  });



  // socket.emit('join-quiz', questionData);
  socket.broadcast.emit('join-quiz', questionData);
}

exports.joinAdminQuiz = async function (socket, data) {
  // 문제 가져오기
  Question.hasOne(QuestionStatus);
  let questionData = [];
  const questionInfo = await Question.findAll({
    include: [QuestionStatus]
  });

  for (const question of questionInfo) {
    let obj = {};

    obj['number'] = question.dataValues.number;
    obj['question'] = question.dataValues.question;
    obj['type'] = question.dataValues.type;
    
    if (question.QuestionStatus) {
      obj['totalUserCount'] = question.QuestionStatus.totalUserCount;
      obj['correctUserCount'] = question.QuestionStatus.currentUserCount;
      obj['isStarted'] = true;


      if (question.QuestionStatus.deletedAt) {
        obj['isFinished'] = true;
      } else {
        obj['isFinished'] = false;
      }

    } else {
      obj['isStarted'] = false;
    }

    questionData.push(obj);
  }

  // 유저 정보 가져오기
  User.hasMany(UserAlive);
  User.belongsTo(Team, { foreignKey: 'teamId' });
  UserAlive.belongsTo(User, { foreignKey: 'userId' });


  let userData = [];
  const userInfo = await User.findAll({
    include: [UserAlive, Team]
  })

  for (const user of userInfo) {
    let obj = {};

    obj['einumber'] = user.dataValues.einumber;
    obj['name'] = user.dataValues.name;
    obj['teamName'] = user.dataValues.Team.dataValues.name;
    obj['teamColor'] = user.dataValues.Team.dataValues.color;

    if (user.dataValues.UserAlives.length) {
      if (!user.dataValues.UserAlives[0].dataValues.deletedAt) {
        obj['isAlive'] = true;
      } else {
        obj['isAlive'] = false;
      }
    }
    
    userData.push(obj);
  }

  // 현재 진행중인 문제 가져오기
  const currentQuestion = await Event.findAll({
    where: {
      id: EVENTNUM
    },
    attributes: ['currQuestion']
  }).then(res => {
    return res[0].dataValues.currQuestion;
  })

  // 퀴즈를 푼 인원
  const currentUser = await UserAnswer.findAll({
    where: {
      questionId: currentQuestion,
      answer: {
        [Op.ne]: null
      }
    }
  })
  .then(res => {
    return res.length;
  })

  // 퀴즈에 접속한 유저 인원
  const totalUser = await QuestionStatus.findAll({
    where: {
      questionId: currentQuestion
    }
  })
  .then(res => {
    if (res.length) {
      return res[0].dataValues.totalUserCount;
    }
  });

  let result = {
    questionData,
    userData,
    currentQuestion,
    totalUser,
    currentUser
  }

  setTimeout(() => {
    socket.emit('join-admin-quiz', result);
  }, 10)
}

exports.startQuiz = async function (socket, data) {
  // Question_Status 생성
  QuestionStatus.create({
    questionId: data.questionNum,
    totalUserCount: 0,
    correctUserCount: 0,
    deletedAt: null
  });

  // Event의 currentQuestion 업데이트
  await Event.update({ currQuestion: data.questionNum }, {
    where: {
      id: EVENTNUM
    }
  });

  socket.broadcast.emit('start-quiz', true);
}

exports.selectAnswer = async function (socket, data) {
  // 사용자가 보기 선택 시 User_Answer 테이블 생성 또는 업데이트
  await UserAnswer.findAll({
    where: {
      einumber: data.userInfo.einumber,
      questionId: data.number,
    }
  }).then(async (res) => {
    await UserAnswer.update({ answer: data.answer }, {
      where: {
        einumber: data.userInfo.einumber,
        questionId: data.number
      }
    });
  });

  socket.broadcast.emit('select-answer');
}

exports.showAnswer = async function (socket, data) {
  // 정답 체크 후 맞은 인원 업데이트
  let correctAnswer = await Question.findAll({
    where: {
      number: data.currentQuestion._value
    },
    attributes: ['correctAnswer']
  }).then(res => {    
    return res[0].dataValues.correctAnswer
  });

  await UserAnswer.findAll({
    where: {
      questionId: data.currentQuestion._value,
      answer: correctAnswer
    }
  }).then(async (res) => {
    await QuestionStatus.update({ 
      correctUserCount: res.length,
      deletedAt: 'finished'
    }, {
      where: {
        questionId: data.currentQuestion._value
      }
    })
  });

  // 현재 진행중인 문제 업데이트
  await Event.update({ currQuestion: null }, {
    where: {
      id: EVENTNUM
    }
  });

  let result = {
    correctAnswer,
    currentQuestion: data.currentQuestion._value
  }

  socket.broadcast.emit('show-answer', result);
}

exports.checkAnswer = async function (socket, data) {
  // 유저가 선택한 답안
  let userAnswer = await UserAnswer.findAll({
    where: {
      einumber: data.userInfo.einumber,
      questionId: data.number
    },
    attributes: ['answer']
  }).then((res) => {
    if (res.length) {
      return res[0].dataValues.answer;
    }
  });

  // 문제 가져오기
  let questionData = await Question.findAll({
    where: {
      number: data.number
    }
  }).then((res) => {
    return res[0].dataValues
  });
  
  let answerData = [];
  await Answer.findAll({
    where: {
      questionId: data.number
    }
  }).then((res) => {
    for (const ele of res) {
      answerData.push(ele.dataValues);
    }
  });

  // 정답 맞춘 사람 가져오기
  let eiArray = [];
  await UserAnswer.findAll({
    where: {
      questionId: data.number,
      answer: data.correctAnswer
    }
  }).then((res) => {
    for (let ele of res) {
      eiArray.push(ele.dataValues.einumber);
    }
  });


  let correctUserData = [];
  User.belongsTo(Team, { foreignKey: 'teamId' });
  await User.findAll({
    where: {
      einumber: eiArray
    },
    include: [Team]
  }).then((res) => {
    for (let ele of res) {
      let obj = {};
      obj['id'] = ele.dataValues.id;
      obj['einumber'] = ele.dataValues.einumber;
      obj['name'] = ele.dataValues.name;
      obj['isAdmin'] = ele.dataValues.isAdmin;
      obj['team'] = ele.dataValues.Team.dataValues.name;
      correctUserData.push(obj)
    }
  });
  

  let result = {
    userAnswer,
    correctAnswer: data.correctAnswer,
    answerData,
    questionData,
    correctUserData
  }


  // 정답 비교 후 유저에게 전달
  if (userAnswer === data.correctAnswer) {
    result['isCorrect'] = true;
  } else {
    result['isCorrect'] = false;
    await UserAlive.update({ deletedAt: 'dead' }, {
      where: {
        einumber: data.userInfo.einumber
      }
    });
  }
  socket.emit('check-answer', result);
}

exports.rejoin = async function (socket, data) {
  // 전체 인원 정보
  User.belongsTo(Team, { foreignKey: 'teamId' });

  let teamData = [];
  const teamInfo = await User.findAll({
    include: [Team]
  });
  
  for (const team of teamInfo) {
    let obj = {};
    obj['einumber'] = team.einumber,
    obj['name'] = team.name,
    obj['team'] = team.Team.name

    teamData.push(obj);
  }

  // 현재 진행중인 문제
  let currentQuestion = null;
  const questionInfo = await Event.findAll({
    where: {
      id: EVENTNUM
    },
    attributes: ['currQuestion']
  });

  currentQuestion = questionInfo[0].dataValues.currQuestion;

  let result = {
    teamData,
    currentQuestion
  }

  socket.emit('rejoin', result);
}

exports.revive = async function (socket, data) {
  await UserAlive.update({deletedAt: null}, {
    where: {
      einumber: data.einumber
    }
  });

  socket.emit('revive');
}

exports.updateCurrentUser = async function (socket, data) {
  let totalUser = await QuestionStatus.findAll({
    where: {
      questionId: data
    }
  })
  .then(res => {
    if (res.length) {
      return res[0].dataValues.totalUserCount;
    } else {
      return 0
    }
  });

  let currentUser = await UserAnswer.findAll({
    where: {
      questionId: data,
      answer: {
        [Op.ne]: null
      }
    }
  })
  .then(res => {
    return res.length;
  });
  
  let result = {
    totalUser,
    currentUser
  }
  
  socket.emit('update-current-user', result);
}

exports.showEndWinner = async function (socket, data) {

  // 유저정보 가져오기
  User.hasMany(UserAlive);
  User.belongsTo(Team, { foreignKey: 'teamId' });
  UserAlive.belongsTo(User, { foreignKey: 'userId' });


  let userData = [];
  const userInfo = await User.findAll({
    include: [UserAlive, Team]
  })

  for (const user of userInfo) {
    let obj = {};

    obj['einumber'] = user.dataValues.einumber;
    obj['name'] = user.dataValues.name;
    obj['teamName'] = user.dataValues.Team.dataValues.name;
    obj['teamColor'] = user.dataValues.Team.dataValues.color;
    if (user.dataValues.UserAlives.length) {
      if (!user.dataValues.UserAlives[0].dataValues.deletedAt) {
        obj['isAlive'] = true;
      } else {
        obj['isAlive'] = false;
      }
    }
    
    userData.push(obj);
  }

  let userDead = await UserAlive.findAll({
    attributes: ['deletedAt', 'einumber'],
  }).then(res => {
    let losers = [];
    if (res[0].deletedAt === 'dead') {
      losers.push(res[0]);
    }
    return losers;
  });

  let result = {
    userData,
    userDead
  }

  socket.broadcast.emit('show-end-winner', result);
}


// 새로고침 시 실행되는 함수
exports.onAdminRefresh = async function (req, res) {
  // 문제 가져오기
  Question.hasOne(QuestionStatus);
  let questionData = [];
  const questionInfo = await Question.findAll({
    include: [QuestionStatus]
  });

  for (const question of questionInfo) {
    let obj = {};

    obj['number'] = question.dataValues.number;
    obj['question'] = question.dataValues.question;
    obj['type'] = question.dataValues.type;

    if (question.QuestionStatus) {
      obj['totalUserCount'] = question.QuestionStatus.totalUserCount;
      obj['correctUserCount'] = question.QuestionStatus.currentUserCount;
      obj['isStarted'] = true;

      if (question.QuestionStatus.deletedAt) {
        obj['isFinished'] = true;
      } else {
        obj['isFinished'] = false;
      }

    } else {
      obj['isStarted'] = false;
    }

    questionData.push(obj);
  }

  // 유저 정보 가져오기
  User.hasMany(UserAlive);
  User.belongsTo(Team, { foreignKey: 'teamId' });
  UserAlive.belongsTo(User, { foreignKey: 'userId' });


  let userData = [];
  const userInfo = await User.findAll({
    include: [UserAlive, Team]
  })

  for (const user of userInfo) {
    let obj = {};

    obj['einumber'] = user.dataValues.einumber;
    obj['name'] = user.dataValues.name;
    obj['teamName'] = user.dataValues.Team.dataValues.name;
    obj['teamColor'] = user.dataValues.Team.dataValues.color;

    if (user.dataValues.UserAlives.length) {
      if (!user.dataValues.UserAlives[0].dataValues.deletedAt) {
        obj['isAlive'] = true;
      } else {
        obj['isAlive'] = false;
      }
    }
    
    userData.push(obj);
  }

  // 현재 진행중인 문제 가져오기
  const currentQuestion = await Event.findAll({
    where: {
      id: EVENTNUM
    },
    attributes: ['currQuestion']
  }).then(res => {
    return res[0].dataValues.currQuestion;
  });

  // 퀴즈를 푼 인원
  const currentUser = await UserAnswer.findAll({
    where: {
        questionId: currentQuestion,
        answer: {
          [Op.ne]: null
        }
    }
  })
  .then(res => {
    return res.length;
  });

  // 퀴즈에 접속한 유저 인원
  const totalUser = await QuestionStatus.findAll({
    where: {
      questionId: currentQuestion
    }
  })
  .then(res => {
    if (res.length) {
      return res[0].dataValues.totalUserCount;
    }
  });

  let result = {
    questionData,
    userData,
    currentQuestion,
    currentUser,
    totalUser
  }

  return res.json(result)
}

exports.onWaitingRefresh = async function (req, res) {
  // 전체 유저 정보
  User.belongsTo(Team, { foreignKey: 'teamId' });

  const userInfo = await User.findAll({
    include: [Team]
  });

  let userData = [];
  for (const user of userInfo) {
    let obj = {};
    obj['einumber'] = user.einumber,
    obj['name'] = user.name,
    obj['team'] = user.Team.name

    userData.push(obj);
  }

  // 현재 진행중인 문제 유무 확인
  const currentQuestion = await Event.findAll({
    where: {
      id: EVENTNUM
    },
    attributes: ['currQuestion']
  });

  let result = {
    userData,
    currentQuestion: currentQuestion[0].dataValues.currQuestion
  }

  return res.json(result)
}

exports.onQuizRefresh = async function (req, res) {
  // 퀴즈 정보 가져오기
  Question.hasMany(Answer);
  Answer.belongsTo(Question, { foreignKey: 'questionId' });

  let questionData = {};
  let currQuestion = null;

  await Event.findAll({
    where: {
      id: EVENTNUM
    },
    attributes: ['currQuestion']
  }).then(async (res) => {
    currQuestion = res[0].dataValues.currQuestion;

    const questionInfo = await Question.findAll({
      where: {
        number : currQuestion
      },
      include: [Answer]
    });

    let answers = [];
    for (const answer of questionInfo[0].Answers) {
      answers.push({ text: answer.dataValues.text })
    };

    questionData['number'] = questionInfo[0].dataValues.number;
    questionData['question'] = questionInfo[0].dataValues.question;
    questionData['type'] = questionInfo[0].dataValues.type;
    questionData['answers'] = answers;
  });

  // 사용자가 탈락했는지 확인
  let isAlive = await UserAlive.findAll({
    where: {
      einumber: req.query.userInfo.einumber
    }
  }).then((res) => {
    if (res[0].dataValues.deletedAt) {
      return false;
    } else {
      return true;
    }
  });

  questionData['isAlive'] = isAlive;

  // 기존에 선택한 보기가 있는지 확인
  await UserAnswer.findAll({
    where: {
      questionId: currQuestion,
      einumber: req.query.userInfo.einumber
    }
  }).then(res => {
    if (res.length) {
      questionData['selectedAnswer'] = res[0].dataValues.answer;
    }
  })

  return res.json(questionData);
}


// 테스트용 함수
exports.testApi = async function (req, res) {
  console.log('test API')
}

exports.testSocket = async function (socket, data) {
  let questionData = await Question.findAll({
    where: {
      number: data.number
    }
  }).then((res) => {
    return res[0].dataValues
  });
  
  let answerData = [];
  await Answer.findAll({
    where: {
      questionId: data.number
    }
  }).then((res) => {
    for (const ele of res) {
      console.log(ele.dataValues);
      answerData.push(ele.dataValues);
    }
  });
}