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

  // 사용자가 생존했는지 확인을 위한 테이블 생성
  const hasUserAliveTable = await UserAlive.findOne({ where: { einumber: userInfo[0].einumber } });
  const isCreateUserAliveTable = !userInfo[0].isAdmin && !hasUserAliveTable;

  if (isCreateUserAliveTable) {
    UserAlive.create({
      userId: userInfo[0].id,
      deletedAt: null,
      einumber: userInfo[0].einumber,
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

exports.joinQuiz = async function (socket, data) {
  // 퀴즈 정보 가져오기
  Question.hasMany(Answer);
  Answer.belongsTo(Question, { foreignKey: "questionId" });

  // 현재 진행중인 문제
  const eventData = await Event.findOne({ where: { id: EVENTNUM }, attributes: ["currQuestion"] });
  const currentQuestion = eventData.dataValues.currQuestion;

  const questionInfo = await Question.findOne({ where: { number: currentQuestion }, include: [Answer] });
  const answers = questionInfo.Answers.map((answer) => ({ text: answer.dataValues.text }));

  // 사용자가 탈락했는지 확인,
  // 근데 매번 이거 생성되면 로그인 할 때 마다 생성되면 전체를 받아왔다고 가정하자. 그러면 새로 로그인하고 새로 로그인하고 그러면 답이 없어지는거 아닌가?
  // 거기에서 빈틈이 있는데. 이거 All로 받든 One으로 받든 뭔가 create를 계속하면 의미가 없는데.
  const isAlive = await UserAlive.findOne({ where: { einumber: data.einumber } }).then((res) => {
    return !res?.dataValues.deletedAt;
  });

  UserAnswer.belongsTo(User, { foreignKey: "einumber", targetKey: "einumber" });
  User.belongsTo(Team, { foreignKey: "teamId" });

  const userAnswers = await UserAnswer.findAll({
    where: { questionId: currentQuestion },
    include: [
      {
        model: User,
        include: [
          {
            model: Team,
          },
        ],
      },
    ],
  });
  const userAnswerInfo = userAnswers.map((v) => {
    const _result = { ...v.dataValues, team: v.dataValues.User.dataValues.Team.dataValues.name };
    delete _result.User;

    return _result;
  });
  const selectUser = userAnswers.filter((v) => v.dataValues.einumber === data.einumber);
  const selectedAnswer = selectUser[0]?.answer;

  if (!selectUser.length) {
    await UserAnswer.create({ questionId: currentQuestion, einumber: data.einumber });

    // 퀴즈 푼 인원 업데이트
    await QuestionStatus.update(
      { totalUserCount: sequelize.literal("totalUserCount + 1") },
      { where: { questionId: currentQuestion } }
    );
  }

  const questionData = {
    number: questionInfo.dataValues.number,
    question: questionInfo.dataValues.question,
    answers,
    isAlive,
    selectedAnswer,
    userAnswerInfo,
  };

  socket.emit("join-quiz", questionData);
};

exports.selectAnswer = async function (socket, data) {
  UserAnswer.belongsTo(User, { foreignKey: "einumber", targetKey: "einumber" });
  User.belongsTo(Team, { foreignKey: "teamId" });

  // 사용자가 보기 선택 시 User_Answer 테이블 업데이트

  await UserAnswer.update(
    { answer: data.answer },
    { where: { einumber: data.userInfo.einumber, questionId: data.number } }
  );

  const userAnswers = await UserAnswer.findAll({
    where: { questionId: data.number },
    include: [
      {
        model: User,
        include: [
          {
            model: Team,
          },
        ],
      },
    ],
  });

  const userAnswerInfo = userAnswers.map((v) => {
    const _result = { ...v.dataValues, team: v.dataValues.User.dataValues.Team.dataValues.name };
    delete _result.User;

    return _result;
  });

  socket.emit("select-answer", userAnswerInfo);
};

exports.checkAnswer = async function (socket, data) {
  // 정답 맞춘 사람 가져오기
  User.belongsTo(Team, { foreignKey: "teamId" });

  const correctUsers = await UserAnswer.findAll({ where: { questionId: data.number, answer: data.correctAnswer } });
  const eiArray = correctUsers.map((v) => v.dataValues.einumber);
  const userAnswer = correctUsers.find((v) => v.dataValues.einumber === data.userInfo.einumber);

  const isCorrect = !!userAnswer;
  console.log(userAnswer, isCorrect);
  const correctUserData = await User.findAll({ where: { einumber: eiArray }, include: [Team] }).then((res) => {
    return res.map((v) => ({
      id: v.dataValues.id,
      einumber: v.dataValues.einumber,
      name: v.dataValues.name,
      isAdmin: v.dataValues.isAdmin,
      team: v.dataValues.Team.dataValues.name,
    }));
  });

  // 문제 틀렸을 경우, 유저 deletedAt 업데이트
  if (!isCorrect) await UserAlive.update({ deletedAt: "dead" }, { where: { einumber: data.userInfo.einumber } });

  // 문제 가져오기
  const questionData = await Question.findOne({ where: { number: data.number } }).then((res) => res.dataValues);
  const answerData = await Answer.findAll({ where: { questionId: data.number } }).then((res) =>
    res.map((v) => v.dataValues)
  );

  const result = {
    userAnswer,
    correctAnswer: data.correctAnswer,
    answerData,
    questionData,
    correctUserData,
    isCorrect,
  };

  socket.emit("check-answer", result);
};
