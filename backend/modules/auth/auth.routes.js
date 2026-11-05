import express from "express";
import {
  RegisterUser,
  LoginUser,
  RefreshTokenHandler,
  LogoutUser
} from "./auth.controller.js";

const router = express.Router();

router.post("/register", RegisterUser);
router.post("/login", LoginUser);
router.post("/refresh-token", RefreshTokenHandler);
router.post("/logout", LogoutUser);

export default router;
