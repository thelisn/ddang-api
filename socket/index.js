const { User } = require('../models')
const { Team } = require('../models')
const { QuestionStatus } = require('../models')
const { Question } = require('../models')
const { UserAlive } = require('../models')
const { UserAnswer } = require('../models')
const { Event } = require('../models')
const { Answer } = require('../models')
const EVENTNUM = 1;

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
      einumber: data
    }
  }).then((res) => {
    if (res[0].dataValues.deletedAt) {
      return false;
    } else {
      return true;
    }
  });

  questionData['isAlive'] = isAlive;

  // 퀴즈 푼 인원 업데이트
  await QuestionStatus.update({ totalUserCount: +1 }, {
    where: {
      questionId: currQuestion
    }
  });

  socket.emit('join-quiz', questionData);
}

exports.joinAdminQuiz = async function (socket, data) {
  // 문제 가져오기
  Question.belongsTo(QuestionStatus, { foreignKey: 'number' });

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

  let result = {
    questionData,
    userData
  }

  setTimeout(() => {
    socket.emit('join-admin-quiz', result);
  }, 10)
}

exports.startQuiz = async function (socket, data) {
  // Question_Status 생성
  QuestionStatus.create({
    questionId: data,
    totalUserCount: 0,
    correctUserCount: 0,
    deletedAt: null
  });

  // Event의 currentQuestion 업데이트
  await Event.update({ currQuestion: data }, {
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
      einumber: data.einumber,
      questionId: data.number,
    }
  }).then(async (res) => {
    if (!res.length) {
      UserAnswer.create({
        questionId: data.number,
        answer: data.answer,
        einumber: data.einumber
      })
    } else {
      await UserAnswer.update({ answer: data.answer }, {
        where: {
          einumber: data.einumber,
          questionId: data.number
        }
      })
    }
  })
}

exports.showAnswer = async function (socket, data) {
  // 정답 체크 후 맞은 인원 업데이트
  let correctAnswer = await Question.findAll({
    where: {
      number: data
    },
    attributes: ['correctAnswer']
  }).then(res => {
    return res[0].dataValues.correctAnswer
  });

  await UserAnswer.findAll({
    where: {
      questionId: data,
      answer: correctAnswer
    }
  }).then(async (res) => {
    await QuestionStatus.update({ correctUserCount: res.length }, {
      where: {
        questionId: data
      }
    })
  })


  socket.broadcast.emit('show-answer', correctAnswer);
}

exports.checkAnswer = async function (socket, data) {
  // 유저가 선택한 답안
  let userAnswer = await UserAnswer.findAll({
    where: {
      einumber: data.einumber,
      questionId: data.number
    },
    attributes: ['answer']
  }).then((res) => {
    return res[0].dataValues.answer;
  })

  // 정답
  let answer = await Question.findAll({
    where: {
      number: data.number
    },
    attributes: ['correctAnswer']
  }).then((res) => {
    return res[0].dataValues.correctAnswer
  });

  // 정답 비교 후 유저에게 전달
  if (userAnswer === answer) {
    socket.emit('check-answer', true);
  } else {
    await UserAlive.update({ deletedAt: 'dead' }, {
      where: {
        einumber: data.einumber
      }
    });
    socket.emit('check-answer', false);
  }

  // 현재 진행중인 문제 업데이트
  await Event.update({ currQuestion: null }, {
    where: {
      id: EVENTNUM
    }
  });
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