import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/httpResponse";
import type { AnalyzeQuery, ListProfilesQuery } from "./profile.schemas";
import { ProfileService } from "./profile.service";

const profileService = new ProfileService();

export const analyzeProfile = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const query = req.query as unknown as AnalyzeQuery;

  const result = await profileService.analyzeProfile(username, {
    forceRefresh: query.forceRefresh,
    maxRepositories: query.maxRepositories
  });

  sendSuccess(res, result, result.source === "github" ? 201 : 200, { source: result.source });
});

export const listProfiles = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ListProfilesQuery;
  const result = await profileService.listProfiles(query.page, query.limit);

  sendSuccess(res, result.items, 200, { pagination: result.pagination });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const result = await profileService.requireStoredProfile(username);

  sendSuccess(res, result);
});

export const getProfileRepositories = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const result = await profileService.requireStoredProfile(username);

  sendSuccess(res, result.repositories);
});

export const getProfileInsights = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params as { username: string };
  const result = await profileService.requireStoredProfile(username);

  sendSuccess(res, result.insights);
});
