import { env } from "../../config/env";
import { AppError } from "../../errors/AppError";
import { ErrorCodes } from "../../errors/errorCodes";
import type { GitHubRepository, GitHubUser } from "../../types/github";

interface GitHubErrorBody {
  message?: string;
  documentation_url?: string;
}

export class GitHubClient {
  private readonly baseUrl = env.GITHUB_API_BASE_URL.replace(/\/$/, "");

  public async getUser(username: string): Promise<GitHubUser> {
    return this.request<GitHubUser>(`/users/${encodeURIComponent(username)}`);
  }

  public async getUserRepositories(username: string, maxRepositories = 100): Promise<GitHubRepository[]> {
    const repositories: GitHubRepository[] = [];
    let page = 1;

    while (repositories.length < maxRepositories) {
      const remaining = maxRepositories - repositories.length;
      const perPage = Math.min(100, remaining);
      const pageItems = await this.request<GitHubRepository[]>(
        `/users/${encodeURIComponent(username)}/repos?per_page=${perPage}&page=${page}&sort=updated&direction=desc`
      );

      repositories.push(...pageItems);

      if (pageItems.length < perPage) {
        break;
      }

      page += 1;
    }

    return repositories;
  }

  private async request<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "github-profile-analyzer-api",
      "X-GitHub-Api-Version": "2022-11-28"
    };

    if (env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        headers,
        signal: AbortSignal.timeout(10000)
      });
    } catch (error) {
      throw new AppError({
        statusCode: 502,
        code: ErrorCodes.GITHUB_API_ERROR,
        message: "Unable to reach GitHub API",
        details: error instanceof Error ? error.message : error
      });
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    const body = await this.parseErrorBody(response);

    if (response.status === 404) {
      throw new AppError({
        statusCode: 404,
        code: ErrorCodes.GITHUB_USER_NOT_FOUND,
        message: "GitHub user not found",
        details: body
      });
    }

    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const reset = response.headers.get("x-ratelimit-reset");

      if (remaining === "0" || response.status === 429) {
        throw new AppError({
          statusCode: 429,
          code: ErrorCodes.GITHUB_RATE_LIMITED,
          message: "GitHub API rate limit exceeded",
          details: {
            resetAt: reset ? new Date(Number(reset) * 1000).toISOString() : undefined,
            githubMessage: body.message
          }
        });
      }
    }

    throw new AppError({
      statusCode: 502,
      code: ErrorCodes.GITHUB_API_ERROR,
      message: "GitHub API returned an unexpected error",
      details: {
        status: response.status,
        body
      }
    });
  }

  private async parseErrorBody(response: Response): Promise<GitHubErrorBody> {
    try {
      return (await response.json()) as GitHubErrorBody;
    } catch {
      return { message: response.statusText };
    }
  }
}
