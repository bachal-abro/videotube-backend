// middlewares/errorHandler.js
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        errors: err.errors || [],
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};

export default errorHandler;
