import { Router } from "express";
import prisma from "../db/db.config";
import { handleCatchReturnError, handleTryReturnError } from "../helper";
import { authMiddleware } from "../middleware/authMiddleware";
import { postCommentSchemaValidation } from "../validations/postValidaiton";

const commentRouter = Router();

// Get  All Comments for specific post

commentRouter.get("/:post_id", async (req, res) => {
  try {
    const post_id = req.params.post_id;

    if (!post_id) {
      return res.status(402).json({ message: "Post does not Exist" });
    }

    const comments = await prisma.comments.findMany({
      where: {
        post_id: post_id,
      },
      include: {
        user: true,
        post: {
          include: {
            user: true,
          },
        },
      },
    });

    // If Comments Length === 0

    if (comments.length === 0) {
      return handleTryReturnError(res, 200, "No Comment on this post");
    }

    return handleTryReturnError(res, 200, "Comments", comments);
  } catch (error) {
    return handleCatchReturnError(
      error,
      res,
      "Error while getting post comments"
    );
  }
});

// Add Comment To Post
commentRouter.post("/:post_id", authMiddleware, async (req, res) => {
  try {
    const body = req.body;
    const payload = postCommentSchemaValidation.parse(body);
    const user_id = req.user.id;
    const post_id = req.params.post_id;

    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return handleTryReturnError(res, 401, "Unauthorized Access");
    }

    // check if post exist in database

    const post = await prisma.post.findUnique({
      where: {
        id: Number(post_id),
      },
    });

    if (!post) {
      return handleTryReturnError(
        res,
        401,
        "Post does not exist. Please re-check"
      );
    }

    const comment = await prisma.comments.create({
      data: {
        comment: payload.comment,
        post_id: Number(post_id),
        user_id: user_id,
      },
    });

    // Log the comment activity by always creating a new entry in ActivityLog
    await prisma.activityLog.create({
      data: {
        user_id: user_id, // The user who made the comment
        comment_id: comment.id, // The ID of the new comment
      },
    });

    // Increment the comment count on the post
    await prisma.post.update({
      where: { id: Number(post_id) },
      data: {
        commentCount: {
          increment: 1, // Increments the comment count
        },
      },
    });

    return handleTryReturnError(
      res,
      200,
      "Comment Created Successfully",
      comment
    );
  } catch (error) {
    return handleCatchReturnError(error, res, "Error while creating comment");
  }
});

// Update Comment To Post

commentRouter.put("/update/:comment_id", authMiddleware, async (req, res) => {
  try {
    const body = req.body;
    const payload = postCommentSchemaValidation.parse(body);
    const comment_id = req.params.comment_id;
    const user_id = req.user.id;

    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return handleTryReturnError(res, 401, "Unauthorized Access");
    }

    // check whether comment exist in database or not

    const comment = await prisma.comments.findUnique({
      where: {
        id: comment_id,
      },
    });

    if (!comment) {
      return handleTryReturnError(res, 401, "Comment does not exist");
    }

    // check if user id == comment id

    if (comment.user_id !== user_id) {
      return handleTryReturnError(
        res,
        401,
        "Unauthorized Access To edit the comment"
      );
    }

    // If everything goes alright update the comment

    const updatedComment = await prisma.comments.update({
      where: {
        id: Number(comment_id),
      },
      data: {
        comment: payload.comment,
      },
    });

    return handleTryReturnError(res, 200, "Comment Updated", updatedComment);
  } catch (error) {
    return handleCatchReturnError(error, res, "Error while updating comment");
  }
});

// Delete Comment To Post

commentRouter.delete(
  "/delete/:comment_id",
  authMiddleware,
  async (req, res) => {
    try {
      const user_id = req.user.id;
      const comment_id = req.params.comment_id;

      const user = await prisma.user.findUnique({
        where: {
          id: Number(user_id),
        },
      });

      if (!user) {
        return handleTryReturnError(res, 401, "Unauthorized Access");
      }

      const commentData = await prisma.comments.findUnique({
        where: {
          id: Number(comment_id),
        },
      });

      if (!commentData) {
        return handleTryReturnError(res, 401, "Comment not found check again");
      }

      if (Number(commentData.user_id) !== Number(user_id)) {
        return handleTryReturnError(
          res,
          401,
          "You don't have authorized access to edit the comment"
        );
      }

      await prisma.comments.delete({
        where: {
          id: Number(post_id),
        },
      });

      return handleTryReturnError(res, 200, "Comment deleted successfully");
    } catch (error) {
      return handleCatchReturnError(error, res, "Error while deleting comment");
    }
  }
);
