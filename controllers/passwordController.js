import { Router } from "express";
import {
  handleCatchReturnError,
  handleTryReturnError,
  renderEmailEjs,
} from "../helper";
import { authMiddleware } from "../middleware/authMiddleware";
import prisma from "../db/db.config";
import bcrypt from "bcrypt";
import { passwordResetSchema } from "../validations/authvalidation";
import { sendMail } from "../config/mail";

const passwordRouter = Router();

// Request Password Reset OTP

passwordRouter.post("/", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.id;

    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return handleTryReturnError(res, 401, "User not found");
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

    return handleTryReturnError(
      res,
      200,
      "Password Reset Otp has been sent to your mailbox"
    );
  } catch (error) {
    return handleCatchReturnError(error, res, "Error while password reset");
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
      return handleTryReturnError(res, 401, "Unauthorized Access");
    }

    // If user exist then verify otp

    if (user.passwordResetOtp !== payload.otp) {
      return handleTryReturnError(res, 401, "Invalid OTP or Password");
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

    return handleTryReturnError(
      res,
      200,
      "Your password reset successfully. You can login using new password"
    );
  } catch (error) {
    return handleCatchReturnError(
      error,
      res,
      "Error while password reset. Please check"
    );
  }
});
