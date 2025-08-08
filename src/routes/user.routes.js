import { Router } from "express";
import {
    changeCurrentPassword,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAccountDetails,
    updateAvatar,
    updateBanner,
    getUserById,
    removeVideoFromWatchHistory,
    clearWatchHistory,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "banner", maxCount: 1 },
    ]),
    registerUser
);

router.route("/login").post(loginUser);

// Secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);
router
    .route("/banner")
    .patch(verifyJWT, upload.single("banner"), updateBanner);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/:userId").get(verifyJWT, getUserById);
router.route("/history/videos").get(verifyJWT, getWatchHistory);
router
    .route("/history/remove/:videoId")
    .patch(verifyJWT, removeVideoFromWatchHistory);
router.route("/history/clear").patch(verifyJWT, clearWatchHistory);

export default router;
