import { response, Router } from "express";
import prisma from "../db/db.config.js";
import {
  postSchemaValidation,
  postUpdateSchemaValidation,
} from "../validations/postValidaiton.js";
import { formatError } from "../helper.js";
import { ZodError } from "zod";
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

      console.log(user_id);

      // Check User In Database

      const user = await prisma.user.findUnique({
        where: {
          id: user_id,
        },
      });

      if (!user) {
        return res.status(404).json({ message: "User Not Found" });
      }

      // Upload Image

      const postImageLocalPath = req.file.path;

      const postImage = await uploadOnCloudinary(postImageLocalPath);

      if (!postImage) {
        return res.status(400).json({
          message: "Error While Uploading Image. Please Try Again",
        });
      }

      const post = await prisma.post.create({
        data: {
          user_id: user_id,
          title: payload.title,
          content: payload.content,
          postImage: postImage.url,
        },
      });

      // Do not know how to serialize a BigInt. This is not an database issue just need to return string

      const responsePostData = {
        ...post,
        commentCount: post.commentCount.toString(),
      };

      return res.json({ responsePostData, user_id });
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

  return res.status(200).json({ status: 200, data: posts });
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
      return res.status(422).json({ message: "Unauthorized Access" });
    }

    const postData = await prisma.post.findUnique({
      where: {
        id: Number(post_id),
      },
    });

    if (!postData) {
      return res.status(403).json({ message: "Post Not Found Check Again" });
    }

    if (Number(postData.user_id) !== Number(user_id)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to update this post." });
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

    return res
      .status(200)
      .json({ message: "Your post updated successfully", postResponseData });
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
      return res.status(422).json({ message: "Unauthorized Access" });
    }

    const postData = await prisma.post.findUnique({
      where: {
        id: Number(post_id),
      },
    });

    if (!postData) {
      return res.status(403).json({ message: "Post Not Found Check Again" });
    }

    if (Number(postData.user_id) !== Number(user_id)) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this post." });
    }

    await prisma.post.delete({
      where: {
        id: Number(post_id),
      },
    });

    return res.status(200).json({ message: "Your post deleted successfully" });
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
});

export default postRouter;
