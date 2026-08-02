import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getUserProfile,
  togglePrivacy,
  createPost,
  listUserPosts,
  toggleLike,
  commentPost,
  sharePost,
  createStatus,
  listActiveStatuses,
} from "../controllers/social.controller";

const router = Router();

// Profile detail privacy checks
router.get("/users/:id/profile", requireAuth, getUserProfile);
router.patch("/me/privacy", requireAuth, togglePrivacy);

// Posts
router.post("/posts", requireAuth, createPost);
router.get("/users/:userId/posts", requireAuth, listUserPosts);
router.post("/posts/:postId/like", requireAuth, toggleLike);
router.post("/posts/:postId/comment", requireAuth, commentPost);
router.post("/posts/:postId/share", requireAuth, sharePost);

// Stories
router.post("/status", requireAuth, createStatus);
router.get("/status/active", requireAuth, listActiveStatuses);

export default router;
