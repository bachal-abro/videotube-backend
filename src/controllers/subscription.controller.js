import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(400, "Channel id not specified");
    }

    const subscription = await Subscription.findOneAndDelete({
        channel: channelId,
        subscriber: req?.user?._id,
    });

    if (subscription) {
        const userId = req?.user?._id;
        const subscribersList = await Subscription.find({ channel: channelId });
        let isSubscribed = false;
        subscribersList.filter((sub) => {
            isSubscribed = sub.subscriber.toString() === userId.toString();
        });

        const subscribersCount = subscribersList.length;
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { isSubscribed, subscribersCount },
                    {},
                    "Subscription deleted successfully"
                )
            );
    } else {
        const newSubscription = await Subscription.create({
            channel: channelId,
            subscriber: req?.user?._id,
        });
        const userId = req?.user?._id;
        const subscribersList = await Subscription.find({ channel: channelId });
        let isSubscribed = false;
        subscribersList.filter((sub) => {
            isSubscribed = sub.subscriber.toString() === userId.toString();
        });

        const subscribersCount = subscribersList.length;
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { isSubscribed, subscribersCount },
                    {},
                    "Subscribers created successfully"
                )
            );
    }
});

// controller to return subscriber list of a channel
const getChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    const subscribersList = await Subscription.find({ channel: channelId });

    if (!subscribersList) {
        throw new ApiError(404, "Subscribers not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribersList,
                {},
                "Subscribers fetched successfully"
            )
        );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    const subscribedToList = await Subscription.aggregate([
        {
            $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscriptionChannels",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                            pipeline: [
                                {
                                    $count: "subscribersCount",
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $first: "$subscribers.subscribersCount",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscriptionChannels",
        },
        {
            $replaceRoot: { newRoot: "$subscriptionChannels" }, // Return just the video objects
        },
        {
            $project: {
                avatar: 1,
                displayName: 1,
                username:1,
                subscribersCount: 1,
            },
        },
    ]);

    if (!subscribedToList) {
        throw new ApiError(404, "Subscriptions not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedToList,
                { subscribedToCount: subscribedToList.length },
                "Subscribers fetched successfully"
            )
        );
});

const getSubscriptionStatus = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req?.user?._id;
    const subscribersList = await Subscription.find({ channel: channelId });
    let isSubscribed = false;
    subscribersList.filter((sub) => {
        isSubscribed = sub.subscriber.toString() === userId.toString();
    });

    const subscribersCount = subscribersList.length;
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isSubscribed, subscribersCount },
                {},
                "Subscribers fetched successfully"
            )
        );
});

export {
    toggleSubscription,
    getChannelSubscribers,
    getSubscribedChannels,
    getSubscriptionStatus,
};
