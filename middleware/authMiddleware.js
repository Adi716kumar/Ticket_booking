const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {

    try {

        let token;

        // Bearer Token (Postman)
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {

            token = req.headers.authorization.split(" ")[1];

        }

        // Cookie (Browser)
        else if (req.cookies && req.cookies.token) {

            token = req.cookies.token;

        }

        if (!token) {

            return res.status(401).json({
                success: false,
                message: "Not Authorized"
            });

        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = await User.findById(decoded.id)
            .select("-password");

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Invalid Token"
        });

    }

};

module.exports = protect;