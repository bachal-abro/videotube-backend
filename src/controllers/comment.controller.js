import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10, sort = 'desc' } = req.query;

    if (!videoId) {
        throw new ApiError(400, "Invalid video id");
    }

    const sortOrder = sort === 'asc' ? 1 : -1;

    // Count total number of comments for this video
    const totalCommentsCount = await Comment.countDocuments({ video: videoId });

    const comments = await Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            banner: 0,
                            email: 0,
                            watchHistory: 0,
                            password: 0,
                            createdAt: 0,
                            updatedAt: 0,
                            refreshToken: 0,
                            __v: 0,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        {
            $lookup: {
                from: "dislikes",
                localField: "_id",
                foreignField: "comment",
                as: "dislikes",
            },
        },
        {
            $addFields: {
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
                isDisliked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$dislikes.dislikedBy"] },
                        then: true,
                        else: false,
                    },
                },
                likes: { $size: "$likes" },
                dislikes: { $size: "$dislikes" },
            },
        },
        { $unwind: "$owner" },
        { $sort: { createdAt: sortOrder } },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) },
    ]);
    
    return res.status(200).json(
        new ApiResponse(
            200,
            comments,
            {
                totalCommentsCount,
                page: Number(page),
                limit: Number(limit),
            },
            "comments fetched successfully"
        )
    );
});

const addComment = asyncHandler(async (req, res) => {
    const userId = req?.user?._id;
    const { videoId } = req.params;
    const { content, parentCommentId } = req.body;

    if (!userId) throw new ApiError(400, "Invalid user ID");
    if (!videoId) throw new ApiError(400, "Invalid video ID");
    if (!content) throw new ApiError(400, "Comment content is required");

    // If it's a reply, ensure the parent comment exists
    let parentComment = null;
    if (parentCommentId) {
        parentComment = await Comment.findById(parentCommentId);
        if (!parentComment) {
            throw new ApiError(404, "Parent comment not found");
        }
    }

    const comment = await Comment.create({
        owner: userId,
        video: videoId,
        content,
        parentComment: parentCommentId || null,
    });

    if (!comment) {
        throw new ApiError(500, "Error creating comment");
    }

    return res.status(201).json(
        new ApiResponse(201, comment, {}, "Comment created successfully")
    );
});


const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!commentId) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const comment = await Comment.findByIdAndUpdate(
        commentId,
        { $set: { content: content } },
        { new: true }
    );

    if (!comment) {
        throw new ApiError(400, " Error updating comment");
    }

    res.status(200).json(
        new ApiResponse(200, comment, {}, "Comment updated successfully")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const comment = await Comment.findByIdAndDelete(commentId);

    if (!comment) {
        throw new ApiError(400, " Error deleting comment");
    }

    res.status(200).json(
        new ApiResponse(200, comment, {}, "Comment deleted successfully")
    );
});

export { getVideoComments, addComment, updateComment, deleteComment  };
