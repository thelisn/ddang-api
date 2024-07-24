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
    currentUser,
    totalUser,
  };

  return res.json(result);
}

async function onWaitingRefresh(req, res) {
  // 전체 유저 정보
  User.belongsTo(Team, { foreignKey: "teamId" });

  const userInfo = await User.findAll({
    include: [Team],
  });

  let userData = [];
  for (const user of userInfo) {
    let obj = {};
    (obj["einumber"] = user.einumber), (obj["name"] = user.name), (obj["team"] = user.Team.name);

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

  console.log(req.query);

  const einumber = req.query.userInfo.einumber;
  let currQuestion = null;

  // 사용자가 탈락했는지 확인
  const isAlive = await UserAlive.findAll({ where: { einumber } }).then((res) => !res[0].dataValues.deletedAt);
  // 현재 문제 데이터 확인
  const questionDataObj = await Event.findAll({
    where: { id: EVENTNUM },
    attributes: ["currQuestion"],
  }).then(async (res) => {
    currQuestion = res[0].dataValues.currQuestion;

    const questionInfo = await Question.findAll({ where: { number: currQuestion }, include: [Answer] });
    const answers = questionInfo[0].Answers.map((answer) => ({ text: answer.dataValues.text }));

    return {
      number: questionInfo[0].dataValues.number,
      question: questionInfo[0].dataValues.question,
      type: questionInfo[0].dataValues.type,
      answers: answers,
    };
  });
  // 기존에 선택한 보기가 있는지 확인
  const selectedAnswer = await UserAnswer.findAll({ where: { questionId: currQuestion, einumber } }).then((res) =>
    !!res.length ? res[0].dataValues.answer : null
  );

  const questionData = {
    ...questionDataObj,
    selectedAnswer,
    isAlive,
  };

  return res.json(questionData);
}

router.get("/admin", onAdminRefresh);
router.get("/waiting", onWaitingRefresh);
router.get("/quiz", onQuizRefresh);

module.exports = router;
