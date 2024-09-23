import { Router } from "express";
import authRouter from "../controllers/authController.js";
import postRouter from "../controllers/postController.js";

const routes = Router();

routes.use("/api/auth", authRouter);
routes.use("/api/post", postRouter);

export default routes;
