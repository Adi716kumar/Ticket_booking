// Usage: authorize("admin"), authorize("organizer", "admin"), etc.
// Must run after `protect` so req.user is populated.
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }
    next();
  };
}

module.exports = authorize;
