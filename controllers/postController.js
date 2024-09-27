import { Router } from "express";
import prisma from "../db/db.config.js";
import {
  postSchemaValidation,
  postUpdateSchemaValidation,
} from "../validations/postValidaiton.js";
import { handleCatchReturnError, handleTryReturnError } from "../helper.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multerMiddleware.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";

const postRouter = Router();

// create post

postRouter.post(
  "/",
  upload.single("postImage"),
  authMiddleware,
  async (req, res) => {
    try {
      const body = req.body;
      const payload = postSchemaValidation.parse(body);
      const user_id = req.user.id;

      // Check User In Database

      const user = await prisma.user.findUnique({
        where: {
          id: user_id,
        },
      });

      if (!user) {
        return handleTryReturnError(res, 403, "User Not Found");
      }

      // Upload Image

      const postImageLocalPath = req.file.path;

      const postImage = await uploadOnCloudinary(postImageLocalPath);

      if (!postImage) {
        return handleTryReturnError(
          res,
          400,
          "Error while uploading Image. Please try again"
        );
      }

      // Create Post

      const post = await prisma.post.create({
        data: {
          user_id: user_id,
          title: payload.title,
          content: payload.content,
          postImage: postImage.url,
        },
      });
      // Always create a new activity log entry for each post
      await prisma.activityLog.create({
        data: {
          user_id: user_id,
          post_id: post.id,
        },
      });

      // Do not know how to serialize a BigInt. This is not an database issue just need to return string

      const responsePostData = {
        ...post,
        commentCount: post.commentCount.toString(),
      };

      let data = { responsePostData, user_id };

      return handleTryReturnError(res, 200, "Post Data", data);
    } catch (error) {
      return handleCatchReturnError(error, res, "Error while uploading post");
    }
  }
);

// Read Post

postRouter.get("/", async (req, res) => {
  const posts = await prisma.post.findMany({
    include: {
      Comments: {
        include: {
          user: true,
        },
      },
    },
  });

  return handleTryReturnError(res, 200, posts);
});

// Update Post

postRouter.put("/update/:id", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.id;
    const post_id = req.params.id;

    const user = await prisma.user.findUnique({
      where: {
        id: Number(user_id),
      },
    });

    if (!user) {
      return handleTryReturnError(res, 403, "User not found.");
    }

    const postData = await prisma.post.findUnique({
      where: {
        id: Number(post_id),
      },
    });

    if (!postData) {
      return handleTryReturnError(res, 401, "Post nopt found check again");
    }

    if (Number(postData.user_id) !== Number(user_id)) {
      return handleTryReturnError(
        res,
        401,
        "You are not authorized to delete this post"
      );
    }

    const body = req.body;
    const payload = postUpdateSchemaValidation.parse(body);

    const updatePost = await prisma.post.update({
      where: {
        id: Number(post_id),
      },
      data: {
        title: payload.title,
        content: payload.content,
      },
    });

    const postResponseData = {
      ...updatePost,
      commentCount: postData.commentCount.toString(),
    };

    return handleTryReturnError(
      res,
      200,
      "Your Post deleted Successfully",
      postResponseData
    );
  } catch (error) {
    return handleCatchReturnError(errro, res, "Error while updating Post");
  }
});

// Delete Post

postRouter.delete("/delete/:id", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.id;
    const post_id = req.params.id;

    const user = await prisma.user.findUnique({
      where: {
        id: Number(user_id),
      },
    });

    if (!user) {
      return handleTryReturnError(res, 401, "Unathorized Access");
    }

    const postData = await prisma.post.findUnique({
      where: {
        id: Number(post_id),
      },
    });

    if (!postData) {
      return handleTryReturnError(res, 403, "Post not found check again");
    }

    if (Number(postData.user_id) !== Number(user_id)) {
      return handleTryReturnError(
        res,
        403,
        "You are not authorizes to delete this post"
      );
    }

    await prisma.post.delete({
      where: {
        id: Number(post_id),
      },
    });

    return handleTryReturnError(res, 403, "Your Post deleted successfully");
  } catch (error) {
    return handleCatchReturnError(error, res, "Error while deleting Post");
  }
});

export default postRouter;
