import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req?.user?._id;

    if (!videoId) {
        throw new ApiError(400, "Couldn't find video's id");
    }

    const removeLike = await Like.findOneAndDelete({
        likedBy: userId,
        video: videoId,
    });
    let message = "Like removed successfully"
    if (!removeLike) {
        message = "Like created successfully"
        await Like.create({ likedBy: userId, video: videoId });
    }

    const likesList = await Like.find({ video: videoId });
    let isLiked = false;
    likesList.filter((like) => {
        isLiked = like.likedBy.toString() === userId.toString();
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {isLiked, likes:likesList.length}, {}, message));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req?.user?._id;

    if (!commentId) {
        throw new ApiError(400, "Couldn't find comments's id");
    }

    const removeLike = await Like.findOneAndDelete({
        likedBy: userId,
        comment: commentId,
    });

    if (removeLike) {
        return res
            .status(200)
            .json(new ApiResponse(200, removeLike, {}, "Comment like removed"));
    } else {
        const like = await Like.create({ likedBy: userId, comment: commentId });

        return res
            .status(200)
            .json(new ApiResponse(200, like, {}, "Comment like added"));
    }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req?.user?._id;

    if (!tweetId) {
        throw new ApiError(400, "Couldn't find tweet's id");
    }

    const removeLike = await Like.findOneAndDelete({
        likedBy: userId,
        tweet: tweetId,
    });

    if (removeLike) {
        return res
            .status(200)
            .json(new ApiResponse(200, removeLike, {}, "Tweet like removed"));
    } else {
        const like = await Like.create({ likedBy: userId, tweet: tweetId });

        return res
            .status(200)
            .json(new ApiResponse(200, like, {}, "Tweet like added"));
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req?.user?._id;

    const videos = await Like.find({ likedBy: userId }).select("video");

    console.log(videos);

    return res
        .status(200)
        .json(new ApiResponse(200, videos, {}, "Liked videos fetched"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
