const { SOCKET_EVENT } = require('../socket')

const { Op } = require('sequelize')
const { Event, User } = require('../models')

exports.socketLogin = async function (socket, data) {
  const event = await Event.findOne({
    where: {
      isEnd: false
    }
  })

  if (!event) {
    return socket.emit(SOCKET_EVENT.LOGIN, {
      error: true,
      msg: '진행 중인 퀴즈가 없습니다.'
    })
  }

  const user = await User.findOne({
    where: {
      [Op.or]: [{
        einumber: data.id
      }, {
        name: data.id
      }]
    }
  })

  console.log(user)

  if (!user) {
    return socket.emit(SOCKET_EVENT.LOGIN, {
      error: true,
      msg: '사용자가 존재하지 않습니다.'
    })
  }

  return socket.emit(SOCKET_EVENT.LOGIN, {
    data: {
      id: user.id,
      name: user.name,
      einumber: user.einumber,
      teamId: user.teamId,
      isAdmin: user.isAdmin
    }
  })
}
