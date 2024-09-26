import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import prisma from "../db/db.config";

const profileRouter = Router();

profileRouter.post("/socialMediaLinks", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.id;

    // check user in database

    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Unauthorized Access" });
    }

    // If User Exist then continue adding socialMediaURL
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
