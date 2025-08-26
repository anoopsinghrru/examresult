// Middleware to check if admin is authenticated
const requireAuth = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  } else {
    return res.redirect('/admin/login');
  }
};

// Middleware to redirect authenticated admin away from login page
const redirectIfAuth = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  } else {
    return next();
  }
};

module.exports = {
  requireAuth,
  redirectIfAuth
};