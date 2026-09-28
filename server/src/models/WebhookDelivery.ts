import mongoose from "mongoose";

/**
 * Append-only delivery-attempt log for webhook events (issue #23,
 * "creators can... inspect delivery attempts"). One document per HTTP
 * attempt (including retries), not per logical event.
 */
const webhookDeliverySchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WebhookSubscription",
      required: true,
      index: true,
    },
    deliveryId: {
      type: String,
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
    },
    attempt: {
      type: Number,
      required: true,
    },
    success: {
      type: Boolean,
      required: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

const WebhookDelivery =
  mongoose.models.WebhookDelivery || mongoose.model("WebhookDelivery", webhookDeliverySchema);

export default WebhookDelivery;
