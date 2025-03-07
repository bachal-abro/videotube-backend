import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body

    const user = req.user._id

    if (!content) {
        throw new ApiError(400, "No content available for tweet")
    }

    const tweet = await Tweet.create({ content: content, owner: user })

    if (!tweet) {
        throw new ApiError(400, "Error creating tweet")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, {}, "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req?.params

    if (!userId) {
        throw new ApiError(404, "User not found")
    }

    const tweets = await Tweet.find({ owner: userId })

    if (!tweets) {
        throw new ApiError(404, "Tweets not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, {}, "Tweets fetched successfully"))

})

const updateTweet = asyncHandler(async (req, res) => {
    const { content } = req.body
    const { tweetId } = req.params

    const user = req.user._id

    if (!content) {
        throw new ApiError(400, "No content available for tweet")
    }

    if (!tweetId) {
        throw new ApiError(400, "Tweet not found")
    }

    const tweet = await Tweet.findByIdAndUpdate(tweetId, { $set: { content: content } }, { new: true })

    if (!tweet) {
        throw new ApiError(400, "Error Upadeting tweet")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, {}, "Tweet updated successfully"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req?.params

    if (!tweetId) {
        throw new ApiError(404, "Tweet not found")
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)

    if (!deletedTweet) {
        throw new ApiError(404, "Unable to delete tweet")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, deletedTweet, {}, "Tweet deleted successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
