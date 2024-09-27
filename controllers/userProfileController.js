import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import prisma from "../db/db.config.js";
import { socialMediaLinkSchema } from "../validations/userProfileValidations.js";
import { handleCatchReturnError, handleTryReturnError } from "../helper.js";
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
      return handleTryReturnError(res, 401, "Unauthorized Access");
    }

    // verify existing socialmedia platform

    const existingPlatform = await prisma.socialMediaLinks.findFirst({
      where: {
        user_id: user_id,
        platform: payload.platform,
      },
    });

    if (existingPlatform) {
      return handleTryReturnError(
        res,
        401,
        "Social Media Link Already Exist try another one"
      );
    }

    // If User Exist then continue adding socialMediaURL

    await prisma.socialMediaLinks.create({
      data: {
        user_id: user_id,
        ...payload,
      },
    });

    return handleTryReturnError(res, 200, "User social media link added");
  } catch (error) {
    return handleCatchReturnError(
      error,
      res,
      "Error while adding social media link"
    );
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
        return handleTryReturnError(res, 401, "Unauthorized Access");
      }

      const coverImageLocalPath = req.file.path;

      const coverImage = await uploadOnCloudinary(coverImageLocalPath);

      if (!coverImage) {
        return handleTryReturnError(
          res,
          401,
          "Error while uploading image to cloudinary"
        );
      }

      await prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          coverImage: coverImage.url,
        },
      });

      return handleTryReturnError(res, 200, "Cover Image Added");
    } catch (error) {
      return handleCatchReturnError(
        error,
        res,
        "Error while adding cover image"
      );
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
      return handleTryReturnError(res, 401, "Unauthorized Access");
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
      return handleTryReturnError(
        res,
        401,
        "Please check user account as the acitivty is not initialized"
      );
    }

    return handleTryReturnError(res, 200, "Activity Found", activity);
  } catch (error) {
    return handleCatchReturnError(
      error,
      res,
      "Error while checking user activity"
    );
  }
});

export default profileRouter;
