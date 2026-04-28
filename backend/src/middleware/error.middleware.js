function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal server error";

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = {
  notFound,
  errorHandler
};
