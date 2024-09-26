import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import prisma from "../db/db.config";
import { socialMediaLinkSchema } from "../validations/userProfileValidations";
import { formatError } from "../helper";
import { ZodError } from "zod";

const profileRouter = Router();

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
