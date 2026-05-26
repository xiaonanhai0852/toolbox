class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function errorHandler(err, req, res, next) {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? '服务器内部错误。' : err.message;

  res.status(statusCode).json({ success: false, message });
}

module.exports = { errorHandler, AppError };
