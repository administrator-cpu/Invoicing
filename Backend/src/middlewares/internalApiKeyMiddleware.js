import AppError from "../utils/AppError.js";

const verifyInternalApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return next(new AppError("Unauthorized", 401));
  }
  if (apiKey !== process.env.INTERNAL_INVOICING_SECRET) {
    return next(new AppError("Unauthorized", 401));
  }
  next();
};

export default verifyInternalApiKey;