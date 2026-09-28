import express from "express";
import { GetAnalyticsRollups, TriggerAnalyticsRollup } from "../controllers/analyticsRollupController";

export const analyticsRollupRouter = express.Router();

analyticsRollupRouter.get("/", GetAnalyticsRollups);
analyticsRollupRouter.post("/trigger", TriggerAnalyticsRollup);
