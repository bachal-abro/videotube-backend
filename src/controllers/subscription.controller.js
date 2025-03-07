import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription

    if (!channelId) {
        throw new ApiError(400, "Channel id not specified")
    }

    const subscription = await Subscription.findOneAndDelete({ channel: channelId, subscriber: req?.user?._id })

    if (subscription) {
        return res
            .status(200)
            .json(new ApiResponse(200, subscription, {}, "Subscription deleted"))

    } else {
        const newSubscription = await Subscription.create({ channel: channelId, subscriber: req?.user?._id })
        return res
            .status(200)
            .json(new ApiResponse(200, newSubscription, {}, "New subscription done successfully"))
    }
})

// controller to return subscriber list of a channel
const getChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    const subscribersList = await Subscription.find({ channel: channelId })
    console.log("Subscribers ", subscribersList);

    if (!subscribersList) {
        throw new ApiError(404, "Subscriptions not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, subscribersList, { subscribersCount: subscribersList.length }, "Subscribers fetched successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    const subscribedToList = await Subscription.find({ subscriber: subscriberId })

    console.log("Channels", subscribedToList);

    if (!subscribedToList) {
        throw new ApiError(404, "Subscriptions not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, subscribedToList, { subscribedToCount: subscribedToList.length }, "Subscribers fetched successfully"))
})

export {
    toggleSubscription,
    getChannelSubscribers,
    getSubscribedChannels
}