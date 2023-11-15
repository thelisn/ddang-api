const { QuestionStatus } = require('../models')
const { sendResponse, sendError } = require('../utils/response')

exports.getCurrentQuestion = async function (req, res) {
  const question = await QuestionStatus.findOne({
    attributes: ['questionId'],
    where: {
      isCurrent: true
    }
  })

  sendResponse(res, question)
}
