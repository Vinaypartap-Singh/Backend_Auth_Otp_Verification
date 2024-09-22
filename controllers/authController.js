import { Router } from "express";
import {
  loginSchemaValidation,
  registerSchemaValidation,
  verifyEmailSchema,
} from "../validations/authvalidation.js";
import prisma from "../db/db.config.js";
import bcrypt from "bcrypt";
import { ZodError } from "zod";
import { formatError, renderEmailEjs } from "../helper.js";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { sendMail } from "../config/mail.js";
import { upload } from "../middleware/multerMiddleware.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";

const authRouter = Router();

authRouter.post(
  "/register",
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const body = req.body;
      const payload = registerSchemaValidation.parse(body);

      const user = await prisma.user.findUnique({
        where: {
          email: payload.email,
        },
      });

      if (user) {
        return res.status(422).json({ message: "User already exist." });
      }

      const profileImageLocalPath = req.file.path;

      const profileImage = await uploadOnCloudinary(profileImageLocalPath);

      console.log(profileImage.url);

      if (!profileImage) {
        return res.status(200).json({
          message:
            "Error while uploading image to cloudinary please try again later",
        });
      }

      // If user does not exist we will hash the password
      const salt = await bcrypt.genSalt(10);
      payload.password = await bcrypt.hash(payload.password, salt);

      // generate otp for account verification

      const otp = Math.floor(100000 + Math.random() * 900000);
      const emailBody = await renderEmailEjs("verifyEmail", {
        name: payload.name,
        otp: otp,
      });

      await sendMail(payload.email, "Verification OTP Email", emailBody);

      await prisma.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          password: payload.password,
          user_otp: otp,
          profile: profileImage.url,
        },
      });

      return res.status(200).json({
        message:
          "Your account has been created successfully. Enter OTP to verify your account",
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
  }
);

// Create a post for email verification

authRouter.post("/verify-account", async (req, res) => {
  try {
    const body = req.body;
    const payload = verifyEmailSchema.parse(body);

    // check user exist in database

    const user = await prisma.user.findUnique({
      where: {
        email: payload.email,
      },
    });

    if (!user) {
      return res.status(422).json({
        message: "Invalid Credentials cannot verify account",
      });
    }

    // If user exist then check for otp

    if (user.user_otp !== payload.otp) {
      return res.status(400).json({ message: "Incorrect otp" });
    }

    // If everything fine then  update the account status to verified and otp to null

    // Send user an email that your account is verified

    const emailBody = await renderEmailEjs("accountVerified", {
      name: user.name,
    });

    await sendMail(payload.email, "Account Verified", emailBody);

    await prisma.user.update({
      where: {
        email: payload.email,
      },
      data: {
        account_verified: true,
        user_otp: null,
      },
    });

    return res.status(200).json({
      message: "Account verification success. You can now login your account",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedError = formatError(error);
      return res.status(422).json({
        message: "Validation error.",
        errors: formattedError,
      });
    }
    return res.status(422).json({
      message: "Error while login account. Please check your credentials",
      errors: error.message,
    });
  }
});

// Login user

authRouter.post("/login", async (req, res) => {
  try {
    const body = req.body;
    const payload = loginSchemaValidation.parse(body);

    // check whether user exist or not

    const user = await prisma.user.findUnique({
      where: {
        email: payload.email,
      },
    });

    if (!user || user === null) {
      return res.status(422).json({
        errors: {
          email: "User does not exist. Please create an account to continue",
        },
      });
    }

    // If User exist check if user is verified or not just in case if someoine try to login directly

    if (!user.account_verified) {
      return res.status(400).json({
        message:
          "Your Account is not verified. Please verify your account in order to continue",
      });
    }

    // if user exist then check password

    const correctPassword = await bcrypt.compare(
      payload.password,
      user.password
    );

    if (!correctPassword) {
      return res.status(422).json({
        error: {
          email: "Inavlid Credentials",
        },
      });
    }

    // If everything works fine we will generate a jwt token

    const jwtPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      account_verified: user.account_verified,
    };

    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET_KEY, {
      expiresIn: "30d",
    });

    return res.json({
      message: "Account Login Success",
      data: {
        ...jwtPayload,
        token: `Bearer ${token}`,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedError = formatError(error);
      return res.status(422).json({
        message: "Validation error.",
        errors: formattedError,
      });
    }
    return res.status(422).json({
      message: "Error while login account. Please check your credentials",
      errors: error.message,
    });
  }
});

// Get User Details

authRouter.get("/user", authMiddleware, async (req, res) => {
  const user = req.user;
  return res.json({ data: user });
});

export default authRouter;
