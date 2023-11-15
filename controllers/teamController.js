const { Event, Team, User } = require('../models')
const { sendResponse, sendError } = require('../utils/response')

exports.getTeamList = async function (req, res) {
  const event = await Event.findOne({
    where: {
      isEnd: false
    }
  })

  if (!event) {
    sendError(res, 403, '진행 중인 퀴즈가 없습니다.')
  }

  const teams = await Team.findAll({
    attributes: ['id', 'color', 'name'],
    where: {
      EventId: event.id
    },
    include: [
      {
        model: User,
        attributes: ['id', 'name']
      }
    ]
  })

  sendResponse(res, teams)
}
