const { User, sequelize } = require("../models");
const { Team } = require("../models");
const { QuestionStatus } = require("../models");
const { Question } = require("../models");
const { UserAlive } = require("../models");
const { UserAnswer } = require("../models");
const { Event } = require("../models");
const { Answer } = require("../models");
const EVENTNUM = 1;

// @NOTE login 자체는 axios로 받고 별도로 wating 전용 socket 뚫어줘야 할 듯.
// 그러면 rejoin을 굳이 안써도 될 것 같은데.
exports.login = async function (socket, value) {
  if (!value) {
    return socket.emit("login", {
      error: true,
      msg: "입력된 값이 없습니다.",
    });
  }

  // 유저 정보
  User.belongsTo(Team, { foreignKey: "teamId" });
  const users = await User.findAll({ include: [Team] });

  const userInfo = users
    .filter((v) => v.name === value)
    .map((v) => ({
      id: v.id,
      einumber: v.einumber,
      name: v.name,
      isAdmin: v.isAdmin,
      teamName: v.Team.name,
    }));

  if (!userInfo.length) {
    return socket.emit("login", {
      error: true,
      msg: "사용자가 존재하지 않습니다.",
    });
  }

  // 각 팀 정보
  const teamData = users.map((team) => ({
    einumber: team.einumber,
    name: team.name,
    team: team.Team.name,
  }));

  // 현재 진행중인 문제
  const eventData = await Event.findOne({ where: { id: EVENTNUM }, attributes: ["currQuestion"] });
  const currentQuestion = eventData.dataValues.currQuestion;

  // 결과
  const result = {
    error: false,
    userData: userInfo[0],
    teamData,
    currentQuestion,
  };

  // 메인 페이지에 login 이벤트 트리거
  socket.emit("login", result);

  // User, Admin 페이지에 login 이벤트 트리거
  setTimeout(() => {
    socket.emit("login", result);
  }, 10);
};

exports.rejoin = async function (socket) {
  // 전체 인원 정보
  User.belongsTo(Team, { foreignKey: "teamId" });

  const teamInfo = await User.findAll({ include: [Team] });
  const teamData = teamInfo.map((team) => ({
    einumber: team.einumber,
    name: team.name,
    team: team.Team.name,
  }));

  // 현재 진행중인 문제
  const eventData = await Event.findOne({ where: { id: EVENTNUM }, attributes: ["currQuestion"] });
  const currentQuestion = eventData.dataValues.currQuestion;

  const result = { teamData, currentQuestion };

  socket.emit("rejoin", result);
};

exports.joinQuiz = async function (io, data) {
  // 퀴즈 정보 가져오기
  Question.hasMany(Answer);
  Answer.belongsTo(Question, { foreignKey: "questionId" });

  // 현재 진행중인 문제
  const eventData = await Event.findOne({ where: { id: EVENTNUM }, attributes: ["currQuestion"] });
  const currentQuestion = eventData.dataValues.currQuestion;

  console.log(currentQuestion);

  const questionInfo = await Question.findOne({ where: { number: currentQuestion }, include: [Answer] });
  const answers = questionInfo.Answers.map((answer) => ({ text: answer.dataValues.text }));

  // 사용자가 생존했는지 확인을 위한 테이블 생성
  const userAlive = await UserAlive.findOne({ where: { einumber: data.einumber } });
  const isCreateUserAliveTable = !data.isAdmin && !userAlive;
  let isAlive;

  if (isCreateUserAliveTable) {
    isAlive = UserAlive.create({
      userId: data.id,
      deletedAt: null,
      einumber: data.einumber,
    }).then((v) => v.dataValues.deletedAt !== "dead");
  } else {
    isAlive = userAlive.dataValues.deletedAt !== "dead";
  }

  UserAnswer.belongsTo(User, { foreignKey: "einumber", targetKey: "einumber" });
  UserAnswer.belongsTo(UserAlive, { foreignKey: "einumber", targetKey: "einumber" });
  User.belongsTo(Team, { foreignKey: "teamId" });

  const selectUser = await UserAnswer.findOne({ where: { questionId: currentQuestion, einumber: data.einumber } });

  if (!selectUser) {
    await UserAnswer.create({ questionId: currentQuestion, einumber: data.einumber });
  }

  const userAnswers = await UserAnswer.findAll({
    where: { questionId: currentQuestion },
    include: [
      { model: User, include: [{ model: Team }] },
      { model: UserAlive, where: { deletedAt: null } },
    ],
  });
  const userAnswerInfo = userAnswers.map((v) => {
    const _result = { ...v.dataValues, team: v.dataValues.User.dataValues.Team.dataValues.name };
    delete _result.User;

    return _result;
  });
  const selectedAnswer = selectUser?.answer;

  // 퀴즈 푼 인원 업데이트
  if (!selectUser) {
    await QuestionStatus.update({ totalUserCount: userAnswerInfo.length }, { where: { questionId: currentQuestion } });
  }

  const questionData = {
    number: questionInfo.dataValues.number,
    question: questionInfo.dataValues.question,
    answers,
    isAlive,
    selectedAnswer,
    userAnswerInfo,
  };

  io.emit("join-quiz", questionData);
};

