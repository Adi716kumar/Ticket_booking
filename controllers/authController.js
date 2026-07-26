const {
  registerCustomerService,
  registerOrganizerService,
  loginService,
} = require("../services/authService");

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

exports.registerCustomer = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const { user, token } = await registerCustomerService({ name, email, password });

    res.cookie("token", token, COOKIE_OPTIONS);
    res.status(201).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Admin-only route. Does not log the new organizer in — admin stays logged
// in as themselves; the organizer logs in separately with their own credentials.
exports.registerOrganizer = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const organizer = await registerOrganizerService({ name, email, password });

    res.status(201).json({
      success: true,
      organizer: { id: organizer._id, name: organizer.name, email: organizer.email },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await loginService({ email, password });

    res.cookie("token", token, COOKIE_OPTIONS);
    res.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
};

exports.logout = (req, res) => {
  res.clearCookie("token", COOKIE_OPTIONS);
  res.json({ success: true, message: "Logged out" });
};

exports.getMe = (req, res) => {
  res.json({ success: true, user: req.user });
};
