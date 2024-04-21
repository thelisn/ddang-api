const { Event, Question, QuestionStatus, User} = require('../models')
const { sendResponse, sendError } = require('../utils/response')

exports.getQuestionList = async function (req, res) {
  const event = await Event.findOne({
    where: {
      isEnd: false
    }
  })

  if (!event) {
    sendError(res, 403, '진행 중인 퀴즈가 없습니다.')
  }

  const questions = await Question.findAll({
    attributes: ['id', 'number', 'question', 'EventId', 'AnswerId'],
    where: {
      EventId: event.id
    },
    include: [
      {
        model: QuestionStatus,
        attributes: ['totalUserCount', 'correctUserCount', 'isCurrent']
      }
    ],
    order: [['number', 'ASC']]
  })

  sendResponse(res, questions)
}

exports.getCurrentQuestion = async function (req, res) {
  const question = await QuestionStatus.findOne({
    attributes: ['questionId'],
    where: {
      isCurrent: true
    }
  })

  sendResponse(res, question)
}
