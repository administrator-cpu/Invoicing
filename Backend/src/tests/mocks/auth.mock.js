let role = "Admin";

export const setRole = (newRole) => { role = newRole; };

export const protect = (req, res, next) => {
  req.user = {
    _id: "507f1f77bcf86cd799439011",
    role
  };
  next();
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(role)) {
      return res.status(403).json({
        status: "fail",
        message: "Forbidden"
      });
    }
    next();
  };
};