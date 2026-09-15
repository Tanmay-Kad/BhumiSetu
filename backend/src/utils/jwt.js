const jwt = require("jsonwebtoken");
const config = require("../config");

const requireJwtSecret = () => {
  if (!config.jwtSecret) {
    const error = new Error("JWT_SECRET is not configured");
    error.statusCode = 500;
    throw error;
  }
};

const signToken = (user) => {
  requireJwtSecret();

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
};

const verifyToken = (token) => {
  requireJwtSecret();
  return jwt.verify(token, config.jwtSecret);
};

module.exports = {
  signToken,
  verifyToken,
};
