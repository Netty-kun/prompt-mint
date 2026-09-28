import express from "express";
import { GetPromptOrder, SetPromptOrder } from "../controllers/promptOrderController";

export const promptOrderRouter = express.Router();

promptOrderRouter.get("/", GetPromptOrder);
promptOrderRouter.put("/", SetPromptOrder);
