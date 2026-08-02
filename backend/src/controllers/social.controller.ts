import { Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AuthedRequest } from "../middleware/auth";

// Get single user's detail. Applies privacy rules:
// - If user is SUPER_ADMIN (Sports Secretary), they see everything.
// - If profile is public, anyone sees everything.
// - If profile is private, non-admins see only fullName, uniqueId, profilePhotoUrl, isPublic, role.
export async function getUserProfile(req: AuthedRequest, res: Response) {
  const { id } = req.params;
  const viewerId = req.user!.id;
  const viewerRole = req.user!.role;

  try {
    const target = await prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { status: "APPROVED" },
          include: { sport: true },
        },
      },
    });

    if (!target) return res.status(404).json({ error: "User not found" });

    const isSelf = target.id === viewerId;
    const isViewerAdmin = viewerRole === "SUPER_ADMIN";
    const canSeeFull = target.isPublic || isSelf || isViewerAdmin;

    if (canSeeFull) {
      const { passwordHash, resetOtp, resetOtpExpires, ...safeData } = target;
      return res.json({ ...safeData, isFullProfile: true });
    } else {
      // Locked private profile representation
      return res.json({
        id: target.id,
        fullName: target.fullName,
        uniqueId: target.uniqueId,
        profilePhotoUrl: target.profilePhotoUrl,
        isPublic: false,
        role: target.role,
        isFullProfile: false,
      });
    }
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to get user profile" });
  }
}

// Toggle privacy status
export async function togglePrivacy(req: AuthedRequest, res: Response) {
  const { isPublic } = req.body as { isPublic: boolean };
  if (typeof isPublic !== "boolean") {
    return res.status(400).json({ error: "isPublic must be a boolean" });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { isPublic },
    });
    return res.json({ message: `Privacy updated to ${isPublic ? "Public" : "Private"}.`, isPublic: updated.isPublic });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update privacy settings" });
  }
}

// Post creation & retrieval
const postSchema = z.object({
  content: z.string().min(1),
  imageUrl: z.string().url().optional(),
});

export async function createPost(req: AuthedRequest, res: Response) {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid post data", details: parsed.error.flatten() });

  try {
    const post = await prisma.post.create({
      data: {
        userId: req.user!.id,
        content: parsed.data.content,
        imageUrl: parsed.data.imageUrl || null,
      },
      include: {
        user: { select: { id: true, fullName: true, uniqueId: true, profilePhotoUrl: true } },
        likes: true,
        comments: {
          include: { user: { select: { id: true, fullName: true, uniqueId: true } } },
        },
      },
    });
    res.status(201).json(post);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create post" });
  }
}

// List posts of a specific user. Checks if user is authorized to view (public or admin or self)
export async function listUserPosts(req: AuthedRequest, res: Response) {
  const { userId } = req.params;
  const viewerId = req.user!.id;
  const viewerRole = req.user!.role;

  try {
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return res.status(404).json({ error: "User not found" });

    const isSelf = target.id === viewerId;
    const isViewerAdmin = viewerRole === "SUPER_ADMIN";
    const canSee = target.isPublic || isSelf || isViewerAdmin;

    if (!canSee) {
      return res.status(403).json({ error: "This profile is private." });
    }

    const posts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, fullName: true, uniqueId: true, profilePhotoUrl: true } },
        likes: true,
        comments: {
          include: { user: { select: { id: true, fullName: true, uniqueId: true, profilePhotoUrl: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to retrieve posts" });
  }
}

// Toggle post like
export async function toggleLike(req: AuthedRequest, res: Response) {
  const { postId } = req.params;
  const userId = req.user!.id;

  try {
    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
      return res.json({ liked: false });
    } else {
      await prisma.postLike.create({ data: { userId, postId } });
      return res.json({ liked: true });
    }
  } catch (err: any) {
    res.status(500).json({ error: "Failed to toggle like" });
  }
}

// Comment on post
export async function commentPost(req: AuthedRequest, res: Response) {
  const { postId } = req.params;
  const { content } = req.body as { content: string };
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: "Comment content is required" });
  }

  try {
    const comment = await prisma.postComment.create({
      data: {
        postId,
        userId: req.user!.id,
        content: content.trim(),
      },
      include: {
        user: { select: { id: true, fullName: true, uniqueId: true, profilePhotoUrl: true } },
      },
    });
    res.status(201).json(comment);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add comment" });
  }
}

// Increments share count
export async function sharePost(req: AuthedRequest, res: Response) {
  const { postId } = req.params;
  try {
    const updated = await prisma.post.update({
      where: { id: postId },
      data: { sharesCount: { increment: 1 } },
    });
    res.json({ sharesCount: updated.sharesCount });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to log share" });
  }
}

// Status Updates (WhatsApp style)
export async function createStatus(req: AuthedRequest, res: Response) {
  const { mediaUrl, caption } = req.body as { mediaUrl?: string; caption?: string };
  try {
    const status = await prisma.statusUpdate.create({
      data: {
        userId: req.user!.id,
        mediaUrl: mediaUrl || null,
        caption: caption || null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
      },
    });
    res.status(201).json(status);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create status" });
  }
}

// Retrieve active statuses of athletes in the same sports / all active public athletes
export async function listActiveStatuses(req: AuthedRequest, res: Response) {
  const now = new Date();
  try {
    // Return all unexpired statuses of public profiles or team members
    const statuses = await prisma.statusUpdate.findMany({
      where: {
        expiresAt: { gt: now },
        user: {
          OR: [
            { isPublic: true },
            { memberships: { some: { userId: req.user!.id } } }, // same team check
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, fullName: true, uniqueId: true, profilePhotoUrl: true } },
      },
    });
    res.json(statuses);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to list status updates" });
  }
}
