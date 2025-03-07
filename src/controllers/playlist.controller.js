import mongoose from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body

    //TODO: create playlist

    if (!name || !description) {
        throw new ApiError(400, "Playlist name and desciption is required")
    }

    const createdPlaylist = await Playlist.create({
        owner: req?.user?._id,
        name,
        description,
        videos: []
    })

    if (!createdPlaylist) {
        throw new ApiError(500, "Error occured while creating playlist")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, createdPlaylist, "Playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    // TODO: get user playlists

    if (!userId) {
        throw new ApiError(400, "User id is required")
    }

    const playlists = await Playlist.find({ owner: userId })
    if (playlists.length === 0) {
        throw new ApiError(400, "No playlists found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "Playlists found successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    //TODO: get playlist by id

    if (!playlistId) {
        throw new ApiError(400, "Playlist id not provided")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Playlist not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { videoId, playlistId } = req.params

    if (!playlistId && !videoId) {
        throw new ApiError("Playlist id and video id is required")
    }

    const playlist = await Playlist.findByIdAndUpdate(playlistId, { $push: { videos: videoId } }, { new: true })

    if (!playlist) {
        new ApiError(400, "Failed to add video in playlist")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Video Added Successfully"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist

    if (!playlistId && !videoId) {
        throw new ApiError(400, "playlist id and video id are required")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, { $pull: { videos: videoId } }, { new: true })

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPlaylist, {}, "Video deleted successfully"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params
    const { name, description } = req.body
    // TODO: update playlist
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}