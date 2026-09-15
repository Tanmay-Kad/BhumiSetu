const { verifyToken } = require("../utils/jwt");

const authenticate = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "Authentication token is required",
    });
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "Authentication token is required",
    });
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error.statusCode === 500) {
      return next(error);
    }

    return res.status(401).json({
      status: "error",
      message: "Invalid or expired authentication token",
    });
  }
};

module.exports = {
  authenticate,
};
