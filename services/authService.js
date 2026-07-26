const bcrypt = require("bcrypt");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const SALT_ROUNDS = 10;

// Public registration — always creates a customer. Organizer accounts can
// only be created by an admin via registerOrganizerService below, so this
// function deliberately never accepts a role from the caller.
exports.registerCustomerService = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "customer",
  });

  const token = generateToken(user._id);
  return { user, token };
};

// Admin-only. The controller enforces `authorize("admin")` on the route;
// this service additionally never trusts a role param — it's hardcoded here
// too, so even a future route-wiring mistake can't create an admin account
// through this path.
exports.registerOrganizerService = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "organizer",
  });

  return user;
};

exports.loginService = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Invalid email or password.");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid email or password.");
  }

  const token = generateToken(user._id);
  return { user, token };
};
