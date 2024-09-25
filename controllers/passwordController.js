import { Router } from "express";
import { ZodError } from "zod";
import { formatError, renderEmailEjs } from "../helper";
import { authMiddleware } from "../middleware/authMiddleware";
import prisma from "../db/db.config";
import { postUpdateSchemaValidation } from "../validations/postValidaiton";
import bcrypt from "bcrypt";
import { passwordResetSchema } from "../validations/authvalidation";
import { sendMail } from "../config/mail";

const passwordRouter = Router();

passwordRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.id;

    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return res.status(422).json({ message: "Unauthorized Access" });
    }

    // Generate OTP For user

    const otp = Math.floor(100000 + Math.random() * 900000);
    const emailBody = await renderEmailEjs("passwordResetRequest", {
      name: user.name,
      otp: otp,
    });

    await sendMail(user.email, "Password Reset Otp", emailBody);

    await prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        passwordResetOtp: otp,
      },
    });

    return res.status(200).json({
      message: "Password Reset Otp has been sent to your mailbox",
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
      .json({ message: "Error registering user.", errors: error.message });
  }
});

passwordRouter.post("/reset-password", authMiddleware, async (req, res) => {
  try {
    const body = req.body;
    const payload = passwordResetSchema.parse(body);

    const user_id = req.user.id;
    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return res.status(422).json({ message: "Unauthorized Access" });
    }

    // If user exist then verify otp

    if (user.passwordResetOtp !== payload.otp) {
      return res.status(402).json({ message: "Incorrect or Invalid Otp" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(payload.password, salt);

    await prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        passwordResetOtp: null,
        password: hashedPassword,
      },
    });

    const emailBody = await renderEmailEjs("passwordResetSuccess", {
      name: user.name,
    });

    await sendMail(user.email, "Account Verified", emailBody);

    return res.status(200).json({
      message:
        "Your Password reset successfully. You can login using new password",
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
      .json({ message: "Error registering user.", errors: error.message });
  }
});
