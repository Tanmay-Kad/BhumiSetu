const sendResponse = (res, statusCode, payload) => {
  return res.status(statusCode).json(payload);
};

module.exports = {
  sendResponse,
};
