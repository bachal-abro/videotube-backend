import mongoose, { Mongoose } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description, videos } = req.body;
    if (!name && !description) {
        throw new ApiError(400, "Playlist name is required");
    }

    const createdPlaylist = await Playlist.create({
        owner: req?.user?._id,
        name,
        description: "No description",
        videos: videos || [],
    });

    if (!createdPlaylist) {
        throw new ApiError(500, "Error occurred while creating playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                createdPlaylist,
                "Playlist created successfully"
            )
        );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        throw new ApiError(400, "User id is required");
    }

    const playlists = await Playlist.find({ owner: userId });
    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "Playlists found successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!playlistId) {
        throw new ApiError(400, "Playlist id not provided");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "videos.owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $unwind: {
                path: "$videos.ownerDetails",
                preserveNullAndEmptyArrays: true, // ✅ continue if owner is missing
            },
        },
        {
            $addFields: {
                "videos.owner.displayName": "$owner.displayName", // Add the displayName inside video
                "videos.owner.username": "$owner.username",
            },
        },
        {
            $project: {
                name: 1,
                videos: 1,
                thumbnail: 1,
                description: 1,
                updatedAt: 1,
                createdAt: 1,
            },
        },
    ]);
    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist[0], "Playlist fetched successfully")
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistIds, videoId, thumbnail } = req.body;
    if (!playlistIds || !videoId) {
        throw new ApiError("Playlist id and video id is required");
    }

    // Step 1: Add video to each playlist (no duplicates)
    await Playlist.updateMany(
        { _id: { $in: playlistIds } },
        { $addToSet: { videos: videoId } } // use $addToSet to avoid duplicates
    );

    // Step 2: Set thumbnail for each playlist (last added video = new thumbnail)
    for (const playlistId of playlistIds) {
        await Playlist.findByIdAndUpdate(
            playlistId,
            { thumbnail: thumbnail } // use thumbnail from body
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Video added to selected playlists successfully"
            )
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistIds, videoId } = req.body;

    if (!playlistIds || !videoId) {
        throw new ApiError("Playlist ID and video ID are required");
    }

    // Remove the video from all specified playlists
    const result = await Playlist.updateMany(
        { _id: { $in: playlistIds } },
        { $pull: { videos: videoId } }
    );

    if (!result.modifiedCount) {
        throw new ApiError(400, "Failed to remove video from any playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
                "Video removed from selected playlists successfully"
            )
        );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!playlistId) {
        throw new ApiError(403, "Playlist id is required");
    }

    await Playlist.findByIdAndDelete(playlistId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;
    if (!playlistId) {
        throw new ApiError(403, "Playlist Id is required to update");
    }

    if (!name && !description) {
        throw new ApiError(403, "Name or Description is required to update");
    }

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                ...(name && { name: name }),
                ...(description && { description: description }),
            },
        },
        { new: true }
    ).select("-password");

    console.log(updatePlaylist);
    return res
        .status(200)
        .json(new ApiResponse(200, [], "Playlist updated successfully"));
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
