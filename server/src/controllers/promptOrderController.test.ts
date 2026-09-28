import httpMocks from "node-mocks-http";
import { GetPromptOrder, SetPromptOrder } from "./promptOrderController";
import PromptOrder from "../models/PromptOrder";
import connectDb from "../db/connectDb";
import { AppError } from "../lib/AppError";

jest.mock("../models/PromptOrder");
jest.mock("../db/connectDb");

// asyncRoute's wrapper is fire-and-forget (it returns void, not the inner
// promise) and forwards thrown errors to `next` rather than writing to
// `res` itself (that's errorHandler's job) — so tests must flush the
// microtask queue and assert on the `next` mock for rejection paths.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("promptOrderController", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (connectDb as jest.Mock).mockResolvedValue(true);
  });

  describe("GetPromptOrder", () => {
    it("rejects requests missing walletAddress", async () => {
      const req = httpMocks.createRequest({ method: "GET", url: "/api/prompt-order" });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await GetPromptOrder(req, res, next);
      await flush();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].httpStatus).toBe(400);
    });

    it("returns an empty order when no record exists", async () => {
      (PromptOrder.findOne as jest.Mock).mockResolvedValue(null);

      const req = httpMocks.createRequest({
        method: "GET",
        url: "/api/prompt-order",
        query: { walletAddress: "GABC123" },
      });
      const res = httpMocks.createResponse();

      await GetPromptOrder(req, res, jest.fn());
      await flush();

      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ order: [] });
    });

    it("returns the saved order, lowercasing the wallet lookup", async () => {
      (PromptOrder.findOne as jest.Mock).mockResolvedValue({ order: ["3", "1", "2"] });

      const req = httpMocks.createRequest({
        method: "GET",
        url: "/api/prompt-order",
        query: { walletAddress: "GABC123" },
      });
      const res = httpMocks.createResponse();

      await GetPromptOrder(req, res, jest.fn());
      await flush();

      expect(PromptOrder.findOne).toHaveBeenCalledWith({ walletAddress: "gabc123" });
      expect(res._getJSONData()).toEqual({ order: ["3", "1", "2"] });
    });
  });

  describe("SetPromptOrder", () => {
    it("rejects a missing walletAddress", async () => {
      const req = httpMocks.createRequest({
        method: "PUT",
        url: "/api/prompt-order",
        body: { order: ["1", "2"] },
      });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await SetPromptOrder(req, res, next);
      await flush();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].httpStatus).toBe(400);
    });

    it("rejects a non-array order", async () => {
      const req = httpMocks.createRequest({
        method: "PUT",
        url: "/api/prompt-order",
        body: { walletAddress: "GABC123", order: "not-an-array" },
      });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await SetPromptOrder(req, res, next);
      await flush();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].httpStatus).toBe(400);
    });

    it("rejects an order containing non-string entries", async () => {
      const req = httpMocks.createRequest({
        method: "PUT",
        url: "/api/prompt-order",
        body: { walletAddress: "GABC123", order: ["1", 2, "3"] },
      });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await SetPromptOrder(req, res, next);
      await flush();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].httpStatus).toBe(400);
    });

    it("rejects an order exceeding the maximum length", async () => {
      const req = httpMocks.createRequest({
        method: "PUT",
        url: "/api/prompt-order",
        body: { walletAddress: "GABC123", order: new Array(1001).fill("x") },
      });
      const res = httpMocks.createResponse();
      const next = jest.fn();

      await SetPromptOrder(req, res, next);
      await flush();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].httpStatus).toBe(400);
    });

    it("upserts the order, lowercasing the wallet address", async () => {
      (PromptOrder.findOneAndUpdate as jest.Mock).mockResolvedValue({ order: ["2", "1"] });

      const req = httpMocks.createRequest({
        method: "PUT",
        url: "/api/prompt-order",
        body: { walletAddress: "GABC123", order: ["2", "1"] },
      });
      const res = httpMocks.createResponse();

      await SetPromptOrder(req, res, jest.fn());
      await flush();

      expect(PromptOrder.findOneAndUpdate).toHaveBeenCalledWith(
        { walletAddress: "gabc123" },
        { $set: { order: ["2", "1"] } },
        { new: true, upsert: true },
      );
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ order: ["2", "1"] });
    });
  });
});
