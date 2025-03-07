import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!videoId) {
        throw new ApiError(400, "Invalid video id")
    }

    const comments = await Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId(videoId) } },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) },
    ])

    if (!comments) {
        throw new ApiError(400, "comments not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comments, { totalCommentsCount: comments.length, page: page, limit: limit }, "comments fetched successfully"))
})

const addComment = asyncHandler(async (req, res) => {
    const userId = req?.user?._id
    const { videoId } = req.params
    const { content } = req.body

    if (!userId) {
        throw new ApiError(400, "Invalid user ID")
    }
    if (!videoId) {
        throw new ApiError(400, "Invalid video ID")
    }
    if (!content) {
        throw new ApiError(400, "Comments cantent is required")
    }
    const comment = await Comment.create({ owner: userId, video: videoId, content: content })

    if (!comment) {
        throw new ApiError(400, " Error creating comment")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comment, {}, "Comment created successfully"))
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if (!commentId) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findByIdAndUpdate(commentId, { $set: { content: content } }, { new: true })

    if (!comment) {
        throw new ApiError(400, " Error updating comment")
    }

    res
        .status(200)
        .json(new ApiResponse(200, comment, {}, "Comment updated successfully"))
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!commentId) {
        throw new ApiError(400, "Invalid comment ID")
    }

    const comment = await Comment.findByIdAndDelete(commentId)

    if (!comment) {
        throw new ApiError(400, " Error deleting comment")
    }

    res
        .status(200)
        .json(new ApiResponse(200, comment, {}, "Comment deleted successfully"))
})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
