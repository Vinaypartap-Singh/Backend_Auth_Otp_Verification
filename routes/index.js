import { Router } from "express";
import authRouter from "../controllers/authController.js";
import postRouter from "../controllers/postController.js";
import profileRouter from "../controllers/userProfileController.js";

const routes = Router();

routes.use("/api/auth", authRouter);
routes.use("/api/post", postRouter);
routes.use("/api/profile", profileRouter);

export default routes;
