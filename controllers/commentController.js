import { Router } from "express";
import prisma from "../db/db.config";
import { formatError } from "../helper";
import { ZodError } from "zod";
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
      return res.status(200).json({ message: "no Comment on this post" });
    }

    return res.status(200).json({ message: "Comments", data: comments });
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedError = formatError(error);
      return res.status(422).json({
        message: "Validation error.",
        errors: formattedError,
      });
    }
    return res
      .status(422)
      .json({ message: "Error Creating Post", errors: error.message });
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
      return res.status(422).json({ message: "Unauthorized Access" });
    }

    // check if post exist in database

    const post = await prisma.post.findUnique({
      where: {
        id: Number(post_id),
      },
    });

    if (!post) {
      return res
        .status(400)
        .json({ message: "Post does not exist. Please check and try again" });
    }

    const comment = await prisma.comments.create({
      data: {
        comment: payload.comment,
        post_id: Number(post_id),
        user_id: user_id,
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

    return res.status(201).json({
      message: "Comment created successfully",
      data: comment,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedError = formatError(error);
      return res.status(422).json({
        message: "Validation error.",
        errors: formattedError,
      });
    }
    return res
      .status(422)
      .json({ message: "Error Creating Post", errors: error.message });
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
      return res.status(422).json({ message: "Unauthorized Access" });
    }

    // check whether comment exist in database or not

    const comment = await prisma.comments.findUnique({
      where: {
        id: comment_id,
      },
    });

    if (!comment) {
      return res.status(400).json({ message: "Comment does not exist" });
    }

    // check if user id == comment id

    if (comment.user_id !== user_id) {
      return res
        .status(400)
        .json({ message: "Unauthorized access to edit the comment" });
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

    return res
      .status(200)
      .json({ message: "Comment Updated", data: updatedComment });
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedError = formatError(error);
      return res.status(422).json({
        message: "Validation error.",
        errors: formattedError,
      });
    }
    return res
      .status(422)
      .json({ message: "Error Creating Post", errors: error.message });
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
        return res.status(422).json({ message: "Unauthorized Access" });
      }

      const commentData = await prisma.comments.findUnique({
        where: {
          id: Number(comment_id),
        },
      });

      if (!commentData) {
        return res
          .status(403)
          .json({ message: "Comment Not Found Check Again" });
      }

      if (Number(commentData.user_id) !== Number(user_id)) {
        return res
          .status(403)
          .json({ message: "You are not authorized to delete this post." });
      }

      await prisma.comments.delete({
        where: {
          id: Number(post_id),
        },
      });

      return res
        .status(200)
        .json({ message: "Your post deleted successfully" });
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedError = formatError(error);
        return res.status(422).json({
          message: "Validation error.",
          errors: formattedError,
        });
      }
      return res
        .status(422)
        .json({ message: "Error Updating Post", errors: error.message });
    }
  }
);
