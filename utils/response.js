exports.sendError = function (res, code, message) {
  let result = {
    success: false,
    code,
    message,
    data: null
  }
  return res.status(200).json(result)

}

exports.sendResponse = function (res, data, code, message) {
  code = code || 200
  const result = {
    success: true,
    code,
    message,
    data
  }
  return res.status(code).json(result)
}