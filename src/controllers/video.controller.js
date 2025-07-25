import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getVideosFromSubscriptions = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy,
        sortType = "desc",
    } = req.query;

    const sortTypeDirection = sortType === "desc" ? -1 : 1;
    // INFORMATION: get all videos based on query, sort, pagination

    // IDEAL: count the number of videos in only one call to reduce calls to database

    // TODO: handle sort by query
    const videos = await Video.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    {
                        $addFields: {
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            coverImage: 0,
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
            $unwind: "$owner",
        },
        {
            $match: {
                "owner.isSubscribed": true,
            },
        },
        {
            $sort: {
                createdAt: sortTypeDirection,
            },
        },
        {
            $skip: (page - 1) * limit,
        },
        {
            $limit: parseInt(limit),
        },
        {
            $project: {
                ownerName: "$owner.username",
                ownerAvatar: "$owner.avatar",
                title: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
            },
        },
    ]);

    const totalVideos = await Video.countDocuments();

    const totalPages = Math.ceil(totalVideos / limit);

    if (!videos || videos.length === 0) {
        new ApiError(400, "Failed to fetched videos");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            {
                curruntPage: parseInt(page),
                totalPages,
                pageSize: parseInt(limit),
                totalIems: totalVideos,
            },
            "All videos fetched successfully"
        )
    );
});

const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query,
        sortBy,
        sortType = "desc",
        userId,
    } = req.query;

    const sortTypeDirection = sortType === "desc" ? -1 : 1;
    // INFORMATION: get all videos based on query, sort, pagination

    // IDEAL: count the number of videos in only one call to reduce calls to database

    // TODO: handle sortBy query
    const videos = await Video.aggregate([
        {
            $match: {
                isPublished: true,
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $unwind: "$owner",
        },
        {
            $match: {
                ...(userId && { owner: new mongoose.Types.ObjectId(userId) }),
                ...(query && { $regex: query, $options: "i" }),
            },
        },
        {
            $sort: {
                createdAt: sortTypeDirection,
            },
        },
        {
            $skip: (page - 1) * limit,
        },
        {
            $limit: parseInt(limit),
        },
        {
            $project: {
                _id: 1,
                ownerName: "$owner.username",
                ownerAvatar: "$owner.avatar",
                title: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
            },
        },
    ]);

    // TODO: Remove this when we have calculated the number of videos
    const totalVideos = await Video.countDocuments({
        ...(userId && { owner: userId }),
        ...(query && { $regex: query, $options: "i" }),
    });

    const totalPages = Math.ceil(totalVideos / limit);

    if (!videos || videos.length === 0) {
        new ApiError(400, "Failed to fetched videos");
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            {
                curruntPage: parseInt(page),
                totalPages,
                pageSize: parseInt(limit),
                totalIems: totalVideos,
            },
            "All videos fetched successfully"
        )
    );
});

const publishVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const userId = req.user?._id;
    // INFORMATION: get video, upload to cloudinary, create video

    if (!title || !description) {
        throw new ApiError(400, "Title or Description is missing");
    }

    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is missing");
    }

    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail is missing");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!videoFile) {
        throw new ApiError(500, "Failed to upload Video");
    }
    if (!thumbnail) {
        throw new ApiError(500, "Failed to upload Video");
    }

    const Createdvideo = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration,
        owner: userId,
    });
    if (!Createdvideo) {
        throw new ApiError(
            500,
            "Something went wrong while creating the video"
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, Createdvideo, "Video uploaded successfully")
        );
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;
    // INFORMATION: get video by id

    // IDEA: Add viewed by in video model to know who viewed my video
    if (!videoId?.trim()) {
        throw new ApiError(400, "Video id is required");
    }

    // TODO: Merge watchHistory increment and video views count in one request
    await User.findByIdAndUpdate(
        userId,
        { $push: { watchHistory: videoId } },
        { new: true }
    );

    const videoViews = await User.aggregate([
        {
            $unwind: "$watchHistory",
        },
        {
            $match: {
                watchHistory: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $count: "viewsCount",
        },
    ]);

    await Video.findByIdAndUpdate(
        videoId,
        { $set: { views: videoViews[0].viewsCount } },
        { new: true }
    );
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    {
                        $addFields: {
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                            subscribers: {
                                $size: "$subscribers",
                            },
                        },
                    },
                    {
                        $project: {
                            coverImage: 0,
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
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $lookup: {
                from: "dislikes",
                localField: "_id",
                foreignField: "video",
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
                likes: {
                    $size: "$likes",
                },
                dislikes: {
                    $size: "$dislikes",
                },
            },
        },
        {
            $unwind: "$owner",
        },
    ]);

    if (!video) {
        throw new ApiError(400, "Video not found in Database");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], {}, "Video found successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // TODO: Update details Separately
    const { title, description } = req.body;

    const thumbnailLocalPath = req?.file?.path;

    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    // if (!title || !description || !thumbnailLocalPath) {
    //     throw new ApiError(400, "Title, description and thumbnail are required")
    // }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                ...(title && { title: title }),
                ...(description && { description: description }),
                ...(thumbnail.url && { thumbnail: thumbnail.url }),
            },
        },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video

    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    const video = await Video.findByIdAndDelete(videoId);

    if (!video) {
        throw new ApiError(500, "Error occured while deleting video");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    const { publishStatus } = req.body;

    const video = await Video.findByIdAndUpdate(
        videoId,
        { $set: { isPublished: publishStatus } },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Publish status toggled"));
});

export {
    getAllVideos,
    getVideosFromSubscriptions,
    publishVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
