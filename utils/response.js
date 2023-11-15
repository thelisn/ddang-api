exports.sendError = function (res, code = 500, message = null) {
  let result = {
    success: false,
    code,
    message,
    data: null
  }
  return res.status(200).json(result)

}

exports.sendResponse = function (res, data, code = 200, message = null) {
  const result = {
    success: true,
    code,
    message,
    data
  }
  return res.status(code).json(result)
}
