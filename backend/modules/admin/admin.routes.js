import express from "express";
import {
  GetDashboardStats,
  GetAdminUsersList,
  UpdateUserAccountStatus,
  AdminModerateContentAction,
  RemoveOrRestoreContent,
  GetAuditLogs
} from "./admin.controller.js";
import { verifyToken } from "../auth/auth.middleware.js";
import { verifyAdminRole } from "./admin.middleware.js";

const router = express.Router();

// Guard all admin routes with token & admin role verification
router.use(verifyToken, verifyAdminRole);

router.get("/dashboard/stats", GetDashboardStats);
router.get("/users", GetAdminUsersList);
router.patch("/users/:id/status", UpdateUserAccountStatus);
router.post("/moderation/:id/action", AdminModerateContentAction);
router.patch("/content/:contentType/:id", RemoveOrRestoreContent);
router.get("/audit-logs", GetAuditLogs);

export default router;
