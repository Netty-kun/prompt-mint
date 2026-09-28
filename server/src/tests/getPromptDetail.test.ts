import httpMocks from "node-mocks-http";
import { GetPromptDetail } from "../controllers/controllers";
import Prompt from "../models/Prompt";
import connectDb from "../db/connectDb";
import { cacheGet, cacheSet, CACHE_KEYS, PROMPT_METADATA_TTL_SECONDS } from "../services/cacheService";

jest.mock("../models/User");
jest.mock("../models/Prompt");
jest.mock("../db/connectDb");
jest.mock("../services/cacheService");

describe("GetPromptDetail", () => {
  const promptId = "prompt-1";

  beforeEach(() => {
    jest.resetAllMocks();
    (connectDb as jest.Mock).mockResolvedValue(true);
    (cacheGet as jest.Mock).mockResolvedValue(null);
    (cacheSet as jest.Mock).mockResolvedValue(undefined);
  });

  function makeReq() {
    return httpMocks.createRequest({
      method: "GET",
      url: `http://localhost/api/prompts/${promptId}`,
      params: { id: promptId },
    });
  }

  it("returns the cached prompt without hitting the database when present", async () => {
    const cachedPrompt = { _id: promptId, title: "Cached Prompt" };
    (cacheGet as jest.Mock).mockResolvedValue(JSON.stringify(cachedPrompt));

    const req = makeReq();
    const res = httpMocks.createResponse();
    await GetPromptDetail(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toEqual(cachedPrompt);
    expect(Prompt.findOne).not.toHaveBeenCalled();
    expect(cacheGet).toHaveBeenCalledWith(CACHE_KEYS.promptDetail(promptId));
  });

  it("falls back to the database on a cache miss, then populates the cache", async () => {
    const populate = jest.fn().mockResolvedValue({
      _id: promptId,
      title: "Fresh Prompt",
      listingStatus: "published",
      isActive: true,
    });
    (Prompt.findOne as jest.Mock).mockReturnValue({ populate });

    const req = makeReq();
    const res = httpMocks.createResponse();
    await GetPromptDetail(req, res);

    expect(Prompt.findOne).toHaveBeenCalledWith({
      _id: promptId,
      listingStatus: "published",
      isActive: true,
    });
    expect(populate).toHaveBeenCalledWith("owner", "username walletAddress");
    expect(res.statusCode).toBe(200);
    expect(res._getJSONData()).toMatchObject({ title: "Fresh Prompt" });
    expect(cacheSet).toHaveBeenCalledWith(
      CACHE_KEYS.promptDetail(promptId),
      expect.any(String),
      PROMPT_METADATA_TTL_SECONDS,
    );
  });

  it("returns 404 when the prompt does not exist (or isn't published/active)", async () => {
    const populate = jest.fn().mockResolvedValue(null);
    (Prompt.findOne as jest.Mock).mockReturnValue({ populate });

    const req = makeReq();
    const res = httpMocks.createResponse();
    await GetPromptDetail(req, res);

    expect(res.statusCode).toBe(404);
    expect(res._getJSONData().code).toBe("NOT_FOUND");
    expect(cacheSet).not.toHaveBeenCalled();
  });
});
