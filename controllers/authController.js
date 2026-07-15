const {
    registerUser,
    loginUser,
} = require("../services/authService");

exports.register = async (req, res) => {

    try {

        const data = await registerUser(req.body);

        res.status(201).json({
            success: true,
            ...data,
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message,
        });

    }

};

exports.login = async (req, res) => {

    try {

        const data = await loginUser(req.body);

        res.status(200).json({
            success: true,
            ...data,
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message,
        });

    }

};