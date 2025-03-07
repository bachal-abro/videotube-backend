import { Router } from 'express';
import {
    getSubscribedChannels,
    getChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/c/:subscriberId") // Get the channels list of the given subscriber
    .get(getSubscribedChannels)

router
    .route("/u/:channelId") 
    .get(getChannelSubscribers) // Get the Subscribers list of the given channel
    .post(toggleSubscription)

export default router