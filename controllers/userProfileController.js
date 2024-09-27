import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import prisma from "../db/db.config.js";
import { socialMediaLinkSchema } from "../validations/userProfileValidations.js";
import { formatError } from "../helper.js";
import { ZodError } from "zod";
import { upload } from "../middleware/multerMiddleware.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";

const profileRouter = Router();

// User Social Media Profile Links

profileRouter.post("/socialMediaLinks", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.id;
    // Validate zod
    const body = req.body;
    const payload = socialMediaLinkSchema.parse(body);

    // check user in database

    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Unauthorized Access" });
    }

    // verify existing socialmedia platform

    const existingPlatform = await prisma.socialMediaLinks.findFirst({
      where: {
        user_id: user_id,
        platform: payload.platform,
      },
    });

    if (existingPlatform) {
      return res
        .status(400)
        .json({ message: "Social Media Link Already Exist try another one" });
    }

    // If User Exist then continue adding socialMediaURL

    await prisma.socialMediaLinks.create({
      data: {
        user_id: user_id,
        ...payload,
      },
    });

    return res.status(200).json({ message: "User Social Media Links Added" });
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
      .json({ message: "Error registering user.", errors: error.message });
  }
});

// User Profile Cover Image

profileRouter.put(
  "/profileCoverImage",
  upload.single("coverImage"),
  authMiddleware,
  async (req, res) => {
    try {
      const user_id = req.user.id;

      const user = await prisma.user.findUnique({
        where: {
          id: user_id,
        },
      });

      if (!user) {
        return res.status(400).json({ message: "Unauthorized Access" });
      }

      const coverImageLocalPath = req.file.path;

      const coverImage = await uploadOnCloudinary(coverImageLocalPath);

      if (!coverImage) {
        return res
          .status(400)
          .json({ message: "Error while uploading to cloudinary" });
      }

      await prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          coverImage: coverImage.url,
        },
      });

      return res.status(200).json({ message: "Cover Image Added" });
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
        .json({ message: "Error registering user.", errors: error.message });
    }
  }
);

// Get User Activity

profileRouter.get("/userActivity", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.id;

    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Unzuthorized Access" });
    }

    // If User Exist then simply get user acivity

    const activity = await prisma.activityLog.findMany({
      where: {
        user_id: user.id,
      },
      include: {
        user: true, // Include user details
        post: true, // Include post associated with this activity log (if any)
        comments: true, // Include comments associated with this activity log (if any)
      },
    });

    if (!activity) {
      return res.status(400).json({
        message: "Please check user account as the activity is not initialized",
      });
    }

    return res.status(200).json({ message: "Activity Found", activity });
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
      .json({ message: "Error Getting user activity.", errors: error.message });
  }
});

export default profileRouter;
