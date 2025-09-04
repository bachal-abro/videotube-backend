import { Router } from 'express';
import {
    deleteVideo,
    getAllVideos,
    getVideosFromSubscriptions,
    getVideoById,
    publishVideo,
    toggleVisibilityStatus,
    updateVideo,
    getAllVideosOfUser,
    getAllVideosOfAuthUser,
} from "../controllers/video.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/")
    .get(getAllVideos)
    .post(
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
            
        ]),
        publishVideo
    );

router
    .route("/subscriptions")
    .get(getVideosFromSubscriptions)

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(upload.single("thumbnail"), updateVideo);

router.route("/toggle/visibility/:videoId").patch(toggleVisibilityStatus);
router.route("/user/:userId").get(getAllVideosOfUser);
router.route("/auth/user").get(getAllVideosOfAuthUser);

export default router