const { User } = require("../models");
const { Team } = require("../models");
const { QuestionStatus } = require("../models");
const { Question } = require("../models");
const { UserAlive } = require("../models");
const { UserAnswer } = require("../models");
const { Event } = require("../models");
const EVENTNUM = 1;
const Op = require("sequelize").Op;

exports.joinAdminQuiz = async function (socket, data) {
  // 문제 가져오기
  Question.hasOne(QuestionStatus);
  let questionData = [];
  const questionInfo = await Question.findAll({
    include: [QuestionStatus],
  });

  for (const question of questionInfo) {
    let obj = {};

    obj["number"] = question.dataValues.number;
    obj["question"] = question.dataValues.question;
    obj["type"] = question.dataValues.type;

    if (question.QuestionStatus) {
      obj["totalUserCount"] = question.QuestionStatus.totalUserCount;
      obj["correctUserCount"] = question.QuestionStatus.currentUserCount;
      obj["isStarted"] = true;

      if (question.QuestionStatus.deletedAt) {
        obj["isFinished"] = true;
      } else {
        obj["isFinished"] = false;
      }
    } else {
      obj["isStarted"] = false;
    }

    questionData.push(obj);
  }

  // 유저 정보 가져오기
  User.hasMany(UserAlive);
  User.belongsTo(Team, { foreignKey: "teamId" });
  UserAlive.belongsTo(User, { foreignKey: "userId" });

  let userData = [];
  const userInfo = await User.findAll({
    include: [UserAlive, Team],
  });

  for (const user of userInfo) {
    let obj = {};

    obj["einumber"] = user.dataValues.einumber;
    obj["name"] = user.dataValues.name;
    obj["teamName"] = user.dataValues.Team.dataValues.name;
    obj["teamColor"] = user.dataValues.Team.dataValues.color;

    if (user.dataValues.UserAlives.length) {
      if (!user.dataValues.UserAlives[0].dataValues.deletedAt) {
        obj["isAlive"] = true;
      } else {
        obj["isAlive"] = false;
      }
    }

    userData.push(obj);
  }

  // 현재 진행중인 문제 가져오기
  const currentQuestion = await Event.findAll({
    where: {
      id: EVENTNUM,
    },
    attributes: ["currQuestion"],
  }).then((res) => {
    return res[0].dataValues.currQuestion;
  });

  // 퀴즈를 푼 인원
  const currentUser = await UserAnswer.findAll({
    where: {
      questionId: currentQuestion,
      answer: {
        [Op.ne]: null,
      },
    },
  }).then((res) => {
    return res.length;
  });

  // 퀴즈에 접속한 유저 인원
  const totalUser = await QuestionStatus.findAll({
    where: {
      questionId: currentQuestion,
    },
  }).then((res) => {
    if (res.length) {
      return res[0].dataValues.totalUserCount;
    }
  });

  let result = {
    questionData,
    userData,
    currentQuestion,
    totalUser,
    currentUser,
  };

  setTimeout(() => {
    socket.emit("join-admin-quiz", result);
  }, 10);
};

exports.startQuiz = async function (socket, data) {
  // Question_Status 생성
  QuestionStatus.create({
    questionId: data.questionNum,
    totalUserCount: 0,
    correctUserCount: 0,
    deletedAt: null,
  });

  // Event의 currentQuestion 업데이트
  await Event.update(
    { currQuestion: data.questionNum },
    {
      where: {
        id: EVENTNUM,
      },
    }
  );

  socket.broadcast.emit("start-quiz", true);
};

exports.showAnswer = async function (socket, data) {
  // 정답 체크 후 맞은 인원 업데이트
  let correctAnswer = await Question.findAll({
    where: {
      number: data.currentQuestion._value,
    },
    attributes: ["correctAnswer"],
  }).then((res) => {
    return res[0].dataValues.correctAnswer;
  });

  await UserAnswer.findAll({
    where: {
      questionId: data.currentQuestion._value,
      answer: correctAnswer,
    },
  }).then(async (res) => {
    await QuestionStatus.update(
      {
        correctUserCount: res.length,
        deletedAt: "finished",
      },
      {
        where: {
          questionId: data.currentQuestion._value,
        },
      }
    );
  });

  // 현재 진행중인 문제 업데이트
  await Event.update(
    { currQuestion: null },
    {
      where: {
        id: EVENTNUM,
      },
    }
  );

  let result = {
    correctAnswer,
    currentQuestion: data.currentQuestion._value,
  };

  socket.broadcast.emit("show-answer", result);
};

exports.updateCurrentUser = async function (socket, data) {
  let totalUser = await QuestionStatus.findAll({
    where: {
      questionId: data,
    },
  }).then((res) => {
    if (res.length) {
      return res[0].dataValues.totalUserCount;
    } else {
      return 0;
    }
  });

  let currentUser = await UserAnswer.findAll({
    where: {
      questionId: data,
      answer: {
        [Op.ne]: null,
      },
    },
  }).then((res) => {
    return res.length;
  });

  let result = {
    totalUser,
    currentUser,
  };

  socket.emit("update-current-user", result);
};

exports.showEndWinner = async function (socket, data) {
  // 유저정보 가져오기
  User.hasMany(UserAlive);
  User.belongsTo(Team, { foreignKey: "teamId" });
  UserAlive.belongsTo(User, { foreignKey: "userId" });

  let userData = [];
  const userInfo = await User.findAll({
    include: [UserAlive, Team],
  });

  for (const user of userInfo) {
    let obj = {};

    obj["einumber"] = user.dataValues.einumber;
    obj["name"] = user.dataValues.name;
    obj["teamName"] = user.dataValues.Team.dataValues.name;
    obj["teamColor"] = user.dataValues.Team.dataValues.color;
    if (user.dataValues.UserAlives.length) {
      if (!user.dataValues.UserAlives[0].dataValues.deletedAt) {
        obj["isAlive"] = true;
      } else {
        obj["isAlive"] = false;
      }
    }

    userData.push(obj);
  }

  let userDead = await UserAlive.findAll({
    attributes: ["deletedAt", "einumber"],
  }).then((res) => {
    let losers = [];
    if (res[0].deletedAt === "dead") {
      losers.push(res[0]);
    }
    return losers;
  });

  let result = {
    userData,
    userDead,
  };

  socket.broadcast.emit("show-end-winner", result);
};

exports.revive = async function (socket, data) {
  await UserAlive.update(
    { deletedAt: null },
    {
      where: {
        einumber: data.einumber,
      },
    }
  );

  socket.emit("revive");
};
