export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error("Not Found"));
};

export const errorHandler = (err, req, res, next) => {
  res.status(res.statusCode || 500);
  res.json({
    message: err.message
  });
};