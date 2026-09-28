import { Router } from "express";
import {
  getRobotsTxt,
  getSEOControls,
  updateSEOControls,
} from "../controllers/robotsController";

export const robotsRouter = Router();

// Endpoint for robots.txt
robotsRouter.get("/robots.txt", getRobotsTxt);

// API Endpoints for SEO controls
robotsRouter.get("/api/seo/controls", getSEOControls);
robotsRouter.post("/api/seo/controls", updateSEOControls);
