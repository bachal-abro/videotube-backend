import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        // Get user by id and generate both tokens by using methods
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Save the refreshToken in db and avoid validation before save
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating refresh and access token"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, displayName } = req.body;

    // Check for empty fields
    if (
        [username, email, password, displayName].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Check username and email from database
    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    // Check if user already exists
    if (existedUser) {
        throw new ApiError(
            409,
            "User with this email or username already exists"
        );
    }

    // // Get paths of avatar and banner
    // const avatarLocalPath = req.files?.avatar[0]?.path;

    // let bannerLocalPath;
    // if (
    //     req.files &&
    //     Array.isArray(req.files.banner) &&
    //     req.files.banner.length > 0
    // ) {
    //     bannerLocalPath = req.files.banner[0].path;
    // }

    // // Upload on cloudinary
    // const avatar = await uploadOnCloudinary(avatarLocalPath);
    // const banner = await uploadOnCloudinary(bannerLocalPath);

    // Create entry in database
    const user = await User.create({
        displayName,
        email,
        password,
        username: username.toLowerCase(),
    });

    // Remove password and refreshToken from data which will be sent to frontend
    const createdUser = await User.findById(user._id).select(
        "-password  -refreshToken"
    );

    // check if user is created successfully
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating the user");
    }

    // return response
    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered Successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    //? By setting refresh and access tokens in browser cookies user will be logged in
    // Get Data from request body
    const { username, email, password } = req.body;

    //  Check if we get username or email
    if (!username && !email) {
        throw new ApiError(400, "username or password is required");
    }

    // find the user from database
    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    // Check if user exists
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // match password from database
    const isPasswordValid = await user.isPasswordCorrect(password);

    // Check if password is valid
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options) // Set accessToken as Cookie in the browser
        .cookie("refreshToken", refreshToken, options) // Set refreshToken as Cookie in the browser
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken, // Sent tokens for other devices Like Apps in Phone
                },
                "User logged In Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    //? By Removing access and refresh tokens user will be logged out
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1, // Remove refresh token from DB
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none",
    };

    return res
        .status(200)
        .clearCookie("accessToken", options) // Clear accessToken Cookie in the browser
        .clearCookie("refreshToken", options) // Clear refreshToken Cookie in the browse
        .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    //? While accessToken expires we can regenerate it by matching refreshToken (From cookies) with refreshToken in DB
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        //? Decode the refreshToken to verify it with one present in DB
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }
        const { accessToken, refreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        // Update the refresh token in the database
        user.refreshToken = refreshToken;
        await user.save();

        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        };

        return res
            .status(200)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(200, { accessToken }, "Access token refreshed")
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is invalid");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, req.user, "Current user fetched successfully")
        );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { displayName, email, description, username } = req.body;

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                ...(displayName && { displayName: displayName }),
                ...(username && { username: username }),
                ...(email && { email: email }),
                ...(description && { description: description }),
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        );
});

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar Updated successfully"));
});

const updateBanner = asyncHandler(async (req, res) => {
    const bannerLocalPath = req.file?.path;

    if (!bannerLocalPath) {
        throw new ApiError(400, "Cover image is missing");
    }

    const banner = await uploadOnCloudinary(bannerLocalPath);
    if (!banner.url) {
        throw new ApiError(400, "Error in uploading cover image");
    }

    const user = await User.findByIdAndUpdate(
        req?.user._id,
        { $set: { banner: banner.url } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    if (!username?.trim) {
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel fetched successfully"));
});

const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!userId?.trim) {
        throw new ApiError(400, "userId is missing");
    }

    const user = await User.findById(userId).select(
        "username displayName avatar"
    );

    if (!user) {
        throw new ApiError(404, "User does not exists");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user, "User fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const watchHistory = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        displayName: 1,
                                        user: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" },
                        },
                    },
                    {
                        $project: {
                            title: 1,
                            videoFile: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            createdAt: 1,
                            isPublished: 1,
                            owner: 1,
                        },
                    },
                ],
            },
        },
        {
            $project: {
                watchHistory: 1,
            },
        },
        {
            $unwind: "$watchHistory",
        },
        {
            $replaceRoot: {
                newRoot: "$watchHistory",
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, watchHistory, "User history successfully"));
});

const removeVideoFromWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "videoId is missing");
    }

    const removed = await User.updateOne(
        { _id: req.user._id },
        { $pull: { watchHistory: new mongoose.Types.ObjectId(videoId) } }
    );

    console.log("Removing:", removed);

    if (removed.modifiedCount === 0) {
        throw new ApiError(404, "Video not found in watch history");
    }

    res.status(200).json(
        new ApiResponse(200, [], "Video removed from Watch History")
    );
});

const clearWatchHistory = asyncHandler(async (req, res) => {
    const result = await User.updateOne(
        { _id: req.user._id },
        { $set: { watchHistory: [] } }
    );

    if (result.modifiedCount === 0) {
        new ApiResponse(404, [], "Failed to clear History");
    }

    res.status(200).json(new ApiResponse(200, [], "Cleared Watch History"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateBanner,
    getUserChannelProfile,
    getUserById,
    getWatchHistory,
    removeVideoFromWatchHistory,
    clearWatchHistory,
};
