import { describe, it, expect } from "@jest/globals";
import express from "express";
import httpMocks from "node-mocks-http";
import {
  getRobotsTxt,
  getSEOControls,
  updateSEOControls,
  formatXRobotsHeader,
} from "../controllers/robotsController";

describe("robotsController Server Tests", () => {
  describe("getRobotsTxt", () => {
    it("returns 200 text/plain with disallowed unlock paths and sitemap", () => {
      const req = httpMocks.createRequest({
        method: "GET",
        url: "/robots.txt",
        headers: { host: "promptmint.io" },
      });
      const res = httpMocks.createResponse();

      getRobotsTxt(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getHeader("Content-Type")).toContain("text/plain");

      const body = res._getData();
      expect(body).toContain("User-agent: *");
      expect(body).toContain("Disallow: /api/prompts/*/unlock");
      expect(body).toContain("Disallow: /admin/");
      expect(body).toContain("Sitemap: https://promptmint.io/sitemap.xml");
    });
  });

  describe("getSEOControls and updateSEOControls", () => {
    it("returns default SEO controls and X-Robots-Tag header for prompt", () => {
      const req = httpMocks.createRequest({
        method: "GET",
        url: "/api/seo/controls?promptId=123",
        query: { promptId: "123" },
      });
      const res = httpMocks.createResponse();

      getSEOControls(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getHeader("X-Robots-Tag")).toBe("index, follow");

      const data = JSON.parse(res._getData());
      expect(data.promptId).toBe("123");
      expect(data.controls.index).toBe(true);
    });

    it("rejects unauthorized updates from non-creators", () => {
      const req = httpMocks.createRequest({
        method: "POST",
        url: "/api/seo/controls",
        body: {
          promptId: "123",
          index: false,
          creatorAddress: "GCREATOR111",
        },
        headers: {
          "x-user-address": "GBUYER222",
        },
      });
      const res = httpMocks.createResponse();

      updateSEOControls(req, res);

      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.error).toContain("Unauthorized");
    });

    it("allows authorized updates from prompt creator", () => {
      const req = httpMocks.createRequest({
        method: "POST",
        url: "/api/seo/controls",
        body: {
          promptId: "123",
          index: false,
          follow: true,
          noarchive: true,
          canonicalUrl: "https://custom.com/p/123",
          creatorAddress: "GCREATOR111",
        },
        headers: {
          "x-user-address": "GCREATOR111",
        },
      });
      const res = httpMocks.createResponse();

      updateSEOControls(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.getHeader("X-Robots-Tag")).toBe("noindex, follow, noarchive");

      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.controls.index).toBe(false);
      expect(data.controls.canonicalUrl).toBe("https://custom.com/p/123");
    });
  });

  describe("formatXRobotsHeader", () => {
    it("formats header string correctly", () => {
      expect(formatXRobotsHeader({ index: true, follow: true })).toBe("index, follow");
      expect(formatXRobotsHeader({ index: false, follow: false, noarchive: true })).toBe(
        "noindex, nofollow, noarchive"
      );
    });
  });
});
