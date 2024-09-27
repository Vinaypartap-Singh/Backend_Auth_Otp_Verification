import { Router } from "express";
import {
  loginSchemaValidation,
  registerSchemaValidation,
  twoFactorAuthSchema,
  twoFactorAuthVerifySchema,
  verifyEmailSchema,
} from "../validations/authvalidation.js";
import prisma from "../db/db.config.js";
import bcrypt from "bcrypt";
import {
  handleCatchReturnError,
  handleTryReturnError,
  renderEmailEjs,
} from "../helper.js";
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
        return handleTryReturnError(res, 200, "User Already Exist");
      }

      const profileImageLocalPath = req.file.path;

      const profileImage = await uploadOnCloudinary(profileImageLocalPath);

      if (!profileImage) {
        return handleTryReturnError(
          res,
          200,
          "Error while uploading Image. Please try again"
        );
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

      // Create User

      await prisma.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          password: payload.password,
          user_otp: otp,
          profile: profileImage.url,
        },
      });

      return handleTryReturnError(
        res,
        200,
        "Your account has been created successfully. Enter OTP to verify your account"
      );
    } catch (error) {
      return handleCatchReturnError(error, 400, "Error while registering user");
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
      return handleTryReturnError(
        res,
        402,
        "Inavlid Credentials Cannot Verify Account"
      );
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

    return handleTryReturnError(
      res,
      200,
      "Account Verification success. YOu can now login your account"
    );
  } catch (error) {
    return handleCatchReturnError(error, 400, "Error While Verifying Account");
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
      return handleTryReturnError(
        res,
        401,
        "User Does not exist. Please create an account to continue"
      );
    }

    // If User exist check if user is verified or not just in case if someoine try to login directly

    if (!user.account_verified) {
      return handleTryReturnError(
        res,
        401,
        "Your Account is not verified. Please Verify your account in order to continue"
      );
    }

    // if user exist then check password

    const correctPassword = await bcrypt.compare(
      payload.password,
      user.password
    );

    if (!correctPassword) {
      return handleTryReturnError(res, 401, "Inavlid Credentials");
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

    const apiResponseData = {
      ...jwtPayload,
      token: `Bearer ${token}`,
    };

    return handleTryReturnError(
      res,
      200,
      "Account Login Successfully",
      apiResponseData
    );
  } catch (error) {
    return handleCatchReturnError(error, 500, "Error while login user.");
  }
});

// Get User Details

authRouter.get("/user", authMiddleware, async (req, res) => {
  const user = req.user;
  return res.json({ data: user });
});

authRouter.put("/enableTwoFactorAuth", authMiddleware, async (req, res) => {
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

    if (user.useTwoFactorEmail === true) {
      return handleTryReturnError(
        res,
        400,
        "Two Factor Authentication Already Enabled."
      );
    }

    // Update the database

    await prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        useTwoFactorEmail: true,
      },
    });

    return handleTryReturnError(
      res,
      200,
      "Two Factor Authentication enabled. You can add your 2FA Email Now"
    );
  } catch (error) {
    return handleCatchReturnError(
      error,
      res,
      "Error while enabling 2 Factor Authentication"
    );
  }
});

authRouter.put("/disableTwoFactorAuth", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user.id;

    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return handleTryReturnError(res, 401, "Unathorized Access");
    }

    if (user.useTwoFactorEmail === false) {
      return handleTryReturnError(res, 400, "Two Factor Auth Already Disbaled");
    }

    await prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        useTwoFactorEmail: false,
      },
    });

    return handleTryReturnError(res, 200, "Two Factor Auth Disabled");
  } catch (error) {
    return handleCatchReturnError(
      error,
      res,
      "Error while disabling Two Factor Auth"
    );
  }
});

authRouter.post("/addTwoFactorEmail", authMiddleware, async (req, res) => {
  try {
    const user_id = req.user;
    const body = req.body;
    const payload = twoFactorAuthSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return handleTryReturnError(res, 200, "Unauthorized Access");
    }

    if (!user.useTwoFactorEmail) {
      return handleTryReturnError(
        res,
        401,
        "Two Factor Authentication not Enabled. Please enable tow factor authentication to continue"
      );
    }

    if (user.email === payload.twoFactorEmail) {
      return handleTryReturnError(
        res,
        400,
        "Primary email cannot be used for 2 factor authentication. Please user another email."
      );
    }

    // generate otp for account verification

    const otp = Math.floor(100000 + Math.random() * 900000);
    const emailBody = await renderEmailEjs("twoFactorEmailVerify", {
      name: user.name,
      otp: otp,
    });

    await sendMail(payload.twoFactorEmail, "Verification OTP Email", emailBody);

    return handleTryReturnError(
      res,
      400,
      "Verification Otp sent on your email. Please verify to continue adding email"
    );
  } catch (error) {
    return handleCatchReturnError(
      error,
      res,
      "Error adding two factor auth email"
    );
  }
});

authRouter.put("/verifytwofactoremail", authMiddleware, async (req, res) => {
  try {
    const body = req.body;
    const payload = twoFactorAuthVerifySchema.parse(body);

    const user_id = req.user.id;

    const user = await prisma.user.findUnique({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return handleTryReturnError(res, 400, "Unauthorized Access");
    }

    if (user.twoFactorEmail !== payload.twoFactorEmail) {
      return handleTryReturnError(
        res,
        401,
        "Invalid Email Please enter correct email"
      );
    }

    if (user.twoFactorEmailVerifyOtp !== payload.otp) {
      return handleTryReturnError(res, 401, "Invalid OTP. Please check again");
    }

    await prisma.user.update({
      where: {
        id: user_id,
      },
      data: {
        twoFactorEmailVerifyOtp: null,
        twoFactorEmailVerified: true,
      },
    });

    // Send Email

    // Send user an email that your account is verified

    const emailBody = await renderEmailEjs("twoFactorEmailVerified", {
      name: user.name,
    });

    await sendMail(
      user.twoFactorEmail,
      "Two Factor Authentcation Account Verified",
      emailBody
    );

    return handleTryReturnError(
      res,
      200,
      "Your Two Factor Email has been verified"
    );
  } catch (error) {
    return handleCatchReturnError(
      error,
      res,
      "Error while verifying two factor auth email"
    );
  }
});

export default authRouter;
