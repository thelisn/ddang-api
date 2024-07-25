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
  const userInfo = users.filter((v) => {
    const _data = {
      id: v.id,
      einumber: v.einumber,
      name: v.name,
      isAdmin: v.isAdmin,
      teamName: v.Team.name,
    };

    return v.name === value && _data;
  });

  if (!!!userInfo.length) {
    return socket.emit("login", {
      error: true,
      msg: "사용자가 존재하지 않습니다.",
    });
  }

  // 사용자가 생존했는지 확인을 위한 테이블 생성
  if (!userInfo.isAdmin) {
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

  let questionData = {};
  let currQuestion = null;

  await Event.findAll({
    where: {
      id: EVENTNUM,
    },
    attributes: ["currQuestion"],
  }).then(async (res) => {
    currQuestion = res[0].dataValues.currQuestion;

    const questionInfo = await Question.findAll({
      where: {
        number: currQuestion,
      },
      include: [Answer],
    });

    let answers = [];
    for (const answer of questionInfo[0].Answers) {
      answers.push({ text: answer.dataValues.text });
    }

    questionData["number"] = questionInfo[0].dataValues.number;
    questionData["question"] = questionInfo[0].dataValues.question;
    questionData["type"] = questionInfo[0].dataValues.type;
    questionData["answers"] = answers;
  });

  // 사용자가 탈락했는지 확인
  let isAlive = await UserAlive.findAll({
    where: {
      einumber: data.einumber,
    },
  }).then((res) => {
    if (res[0].dataValues.deletedAt) {
      return false;
    } else {
      return true;
    }
  });

  questionData["isAlive"] = isAlive;

  // UserAnswer에 row 추가
  await UserAnswer.findAll({
    where: {
      einumber: data.einumber,
      questionId: currQuestion,
    },
  }).then(async (res) => {
    if (!res.length) {
      await UserAnswer.create({
        questionId: currQuestion,
        einumber: data.einumber,
      });

      // 퀴즈 푼 인원 업데이트
      await QuestionStatus.update(
        { totalUserCount: sequelize.literal("totalUserCount + 1") },
        {
          where: {
            questionId: currQuestion,
          },
        }
      );
    } else {
      await UserAnswer.findAll({
        where: {
          einumber: data.einumber,
          questionId: currQuestion,
        },
      }).then((res) => {
        if (res[0].dataValues.answer) {
          questionData["selectedAnswer"] = res[0].dataValues.answer;
        }
      });
    }
  });

  // socket.emit('join-quiz', questionData);
  socket.broadcast.emit("join-quiz", questionData);
};

exports.selectAnswer = async function (socket, data) {
  // 사용자가 보기 선택 시 User_Answer 테이블 생성 또는 업데이트
  await UserAnswer.findAll({
    where: {
      einumber: data.userInfo.einumber,
      questionId: data.number,
    },
  }).then(async (res) => {
    await UserAnswer.update(
      { answer: data.answer },
      {
        where: {
          einumber: data.userInfo.einumber,
          questionId: data.number,
        },
      }
    );
  });

  socket.broadcast.emit("select-answer");
};

exports.checkAnswer = async function (socket, data) {
  // 유저가 선택한 답안
  let userAnswer = await UserAnswer.findAll({
    where: {
      einumber: data.userInfo.einumber,
      questionId: data.number,
    },
    attributes: ["answer"],
  }).then((res) => {
    if (res.length) {
      return res[0].dataValues.answer;
    }
  });

  // 문제 가져오기
  let questionData = await Question.findAll({
    where: {
      number: data.number,
    },
  }).then((res) => {
    return res[0].dataValues;
  });

  let answerData = [];
  await Answer.findAll({
    where: {
      questionId: data.number,
    },
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
      answer: data.correctAnswer,
    },
  }).then((res) => {
    for (let ele of res) {
      eiArray.push(ele.dataValues.einumber);
    }
  });

  let correctUserData = [];
  User.belongsTo(Team, { foreignKey: "teamId" });
  await User.findAll({
    where: {
      einumber: eiArray,
    },
    include: [Team],
  }).then((res) => {
    for (let ele of res) {
      let obj = {};
      obj["id"] = ele.dataValues.id;
      obj["einumber"] = ele.dataValues.einumber;
      obj["name"] = ele.dataValues.name;
      obj["isAdmin"] = ele.dataValues.isAdmin;
      obj["team"] = ele.dataValues.Team.dataValues.name;
      correctUserData.push(obj);
    }
  });

  let result = {
    userAnswer,
    correctAnswer: data.correctAnswer,
    answerData,
    questionData,
    correctUserData,
  };

  // 정답 비교 후 유저에게 전달
  if (userAnswer === data.correctAnswer) {
    result["isCorrect"] = true;
  } else {
    result["isCorrect"] = false;
    await UserAlive.update(
      { deletedAt: "dead" },
      {
        where: {
          einumber: data.userInfo.einumber,
        },
      }
    );
  }
  socket.emit("check-answer", result);
};
