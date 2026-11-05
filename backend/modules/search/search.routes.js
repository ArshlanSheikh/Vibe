import express from "express";
import { SearchAll, GetTrendingTopics } from "./search.controller.js";

const router = express.Router();

router.get("/", SearchAll);
router.get("/trending-topics", GetTrendingTopics);

export default router;
