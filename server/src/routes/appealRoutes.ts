import express from "express";
import asyncHandler from "express-async-handler";
import {
  fileAppeal,
  resolveAppeal,
  withdrawAppeal,
  getAppeal,
  getAppealsForDecision,
} from "../services/appealService";
import { AppError } from "../lib/AppError";

/**
 * Appeal routes — moderation-decision appeal workflow.
 *
 * POST   /api/appeals                     — file a new appeal
 * GET    /api/appeals/:id                 — get appeal details + history
 * GET    /api/appeals/decision/:decisionId — list appeals for a decision
 * POST   /api/appeals/:id/resolve         — resolve (approve / reject)
 * POST   /api/appeals/:id/withdraw        — withdraw an appeal
 */

export const appealRouter = express.Router();

// ── File a new appeal ─────────────────────────────────────────────────────────

appealRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { decisionId, appellantAddress, statement, evidenceRefs } = req.body;

    if (!decisionId || !appellantAddress || !statement) {
      throw new AppError("decisionId, appellantAddress, and statement are required.", 400, "MISSING_FIELDS");
    }

    const appeal = await fileAppeal({
      decisionId,
      appellantAddress,
      statement,
      evidenceRefs,
    });
    res.status(201).json({ success: true, appeal });
  }),
);

// ── Get appeal by ID ──────────────────────────────────────────────────────────

appealRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const appeal = await getAppeal(req.params.id);
    res.json(appeal);
  }),
);

// ── List appeals for a decision ───────────────────────────────────────────────

appealRouter.get(
  "/decision/:decisionId",
  asyncHandler(async (req, res) => {
    const appeals = await getAppealsForDecision(req.params.decisionId);
    res.json({ appeals });
  }),
);

// ── Resolve an appeal ─────────────────────────────────────────────────────────

appealRouter.post(
  "/:id/resolve",
  asyncHandler(async (req, res) => {
    const { resolverAddress, outcome, reason, evidenceRefs } = req.body;

    if (!resolverAddress || !outcome || !reason) {
      throw new AppError("resolverAddress, outcome, and reason are required.", 400, "MISSING_FIELDS");
    }

    if (!["approved", "rejected"].includes(outcome)) {
      throw new AppError('outcome must be "approved" or "rejected".', 400, "MISSING_FIELDS");
    }

    const appeal = await resolveAppeal({
      appealId: req.params.id,
      resolverAddress,
      outcome,
      reason,
      evidenceRefs,
    });
    res.json({ success: true, appeal });
  }),
);

// ── Withdraw an appeal ────────────────────────────────────────────────────────

appealRouter.post(
  "/:id/withdraw",
  asyncHandler(async (req, res) => {
    const { appellantAddress, reason } = req.body;

    if (!appellantAddress) {
      throw new AppError("appellantAddress is required.", 400, "MISSING_FIELDS");
    }

    const appeal = await withdrawAppeal({
      appealId: req.params.id,
      appellantAddress,
      reason,
    });
    res.json({ success: true, appeal });
  }),
);
