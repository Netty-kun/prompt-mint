import httpMocks from "node-mocks-http";
import { GetPromptReports } from "../controllers/controllers";
import Report from "../models/Report";
import connectDb from "../db/connectDb";

jest.mock("../models/User");
jest.mock("../models/Prompt");
jest.mock("../models/Report");
jest.mock("../db/connectDb");
jest.mock("../services/cacheService");

describe("GetPromptReports admin authentication", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv, ADMIN_API_TOKEN: "the-real-admin-token" };
    (connectDb as jest.Mock).mockResolvedValue(true);
    (Report.find as jest.Mock).mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("rejects requests with no Authorization header", async () => {
    const req = httpMocks.createRequest({ method: "GET", url: "http://localhost/api/user/reports" });
    const res = httpMocks.createResponse();

    await GetPromptReports(req, res);

    expect(res.statusCode).toBe(401);
    expect(res._getJSONData().message).toContain("admin token");
  });

  it("rejects requests bearing an arbitrary truthy token (regression: previously any token was accepted)", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      url: "http://localhost/api/user/reports",
      headers: { authorization: "Bearer literally-anything" },
    });
    const res = httpMocks.createResponse();

    await GetPromptReports(req, res);

    expect(res.statusCode).toBe(401);
  });

  it("rejects requests when ADMIN_API_TOKEN is not configured, even with a well-formed header", async () => {
    delete process.env.ADMIN_API_TOKEN;
    const req = httpMocks.createRequest({
      method: "GET",
      url: "http://localhost/api/user/reports",
      headers: { authorization: "Bearer the-real-admin-token" },
    });
    const res = httpMocks.createResponse();

    await GetPromptReports(req, res);

    expect(res.statusCode).toBe(401);
  });

  it("accepts requests bearing the correct admin token", async () => {
    const req = httpMocks.createRequest({
      method: "GET",
      url: "http://localhost/api/user/reports",
      headers: { authorization: "Bearer the-real-admin-token" },
    });
    const res = httpMocks.createResponse();

    await GetPromptReports(req, res);

    expect(res.statusCode).toBe(200);
  });
});
