import httpMocks from "node-mocks-http";
import { Keypair } from "@stellar/stellar-sdk";
import {
  GenerateDeletionChallenge,
  RequestAccountDeletion,
} from "./exportController";
import User from "../models/User";
import WebhookSubscription from "../models/WebhookSubscription";
import Notification from "../models/Notification";
import connectDb from "../db/connectDb";
import { AppError } from "../lib/AppError";

jest.mock("../models/User");
jest.mock("../models/WebhookSubscription");
jest.mock("../models/Notification");
jest.mock("../db/connectDb");

const flush = () => new Promise((resolve) => setImmediate(resolve));

// asyncRoute forwards thrown errors to `next` rather than writing to `res`.
describe("exportController - account deletion (#91)", () => {
  const originalSecret = process.env.CHALLENGE_TOKEN_SECRET;

  beforeEach(() => {
    jest.resetAllMocks();
    (connectDb as jest.Mock).mockResolvedValue(true);
    process.env.CHALLENGE_TOKEN_SECRET = "test-secret";
  });

  afterAll(() => {
    process.env.CHALLENGE_TOKEN_SECRET = originalSecret;
  });

  describe("GenerateDeletionChallenge", () => {
    it("rejects requests missing an address", () => {
      const req = httpMocks.createRequest({ method: "POST", url: "/api/users/delete/challenge", body: {} });
      const res = httpMocks.createResponse();

      GenerateDeletionChallenge(req, res);

      expect(res.statusCode).toBe(400);
      expect(res._getJSONData()).toMatchObject({ code: "MISSING_FIELDS" });
    });

    it("issues a challenge token and message for a valid address", () => {
      const keypair = Keypair.random();
      const req = httpMocks.createRequest({
        method: "POST",
        url: "/api/users/delete/challenge",
        body: { address: keypair.publicKey() },
      });
      const res = httpMocks.createResponse();

      GenerateDeletionChallenge(req, res);

      expect(res.statusCode).toBe(200);
      const body = res._getJSONData();
      expect(body.token).toEqual(expect.any(String));
      expect(body.challenge).toContain(keypair.publicKey());
    });
  });

  describe("RequestAccountDeletion", () => {
    function issueChallenge(address: string) {
      const req = httpMocks.createRequest({
        method: "POST",
        url: "/api/users/delete/challenge",
        body: { address },
      });
      const res = httpMocks.createResponse();
      GenerateDeletionChallenge(req, res);
      return res._getJSONData();
    }

    it("rejects requests missing signature or token", async () => {
      const req = httpMocks.createRequest({
        method: "POST",
        url: "/api/users/delete",
        body: { address: "GABC" },
      });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await RequestAccountDeletion(req, res, next);
      await flush();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].httpStatus).toBe(400);
    });

    it("rejects an invalid signature", async () => {
      const keypair = Keypair.random();
      const address = keypair.publicKey();
      const { token } = issueChallenge(address);

      const req = httpMocks.createRequest({
        method: "POST",
        url: "/api/users/delete",
        body: { address, token, signature: Buffer.from("not-a-real-signature").toString("base64") },
      });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await RequestAccountDeletion(req, res, next);
      await flush();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].httpStatus).toBe(401);
      expect(User.deleteOne).not.toHaveBeenCalled();
    });

    it("deletes off-chain profile data for a validly-signed request and reports retained collections", async () => {
      const keypair = Keypair.random();
      const address = keypair.publicKey();
      const { token, challenge } = issueChallenge(address);
      const signature = keypair.sign(Buffer.from(challenge, "utf8")).toString("base64");

      (User.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });
      (WebhookSubscription.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 2 });
      (Notification.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 5 });

      const req = httpMocks.createRequest({
        method: "POST",
        url: "/api/users/delete",
        body: { address, token, signature },
      });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await RequestAccountDeletion(req, res, next);
      await flush();

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      const body = res._getJSONData();
      expect(body.success).toBe(true);
      expect(body.deleted).toEqual({ profile: true, webhookSubscriptions: 2, notifications: 5 });
      expect(body.retained.collections).toEqual(
        expect.arrayContaining(["purchases", "marketplaceTransactions", "votes", "reports"])
      );

      expect(User.deleteOne).toHaveBeenCalledWith({ walletAddress: address.toLowerCase() });
    });

    it("rejects a token that was minted for a different wallet address", async () => {
      const keypair = Keypair.random();
      const otherKeypair = Keypair.random();
      const { token, challenge } = issueChallenge(keypair.publicKey());
      const signature = keypair.sign(Buffer.from(challenge, "utf8")).toString("base64");

      const req = httpMocks.createRequest({
        method: "POST",
        url: "/api/users/delete",
        body: { address: otherKeypair.publicKey(), token, signature },
      });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await RequestAccountDeletion(req, res, next);
      await flush();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].httpStatus).toBe(403);
    });
  });
});
