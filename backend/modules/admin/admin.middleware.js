export const verifyAdminRole = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Administrative access required",
      data: null,
      error: "ACCESS_DENIED"
    });
  }
  next();
};
