const AppError = require("../utils/appError");

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required before role check.", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("You are not authorized to perform this action.", 403));
    }

    return next();
  };
}

module.exports = {
  authorize
};
