import express from "express";
import cors from "cors"
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler.middleware.js";


const app = express()

// Middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN, // for allowing frontend to communicate with backend
    credentials: true 
}))
app.use(express.json({ limit: "16kb" }))  // Allowing to accept json
app.use(express.urlencoded({ extended: true, limit: "16kb" })) // url encode
app.use(express.static("public")) // Serving Static files
app.use(cookieParser()) // working with cookies on client browser

// import routes
import userRouter from "./routes/user.routes.js"
import healthcheckRouter from "./routes/healthcheck.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"


// declare routes
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)

app.use(errorHandler);

export default app