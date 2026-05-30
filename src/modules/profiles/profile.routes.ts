import { Router } from "express";
import { validate } from "../../middleware/validate.middleware";
import {
  analyzeProfile,
  getProfile,
  getProfileInsights,
  getProfileRepositories,
  listProfiles
} from "./profile.controller";
import { analyzeQuerySchema, listProfilesQuerySchema, usernameParamSchema } from "./profile.schemas";

export const profileRouter = Router();

profileRouter.get("/", validate({ query: listProfilesQuerySchema }), listProfiles);
profileRouter.post(
  "/:username/analyze",
  validate({ params: usernameParamSchema, query: analyzeQuerySchema }),
  analyzeProfile
);
profileRouter.get("/:username", validate({ params: usernameParamSchema }), getProfile);
profileRouter.get("/:username/repositories", validate({ params: usernameParamSchema }), getProfileRepositories);
profileRouter.get("/:username/insights", validate({ params: usernameParamSchema }), getProfileInsights);
