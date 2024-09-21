import { Router } from "express";
import authRouter from "../controllers/authController.js";

const routes = Router();

routes.use("/api/auth", authRouter);

export default routes;
