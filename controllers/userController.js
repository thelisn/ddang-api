const { User } = require('../models')
const { sendResponse, sendError } = require('../utils/response')

exports.login = async function (req, res) {
  const where = {}

  console.log(req, res)
  return
  
  if (req.body.id) {
    where.id = req.body.id
  }

  const searchResult = await User.findAll()


  const result = {
    data: searchResult
  }

  return sendResponse(res, result, 200);
}

