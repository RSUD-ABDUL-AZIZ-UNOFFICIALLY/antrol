const jwt = require('jsonwebtoken');
module.exports = {
    check: async (req, res, next) => {
        try {
            const token = (req.headers['x-token'])
            jwt.verify(token, process.env.TOKEN_SECRET);
            next();
        } catch (err) {
            return res.status(201).json({
                status: false,
                message: "Unauthorized",
                data: err.message
            });
        }
    },
}