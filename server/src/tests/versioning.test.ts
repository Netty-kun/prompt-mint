import httpMocks from "node-mocks-http";
import connectDb from "../db/connectDb";
import Prompt from "../models/Prompt";
import PromptVersion from "../models/PromptVersion";
import Purchase from "../models/Purchase";
import User from "../models/User";
import {
  PublishPromptVersion,
  ListPromptVersions,
  GetPromptVersionDetail,
} from "../controllers/versioningControllers";

jest.mock("../db/connectDb");
jest.mock("../models/Prompt");
jest.mock("../models/PromptVersion");
jest.mock("../models/Purchase");
jest.mock("../models/User");
jest.mock("../services/notificationService");

const mockConnectDb = connectDb as jest.Mock;
const mockPrompt = Prompt as jest.Mocked<any>;
const mockPromptVersion = PromptVersion as jest.Mocked<any>;
const mockPurchase = Purchase as jest.Mocked<any>;
const mockUser = User as jest.Mocked<any>;
const mockEnqueue = require("../services/notificationService").enqueuePromptUpdateNotifications as jest.Mock;

describe("Prompt versioning controllers", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockConnectDb.mockResolvedValue(true);
  });

  it("allows the creator to publish a first version", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      url: "/api/prompts/abc123/versions",
      params: { id: "abc123" },
      body: {
        walletAddress: "GCREATOR",
        encryptedPayload: "encrypted-bytes",
        encryptedPayloadRef: "s3://prompt/abc123/v1",
        changelog: "Initial encrypted prompt",
      },
    });
    const res = httpMocks.createResponse();

    mockUser.findOne.mockResolvedValue({ _id: "owner-id", walletAddress: "gcreator" });
    mockPrompt.findById.mockResolvedValue({ _id: "abc123", owner: "owner-id", title: "Launch Pack" });
    mockPromptVersion.findOne.mockResolvedValue(null);
    mockPromptVersion.create.mockResolvedValue({
      _id: "version-id",
      promptId: "abc123",
      versionIndex: 1,
      contentHash: "hashvalue",
      encryptedPayloadRef: "s3://prompt/abc123/v1",
      changelog: "Initial encrypted prompt",
      createdAt: new Date(),
    });
    mockPrompt.findByIdAndUpdate.mockResolvedValue({});

    await PublishPromptVersion(req, res);

    expect(res.statusCode).toBe(201);
    const body = res._getJSONData();
    expect(body.versionNumber).toBe(1);
    expect(body.contentHash).toBe("hashvalue");
    expect(body.encryptedPayloadRef).toBe("s3://prompt/abc123/v1");
    expect(body).not.toHaveProperty("encryptedPayload");
    expect(mockPromptVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        promptId: "abc123",
        versionIndex: 1,
        encryptedPayloadRef: "s3://prompt/abc123/v1",
      }),
    );
  });

  it("returns 403 when a non-creator attempts to publish", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      url: "/api/prompts/abc123/versions",
      params: { id: "abc123" },
      body: {
        walletAddress: "GBUYER",
        encryptedPayload: "secret",
        encryptedPayloadRef: "ref",
      },
    });
    const res = httpMocks.createResponse();

    mockUser.findOne.mockResolvedValue({ _id: "buyer-id", walletAddress: "gbuyer" });
    mockPrompt.findById.mockResolvedValue({ _id: "abc123", owner: "owner-id" });

    await PublishPromptVersion(req, res);

    expect(res.statusCode).toBe(403);
    expect(res._getJSONData().code).toBe("FORBIDDEN");
  });

  it("returns 401 when unauthenticated", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      url: "/api/prompts/abc123/versions",
      params: { id: "abc123" },
      body: {
        encryptedPayload: "secret",
        encryptedPayloadRef: "ref",
      },
    });
    const res = httpMocks.createResponse();

    await PublishPromptVersion(req, res);

    expect(res.statusCode).toBe(401);
    expect(res._getJSONData().code).toBe("UNAUTHENTICATED");
  });

  it("returns 400 on integrity failure", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      url: "/api/prompts/abc123/versions",
      params: { id: "abc123" },
      body: {
        walletAddress: "GCREATOR",
        encryptedPayload: "secret",
        encryptedPayloadRef: "ref",
        contentHash: "differenthash",
      },
    });
    const res = httpMocks.createResponse();

    mockUser.findOne.mockResolvedValue({ _id: "owner-id", walletAddress: "gcreator" });
    mockPrompt.findById.mockResolvedValue({ _id: "abc123", owner: "owner-id", title: "Launch Pack" });

    await PublishPromptVersion(req, res);

    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().code).toBe("INTEGRITY_FAILURE");
  });

  it("handles concurrent version creation conflict", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      url: "/api/prompts/abc123/versions",
      params: { id: "abc123" },
      body: {
        walletAddress: "GCREATOR",
        encryptedPayload: "secret",
        encryptedPayloadRef: "ref",
      },
    });
    const res = httpMocks.createResponse();

    mockUser.findOne.mockResolvedValue({ _id: "owner-id", walletAddress: "gcreator" });
    mockPrompt.findById.mockResolvedValue({ _id: "abc123", owner: "owner-id", title: "Launch Pack" });
    mockPromptVersion.findOne.mockResolvedValue(null);
    const err = new Error("duplicate key error");
    (err as any).code = 11000;
    mockPromptVersion.create.mockRejectedValue(err);

    await PublishPromptVersion(req, res);

    expect(res.statusCode).toBe(409);
    expect(res._getJSONData().code).toBe("CONCURRENT_VERSION_CONFLICT");
  });

  it("allows creators to list their version history", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      url: "/api/prompts/abc123/versions",
      params: { id: "abc123" },
      query: { walletAddress: "GCREATOR" },
    });
    const res = httpMocks.createResponse();

    mockUser.findOne.mockResolvedValue({ _id: "owner-id", walletAddress: "gcreator" });
    mockPrompt.findById.mockResolvedValue({ _id: "abc123", owner: "owner-id" });
    mockPurchase.findOne.mockResolvedValue(null);
    mockPromptVersion.find.mockResolvedValue([
      { versionIndex: 1, changelog: "Initial update", createdAt: new Date("2026-07-26T00:00:00.000Z"), contentHash: "hash1" },
      { versionIndex: 2, changelog: "Second update", createdAt: new Date("2026-07-26T01:00:00.000Z"), contentHash: "hash2" },
    ]);

    await ListPromptVersions(req, res);

    expect(res.statusCode).toBe(200);
    const body = res._getJSONData();
    expect(body).toHaveLength(2);
    expect(body[0].versionNumber).toBe(1);
    expect(body[0].changelog).toBe("Initial update");
    expect(body[1].versionNumber).toBe(2);
  });

  it("allows buyers with a purchase to list versions", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      url: "/api/prompts/abc123/versions",
      params: { id: "abc123" },
      query: { walletAddress: "GBUYER" },
    });
    const res = httpMocks.createResponse();

    mockUser.findOne.mockResolvedValue({ _id: "buyer-id", walletAddress: "gbuyer" });
    mockPrompt.findById.mockResolvedValue({ _id: "abc123", owner: "owner-id" });
    mockPurchase.findOne.mockResolvedValue({ promptId: "abc123", buyerWallet: "gbuyer", versionIndex: 1 });
    mockPromptVersion.find.mockResolvedValue([
      { versionIndex: 1, changelog: "Initial update", createdAt: new Date("2026-07-26T00:00:00.000Z"), contentHash: "hash1" },
    ]);

    await ListPromptVersions(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toHaveLength(1);
  });

  it("rejects non-buyers from listing versions", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      url: "/api/prompts/abc123/versions",
      params: { id: "abc123" },
      query: { walletAddress: "GNOBODY" },
    });
    const res = httpMocks.createResponse();

    mockUser.findOne.mockResolvedValue({ _id: "other-id", walletAddress: "gnobody" });
    mockPrompt.findById.mockResolvedValue({ _id: "abc123", owner: "owner-id" });
    mockPurchase.findOne.mockResolvedValue(null);

    await ListPromptVersions(req, res);

    expect(res.statusCode).toBe(403);
    expect(res._getJSONData().code).toBe("FORBIDDEN");
  });

  it("allows entitled buyers to fetch version detail", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      url: "/api/prompts/abc123/versions/1",
      params: { id: "abc123", versionIndex: "1" },
      query: { walletAddress: "GBUYER" },
    });
    const res = httpMocks.createResponse();

    mockUser.findOne.mockResolvedValue({ _id: "buyer-id", walletAddress: "gbuyer" });
    mockPrompt.findById.mockResolvedValue({ _id: "abc123", owner: "owner-id" });
    mockPurchase.findOne.mockResolvedValue({ promptId: "abc123", buyerWallet: "gbuyer", versionIndex: 1 });
    mockPromptVersion.findOne.mockResolvedValue({
      versionIndex: 1,
      encryptedPayloadRef: "s3://prompt/abc123/v1",
      contentHash: "hash1",
      changelog: "Initial update",
      createdAt: new Date("2026-07-26T00:00:00.000Z"),
    });

    await GetPromptVersionDetail(req, res);

    expect(res.statusCode).toBe(200);
    const body = res._getJSONData();
    expect(body.encryptedPayloadRef).toBe("s3://prompt/abc123/v1");
    expect(body.contentHash).toBe("hash1");
  });

  it("rejects non-entitled users from version detail", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      url: "/api/prompts/abc123/versions/2",
      params: { id: "abc123", versionIndex: "2" },
      query: { walletAddress: "GNOBODY" },
    });
    const res = httpMocks.createResponse();

    mockUser.findOne.mockResolvedValue({ _id: "other-id", walletAddress: "gnobody" });
    mockPrompt.findById.mockResolvedValue({ _id: "abc123", owner: "owner-id" });
    mockPurchase.findOne.mockResolvedValue(null);

    await GetPromptVersionDetail(req, res);

    expect(res.statusCode).toBe(403);
    expect(res._getJSONData().code).toBe("FORBIDDEN");
  });

  it("retains previous versions when publishing a new version", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      url: "/api/prompts/abc123/versions",
      params: { id: "abc123" },
      body: {
        walletAddress: "GCREATOR",
        encryptedPayload: "encrypted-bytes",
        encryptedPayloadRef: "s3://prompt/abc123/v2",
        changelog: "Second update",
      },
    });
    const res = httpMocks.createResponse();

    mockUser.findOne.mockResolvedValue({ _id: "owner-id", walletAddress: "gcreator" });
    mockPrompt.findById.mockResolvedValue({ _id: "abc123", owner: "owner-id", title: "Launch Pack" });
    mockPromptVersion.findOne.mockResolvedValue({ versionIndex: 1 });
    mockPromptVersion.create.mockResolvedValue({ versionIndex: 2 });
    mockPrompt.findByIdAndUpdate.mockResolvedValue({});

    await PublishPromptVersion(req, res);

    expect(res.statusCode).toBe(201);
    expect(mockPromptVersion.create).toHaveBeenCalledWith(
      expect.objectContaining({ versionIndex: 2 }),
    );
  });
});
