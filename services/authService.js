const User = require("../models/User");
const bcrypt = require("bcrypt");
const generateToken = require("../utils/generateToken");

exports.registerUser = async (data) => {

    const { name, email, password } = data;

    const userExists = await User.findOne({ email });

    if (userExists) {
        throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
    });

    const token = generateToken(user._id);

    return {
        user,
        token,
    };
};

exports.loginUser = async (data) => {

    const { email, password } = data;

    const user = await User.findOne({ email });

    if (!user) {
        throw new Error("Invalid Credentials");
    }

    const isMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!isMatch) {
        throw new Error("Invalid Credentials");
    }

    const token = generateToken(user._id);

    return {
        user,
        token,
    };
};