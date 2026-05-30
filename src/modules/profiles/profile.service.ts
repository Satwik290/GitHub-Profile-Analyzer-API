import { AppError } from "../../errors/AppError";
import { ErrorCodes } from "../../errors/errorCodes";
import { GitHubClient } from "../../integrations/github/github.client";
import type { GitHubRepository, GitHubUser } from "../../types/github";
import type { InsightRecord, ProfileRecord, RepositoryRecord } from "../../types/profile";
import { ProfileRepository } from "./profile.repository";

interface ProfileAnalysisResponse {
  profile: ProfileRecord;
  repositories: RepositoryRecord[];
  insights: InsightRecord;
}

interface ListProfilesResult {
  items: ProfileRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ProfileService {
  public constructor(
    private readonly githubClient = new GitHubClient(),
    private readonly profileRepository = new ProfileRepository()
  ) {}

  public async analyzeProfile(
    username: string,
    options: { forceRefresh?: boolean; maxRepositories?: number } = {}
  ): Promise<ProfileAnalysisResponse & { source: "cache" | "github" }> {
    const normalizedUsername = username.toLowerCase();

    if (!options.forceRefresh) {
      const cached = await this.getStoredProfile(normalizedUsername);
      if (cached) {
        return { ...cached, source: "cache" };
      }
    }

    const user = await this.githubClient.getUser(normalizedUsername);
    const repositories = await this.githubClient.getUserRepositories(
      normalizedUsername,
      options.maxRepositories ?? 100
    );
    const analysisStatus = repositories.length < user.public_repos ? "partial" : "completed";

    const saved = await this.profileRepository.withTransaction(async (connection) => {
      const profile = await this.profileRepository.upsertProfile(user, analysisStatus, connection);
      await this.profileRepository.replaceRepositories(profile.id, repositories, connection);
      const insights = this.buildInsights(profile, user, repositories);
      await this.profileRepository.upsertInsight(insights, connection);
      return { profile, insights };
    });

    const storedRepositories = await this.profileRepository.findRepositoriesByProfileId(saved.profile.id);

    return {
      profile: saved.profile,
      repositories: storedRepositories,
      insights: saved.insights,
      source: "github"
    };
  }

  public async listProfiles(page: number, limit: number): Promise<ListProfilesResult> {
    const result = await this.profileRepository.list(page, limit);

    return {
      items: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
  }

  public async getStoredProfile(username: string): Promise<ProfileAnalysisResponse | null> {
    const profile = await this.profileRepository.findByUsername(username);

    if (!profile) {
      return null;
    }

    const [repositories, insights] = await Promise.all([
      this.profileRepository.findRepositoriesByProfileId(profile.id),
      this.profileRepository.findInsightByProfileId(profile.id)
    ]);

    if (!insights) {
      return null;
    }

    return { profile, repositories, insights };
  }

  public async requireStoredProfile(username: string): Promise<ProfileAnalysisResponse> {
    const stored = await this.getStoredProfile(username.toLowerCase());

    if (!stored) {
      throw new AppError({
        statusCode: 404,
        code: ErrorCodes.ANALYSIS_NOT_FOUND,
        message: "Profile analysis has not been stored yet. Analyze the profile first."
      });
    }

    return stored;
  }

  private buildInsights(profile: ProfileRecord, user: GitHubUser, repositories: GitHubRepository[]): InsightRecord {
    const originalRepositories = repositories.filter((repo) => !repo.fork);
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalForks = repositories.reduce((sum, repo) => sum + repo.forks_count, 0);
    const languageStats = this.buildLanguageStats(repositories);
    const topRepositories = [...repositories]
      .sort((a, b) => b.stargazers_count - a.stargazers_count || b.forks_count - a.forks_count)
      .slice(0, 5)
      .map((repo) => ({
        name: repo.name,
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language
      }));
    const recentRepositories = [...repositories]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 5)
      .map((repo) => ({
        name: repo.name,
        url: repo.html_url,
        updatedAt: repo.updated_at,
        language: repo.language
      }));

    const activityScore = this.scoreActivity(user, repositories);
    const popularityScore = this.scorePopularity(user, totalStars, totalForks);
    const languageDiversityScore = Math.min(100, languageStats.length * 12);
    const profileTags = this.buildTags(languageStats, repositories, activityScore, popularityScore);

    return {
      profileId: profile.id,
      totalStars,
      totalForks,
      analyzedRepositories: repositories.length,
      originalRepositoryCount: originalRepositories.length,
      forkRepositoryCount: repositories.length - originalRepositories.length,
      languageCount: languageStats.length,
      topLanguages: languageStats.slice(0, 8),
      topRepositories,
      recentRepositories,
      activityScore,
      popularityScore,
      languageDiversityScore,
      profileTags,
      summary: this.buildSummary(user, repositories, languageStats, activityScore, popularityScore)
    };
  }

  private buildLanguageStats(repositories: GitHubRepository[]): InsightRecord["topLanguages"] {
    const stats = new Map<string, { repositories: number; stars: number }>();

    for (const repository of repositories) {
      if (!repository.language) {
        continue;
      }

      const current = stats.get(repository.language) ?? { repositories: 0, stars: 0 };
      current.repositories += 1;
      current.stars += repository.stargazers_count;
      stats.set(repository.language, current);
    }

    return [...stats.entries()]
      .map(([language, value]) => ({ language, ...value }))
      .sort((a, b) => b.repositories - a.repositories || b.stars - a.stars);
  }

  private scoreActivity(user: GitHubUser, repositories: GitHubRepository[]): number {
    const now = Date.now();
    const activeRepoCount = repositories.filter((repo) => {
      const updatedAt = new Date(repo.pushed_at ?? repo.updated_at).getTime();
      const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate <= 180;
    }).length;

    const repoScore = Math.min(35, user.public_repos * 1.5);
    const freshnessScore = repositories.length === 0 ? 0 : (activeRepoCount / repositories.length) * 45;
    const followerSignal = Math.min(20, user.followers / 5);

    return Math.round(repoScore + freshnessScore + followerSignal);
  }

  private scorePopularity(user: GitHubUser, totalStars: number, totalForks: number): number {
    const score = Math.log10(totalStars + 1) * 35 + Math.log10(totalForks + 1) * 25 + Math.log10(user.followers + 1) * 40;
    return Math.min(100, Math.round(score));
  }

  private buildTags(
    languageStats: InsightRecord["topLanguages"],
    repositories: GitHubRepository[],
    activityScore: number,
    popularityScore: number
  ): string[] {
    const tags = new Set<string>();
    const languages = languageStats.map((item) => item.language.toLowerCase());

    if (languageStats.length >= 4) tags.add("polyglot");
    if (activityScore >= 70) tags.add("active-maintainer");
    if (popularityScore >= 70) tags.add("open-source-visible");
    if (repositories.filter((repo) => repo.fork).length > repositories.length / 2) tags.add("fork-heavy");
    if (languages.some((language) => ["typescript", "javascript", "html", "css"].includes(language))) tags.add("web-development");
    if (languages.some((language) => ["python", "go", "java", "ruby", "php", "c#", "c++"].includes(language))) tags.add("backend-capable");

    return [...tags];
  }

  private buildSummary(
    user: GitHubUser,
    repositories: GitHubRepository[],
    languageStats: InsightRecord["topLanguages"],
    activityScore: number,
    popularityScore: number
  ): string {
    const primaryLanguage = languageStats[0]?.language ?? "unknown";
    return `${user.login} has ${user.public_repos} public repositories, ${user.followers} followers, and ${repositories.length} repositories analyzed. Primary language signal is ${primaryLanguage}. Activity score is ${activityScore}/100 and popularity score is ${popularityScore}/100.`;
  }
}
