import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description, videos } = req.body;

    if (!name || !description) {
        throw new ApiError(400, "Playlist name is required");
    }

    const createdPlaylist = await Playlist.create({
        owner: req?.user?._id,
        name,
        description,
        videos: videos || [],
    });

    if (!createdPlaylist) {
        throw new ApiError(500, "Error occured while creating playlist");
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
    // TODO: get user playlists

    if (!userId) {
        throw new ApiError(400, "User id is required");
    }

    const playlists = await Playlist.find({ owner: userId });
    if (playlists.length === 0) {
        throw new ApiError(400, "No playlists found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "Playlists found successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    //TODO: get playlist by id

    if (!playlistId) {
        throw new ApiError(400, "Playlist id not provided");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "Playlist not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistIds, videoId } = req.body;

    if (!playlistIds || !videoId) {
        throw new ApiError("Playlist id and video id is required");
    }

    // Update all playlists using bulk operation
    const result = await Playlist.updateMany(
        { _id: { $in: playlistIds } },
        { $addToSet: { videos: videoId } } // use $addToSet to avoid duplicates
    );

    if (!result.modifiedCount) {
        throw new ApiError(400, "Failed to add video to any playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result,
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

    return res.status(200).json(
        new ApiResponse(
            200,
            result,
            "Video removed from selected playlists successfully"
        )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;
    // TODO: update playlist
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
