const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      status: "error",
      message: "You are not authorized to access this resource",
    });
  }

  return next();
};

module.exports = {
  authorizeRoles,
};