exports.selectAnswer = async function (io, data) {
  UserAnswer.belongsTo(User, { foreignKey: "einumber", targetKey: "einumber" });
  User.belongsTo(Team, { foreignKey: "teamId" });

  // 사용자가 보기 선택 시 User_Answer 테이블 업데이트
  await UserAnswer.update(
    { answer: data.answer },
    { where: { einumber: data.userInfo.einumber, questionId: data.number } }
  );

  const userAnswers = await UserAnswer.findAll({
    where: { questionId: data.number },
    include: [{ model: User, include: [{ model: Team }] }],
  });

  const userAnswerInfo = userAnswers.map((v) => {
    const _result = {
      ...v.dataValues,
      team: v.dataValues.User.dataValues.Team.dataValues.name,
    };
    delete _result.User;

    return _result;
  });

  io.emit("select-answer", userAnswerInfo);
};

exports.checkAnswer = async function (socket, data) {
  // 정답 맞춘 사람 가져오기
  User.belongsTo(Team, { foreignKey: "teamId" });
  UserAnswer.belongsTo(User, { foreignKey: "einumber", targetKey: "einumber" });
  UserAnswer.belongsTo(Answer, { foreignKey: "answer", targetKey: "number" });
  Answer.hasMany(UserAnswer, { foreignKey: "answer", sourceKey: "number" });

  // 문제 가져오기
  const questionData = await Question.findOne({ where: { number: data.number } }).then((res) => res.dataValues);
  const answerData = await Answer.findAll({
    where: { questionId: data.number },
    include: [
      {
        model: UserAnswer,
        required: false,
        where: { questionId: data.number },
        include: [{ model: User, include: [{ model: Team }] }],
      },
    ],
  }).then((res) =>
    res.map((v) => {
      let userData = [];

      if (!!v.dataValues.UserAnswers?.length) {
        userData = v.dataValues.UserAnswers.map((j) => {
          return {
            einumber: j.dataValues.User.dataValues.einumber,
            name: j.dataValues.User.dataValues.name,
            team: j.dataValues.User.dataValues.Team.dataValues.name,
            answer: j.dataValues.answer,
          };
        });
      }

      return {
        number: v.dataValues.number,
        text: v.dataValues.text,
        userData,
      };
    })
  );

  const userAnswer = await UserAnswer.findOne({ where: { questionId: data.number, einumber: data.userInfo.einumber } });
  const isCorrect = userAnswer.answer === data.correctAnswer;

  // 문제 틀렸을 경우, 유저 deletedAt 업데이트
  if (!isCorrect) await UserAlive.update({ deletedAt: "dead" }, { where: { einumber: data.userInfo.einumber } });

  const result = {
    correctAnswer: data.correctAnswer,
    questionData,
    answerData,
    userAnswer: userAnswer.answer,
    isCorrect,
  };

  socket.emit("check-answer", result);
};
