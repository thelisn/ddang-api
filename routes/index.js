const express = require("express");
const router = express.Router();
const EVENTNUM = 1;
const Op = require("sequelize").Op;

const { Team } = require("../models");
const { Event } = require("../models");
const { Answer } = require("../models");

const { QuestionStatus } = require("../models");
const { Question } = require("../models");

const { User } = require("../models");
const { UserAlive } = require("../models");
const { UserAnswer } = require("../models");

// 새로고침 시 실행되는 함수
async function onAdminRefresh(req, res) {
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

    if (user.dataValues.UserAlives.length) {
      if (!user.dataValues.UserAlives[0].dataValues.deletedAt) {
        obj["isAlive"] = true;
      } else {
        obj["isAlive"] = false;
      }
    } else {
      obj["isAlive"] = null;
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
    currentUser,
    totalUser,
  };

  return res.json(result);
}

async function onWaitingRefresh(req, res) {
  // 전체 유저 정보
  User.hasMany(UserAlive);
  User.belongsTo(Team, { foreignKey: "teamId" });
  UserAlive.belongsTo(User, { foreignKey: "userId" });

  const userInfo = await User.findAll({ include: [UserAlive, Team] });

  let userData = [];

  for (const user of userInfo) {
    let obj = {};
    obj["einumber"] = user.einumber;
    obj["name"] = user.name;
    obj["team"] = user.Team.name;
    obj["isEnter"] = !!user?.UserAlives.length;

    userData.push(obj);
  }

  // 현재 진행중인 문제 유무 확인
  const currentQuestion = await Event.findAll({
    where: {
      id: EVENTNUM,
    },
    attributes: ["currQuestion"],
  });

  let result = {
    userData,
    currentQuestion: currentQuestion[0].dataValues.currQuestion,
  };

  return res.json(result);
}

async function onQuizRefresh(req, res) {
  // 퀴즈 정보 가져오기
  Question.hasMany(Answer);
  Answer.belongsTo(Question, { foreignKey: "questionId" });

  const einumber = req.query.userInfo.einumber;
  let currQuestion = null;

  // 현재 문제 데이터 확인
  const eventData = await Event.findOne({
    where: { id: EVENTNUM },
    attributes: ["currQuestion"],
  });
  const currentQuestion = eventData.dataValues.currQuestion;
  const questionInfo = await Question.findOne({ where: { number: currentQuestion }, include: [Answer] });
  const answers = questionInfo.Answers.map((answer) => ({ text: answer.dataValues.text }));

  // 기존에 선택한 보기가 있는지 확인
  const selectedAnswer = await UserAnswer.findOne({ where: { questionId: currQuestion, einumber } }).then((res) =>
    !!res?.dataValues?.answer ? res.dataValues.answer : null
  );
  // 사용자가 탈락했는지 확인
  const isAlive = await UserAlive.findOne({ where: { einumber } }).then((res) => !res.dataValues.deletedAt);

  const questionData = {
    number: questionInfo.dataValues.number,
    question: questionInfo.dataValues.question,
    answers,
    selectedAnswer,
    isAlive,
  };

  return res.json(questionData);
}

async function onResultRefresh(req, res) {
  User.belongsTo(Team, { foreignKey: "teamId" });
  UserAnswer.belongsTo(User, { foreignKey: "einumber", targetKey: "einumber" });
  UserAnswer.belongsTo(Answer, { foreignKey: "answer", targetKey: "number" });
  Answer.hasMany(UserAnswer, { foreignKey: "answer", sourceKey: "number" });

  const currentQuestion = await QuestionStatus.findAll({ where: { deletedAt: "finished" } }).then(
    (res) => res.at(-1).questionId
  );
  const correctAnswer = await Question.findOne({ where: { number: currentQuestion } }).then(
    (res) => res.dataValues.correctAnswer
  );

  // 문제 가져오기
  const questionData = await Question.findOne({ where: { number: currentQuestion } }).then((res) => res.dataValues);
  const answerData = await Answer.findAll({
    where: { questionId: currentQuestion },
    include: [
      {
        model: UserAnswer,
        required: false,
        where: { questionId: currentQuestion },
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

  const userAnswer = await UserAnswer.findOne({
    where: { questionId: currentQuestion, einumber: req.query.userInfo.einumber },
  });
  const isCorrect = userAnswer.answer === correctAnswer;

  // 문제 틀렸을 경우, 유저 deletedAt 업데이트
  if (!isCorrect) await UserAlive.update({ deletedAt: "dead" }, { where: { einumber: req.query.userInfo.einumber } });

  const result = {
    correctAnswer: correctAnswer,
    questionData,
    answerData,
    userAnswer: userAnswer.answer,
    isCorrect,
  };

  res.json(result);
}

router.get("/admin", onAdminRefresh);
router.get("/waiting", onWaitingRefresh);
router.get("/quiz", onQuizRefresh);
router.get("/result", onResultRefresh);

module.exports = router;
