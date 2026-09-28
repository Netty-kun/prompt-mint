import mongoose from "mongoose";

/**
 * ModerationDecision — a resolved moderation action that may be appealed.
 *
 * Links back to the Report that triggered the review and records
 * the moderator, the action taken, and an appeal window.
 */

export const DECISION_TYPES = [
  "content_removed",
  "listing_suspended",
  "warning_issued",
  "account_restricted",
] as const;

export type DecisionType = (typeof DECISION_TYPES)[number];

const evidenceRefSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    redactedRef: { type: String, required: true },
  },
  { _id: false },
);

/** Default appeal window: 14 days from decision creation. */
export const APPEAL_WINDOW_DAYS = 14;

const moderationDecisionSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      required: true,
      index: true,
    },
    promptId: {
      type: String,
      required: true,
      index: true,
    },
    decisionType: {
      type: String,
      enum: DECISION_TYPES,
      required: true,
    },
    moderatorAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
    },
    evidence: {
      type: [evidenceRefSchema],
      default: [],
    },
    appealWindowClosesAt: {
      type: Date,
      required: true,
    },
    isAppealable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save: compute appealWindowClosesAt if not explicitly set.
moderationDecisionSchema.pre("save", function () {
  if (!this.appealWindowClosesAt && this.isNew) {
    const now = (this as any).createdAt ?? new Date();
    this.appealWindowClosesAt = new Date(
      now.getTime() + APPEAL_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
  }
});

moderationDecisionSchema.index({ promptId: 1, createdAt: -1 });

export const ModerationDecision =
  mongoose.models.ModerationDecision ||
  mongoose.model("ModerationDecision", moderationDecisionSchema);
