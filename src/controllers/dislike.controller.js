import mongoose, { isValidObjectId } from "mongoose";
import { Dislike } from "../models/dislike.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoDislike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req?.user?._id;

    if (!videoId) {
        throw new ApiError(400, "Couldn't find video's id");
    }

    const removeDislike = await Dislike.findOneAndDelete({
        dislikedBy: userId,
        video: videoId,
    });
    
    let message = "Dislike removed successfully"
    if (!removeDislike) {
        message = "Dislike created successfully"
        await Dislike.create({ dislikedBy: userId, video: videoId });
    }

    const dislikedList = await Dislike.find({ video: videoId });
    let isDisliked = false;
    dislikedList.filter((dislike) => {
        isDisliked = dislike.dislikedBy.toString() === userId.toString();
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {isDisliked, dislikes:dislikedList.length}, {}, message));
});

const toggleCommentDislike = asyncHandler(async (req, res) => {

    const { commentId } = req.params;
    const userId = req?.user?._id;

    if (!commentId) {
        throw new ApiError(400, "Couldn't find comment's id");
    }

    const removeDislike = await Dislike.findOneAndDelete({
        dislikedBy: userId,
        comment: commentId,
    });

    let message = "Dislike removed successfully"
    if (!removeDislike) {
        message = "Dislike created successfully"
        await Dislike.create({ dislikedBy: userId, comment: commentId });
    }

    const likesList = await Dislike.find({ comment: commentId });
    let isDisliked = false;
    likesList.filter((dislike) => {
        isDisliked = dislike.dislikedBy.toString() === userId.toString();
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {isDisliked, dislikes:likesList.length || 0}, {}, message));
});

const toggleTweetDislike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req?.user?._id;

    if (!tweetId) {
        throw new ApiError(400, "Couldn't find tweet's id");
    }

    const removeDislike = await Dislike.findOneAndDelete({
        dislikedBy: userId,
        tweet: tweetId,
    });

    if (removeDislike) {
        return res
            .status(200)
            .json(new ApiResponse(200, removeDislike, {}, "Tweet dislike removed"));
    } else {
        const dislike = await Dislike.create({ dislikedBy: userId, tweet: tweetId });

        return res
            .status(200)
            .json(new ApiResponse(200, dislike, {}, "Tweet dislike added"));
    }
});

const getDislikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req?.user?._id;

    const videos = await Dislike.find({ dislikedBy: userId }).select("video");

    console.log(videos);

    return res
        .status(200)
        .json(new ApiResponse(200, videos, {}, "Disliked videos fetched"));
});

export { toggleCommentDislike, toggleTweetDislike, toggleVideoDislike, getDislikedVideos };
