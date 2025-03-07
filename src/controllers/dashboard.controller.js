import mongoose from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // * Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const channelId = req?.user?._id

    if (!channelId) {
        throw new ApiError(400, "User not logged in")
    }

    const totalVideos = await Video.countDocuments({ owner: channelId })

    const totalViews = await Video.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ])

    const totalSubscribers = await Subscription.countDocuments({ channel: channelId })

    const totalLikes = await Like.aggregate([
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails"
            }
        },
        { $unwind: "$videoDetails" },
        { $match: { "videoDetails.owner": channelId } },
        { $group: { _id: null, totalLikes: { $sum: 1 } } }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, { totalVideos, totalLikes, totalViews: totalViews[0]?.totalViews || 0, totalSubscribers, totalLikes: totalLikes[0]?.totalLikes || 0 }, {}, "Channel stats retrieved successfully"))

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // * Get all the videos uploaded by the channel
    const channelId = req?.user?._id

    if (!channelId) {
        throw new ApiError(400, "User not logged in")
    }
    const totalVideos = await Video.find({ owner: channelId })

    return res
        .status(200)
        .json(new ApiResponse(200, totalVideos, {}, "Channel videos retrieved successfully"))
})

export {
    getChannelStats,
    getChannelVideos
}