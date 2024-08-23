const { User } = require("../models");
const { Team } = require("../models");
const { QuestionStatus } = require("../models");
const { Question } = require("../models");
const { UserAlive } = require("../models");
const { UserAnswer } = require("../models");
const { Event } = require("../models");
const EVENTNUM = 1;
const Op = require("sequelize").Op;

exports.joinAdminQuiz = async function (socket) {
  // 문제 가져오기
  Question.hasOne(QuestionStatus);

  const questionInfo = await Question.findAll({ include: [QuestionStatus] });
  const questionData = questionInfo.map((question) => {
    const _obj = {
      number: question.dataValues.number,
      question: question.dataValues.question,
      totalUserCount: question?.QuestionStatus?.totalUserCount ?? 0,
      correctUserCount: question?.QuestionStatus?.currentUserCount ?? 0,
      isStarted: !!question?.QuestionStatus,
      isFinished: !!question?.QuestionStatus?.deletedAt,
    };

    return _obj;
  });

  // 유저 정보 가져오기
  User.hasMany(UserAlive);
  User.belongsTo(Team, { foreignKey: "teamId" });
  UserAlive.belongsTo(User, { foreignKey: "userId" });

  const userInfo = await User.findAll({ include: [UserAlive, Team] });
  const userData = userInfo.map((user) => {
    const _obj = {
      einumber: user.dataValues.einumber,
      name: user.dataValues.name,
      teamName: user.dataValues.Team.dataValues.name,
      isAlive: !user.dataValues?.UserAlives[0]?.dataValues.deletedAt,
    };

    return _obj;
  });

  // 현재 진행중인 문제 가져오기
  const currentQuestion = await Event.findOne({ where: { id: EVENTNUM }, attributes: ["currQuestion"] }).then(
    (res) => res.dataValues.currQuestion
  );

  // 퀴즈를 푼 인원
  const currentUser = await UserAnswer.findAll({
    where: { questionId: currentQuestion, answer: { [Op.ne]: null } },
  }).then((res) => res.length);

  // 퀴즈에 접속한 유저 인원
  const totalUser = await QuestionStatus.findOne({ where: { questionId: currentQuestion } }).then(
    (res) => res?.dataValues.totalUserCount ?? 0
  );

  const result = {
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
  await Event.update({ currQuestion: data.questionNum }, { where: { id: EVENTNUM } });

  socket.broadcast.emit("start-quiz", true);
};

exports.showAnswer = async function (socket, data) {
  // 정답 체크 후 맞은 인원 업데이트
  const correctAnswer = await Question.findOne({
    where: { number: data.currentQuestion._value },
    attributes: ["correctAnswer"],
  }).then((res) => res.dataValues.correctAnswer);

  const userAnswer = await UserAnswer.findAll({
    where: { questionId: data.currentQuestion._value, answer: correctAnswer },
  });
  const answerEiNumberArray = userAnswer.map((v) => v.einumber);
  const wrongUserEiNumberArray = await UserAlive.findAll().then((v) =>
    v.reduce((acc, curr) => {
      if (!answerEiNumberArray.includes(curr.einumber)) acc.push(curr.einumber);
      return acc;
    }, [])
  );

  await QuestionStatus.update(
    { correctUserCount: userAnswer.length, deletedAt: "finished" },
    { where: { questionId: data.currentQuestion._value } }
  );
  await UserAlive.update({ deletedAt: "dead" }, { where: { einumber: wrongUserEiNumberArray } });

  // 현재 진행중인 문제 업데이트
  await Event.update({ currQuestion: null }, { where: { id: EVENTNUM } });

  const result = {
    correctAnswer,
    currentQuestion: data.currentQuestion._value,
  };

  socket.broadcast.emit("show-answer", result);
};

exports.updateCurrentUser = async function (socket, data) {
  const totalUser = await QuestionStatus.findOne({ where: { questionId: data } }).then(
    (res) => res?.dataValues.totalUserCount ?? 0
  );

  const currentUser = await UserAnswer.findAll({ where: { questionId: data, answer: { [Op.ne]: null } } }).then(
    (res) => res.length
  );

  const result = { totalUser, currentUser };

  socket.emit("update-current-user", result);
};

exports.showEndWinner = async function (socket, callback) {
  // 유저정보 가져오기
  User.hasMany(UserAlive);
  User.belongsTo(Team, { foreignKey: "teamId" });
  UserAlive.belongsTo(User, { foreignKey: "userId" });

  const userInfo = await User.findAll({ include: [UserAlive, Team] });
  const userData = userInfo.map((user) => {
    const _obj = {
      einumber: user.dataValues.einumber,
      name: user.dataValues.name,
      teamName: user.dataValues.Team.dataValues.name,
      isAlive: user.dataValues?.UserAlives[0]?.dataValues.deletedAt,
    };

    return _obj;
  });
  await QuestionStatus.update({ deletedAt: "finished" }, { where: {} });

  // 문제 가져오기
  Question.hasOne(QuestionStatus);

  const questionInfo = await Question.findAll({ include: [QuestionStatus] });
  const questionData = questionInfo.map((question) => {
    const _obj = {
      number: question.dataValues.number,
      question: question.dataValues.question,
      totalUserCount: question?.QuestionStatus?.totalUserCount ?? 0,
      correctUserCount: question?.QuestionStatus?.currentUserCount ?? 0,
      isStarted: false,
      isFinished: !!question?.QuestionStatus?.deletedAt,
    };

    return _obj;
  });

  const result = { userData, questionData };

  socket.broadcast.emit("show-end-winner", result);
  callback(result);
};

exports.reStartQuiz = async function (socket, callback) {
  await QuestionStatus.truncate();
  await UserAnswer.truncate();
  await UserAlive.truncate();
  await Event.update({ currQuestion: null }, { where: { id: EVENTNUM } });

  socket.broadcast.emit("re-start-quiz");
  callback();
};

exports.revive = async function (socket, data) {
  await UserAlive.update({ deletedAt: null }, { where: { einumber: data.einumber } });

  socket.emit("revive");
};
