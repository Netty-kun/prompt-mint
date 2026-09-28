import express from "express";
import {
  GetActiveTerms,
  GetTermsByVersion,
  CreateLicenseTerm,
  GetListingTerms,
} from "../controllers/licenseTermsController";

export const licenseTermsRouter = express.Router();

licenseTermsRouter.get("/active", GetActiveTerms);
licenseTermsRouter.get("/version/:version", GetTermsByVersion);
licenseTermsRouter.get("/listing/:promptId", GetListingTerms);
licenseTermsRouter.post("/create", CreateLicenseTerm);
