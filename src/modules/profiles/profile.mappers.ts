import type { RowDataPacket } from "mysql2";
import type { InsightRecord, ProfileRecord, RepositoryRecord } from "../../types/profile";

export interface ProfileRow extends RowDataPacket {
  id: number;
  github_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string;
  profile_url: string;
  bio: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  public_repos: number;
  followers: number;
  following: number;
  github_created_at: Date;
  github_updated_at: Date;
  last_analyzed_at: Date;
  analysis_status: "completed" | "partial" | "failed";
  created_at: Date;
  updated_at: Date;
}

export interface RepositoryRow extends RowDataPacket {
  id: number;
  profile_id: number;
  github_repo_id: number;
  name: string;
  full_name: string;
  repo_url: string;
  description: string | null;
  primary_language: string | null;
  stars: number;
  forks: number;
  open_issues: number;
  watchers: number;
  size_kb: number;
  is_fork: number;
  topics: string | string[];
  license_name: string | null;
  github_created_at: Date;
  github_updated_at: Date;
  pushed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface InsightRow extends RowDataPacket {
  profile_id: number;
  total_stars: number;
  total_forks: number;
  analyzed_repositories: number;
  original_repository_count: number;
  fork_repository_count: number;
  language_count: number;
  top_languages: string | InsightRecord["topLanguages"];
  top_repositories: string | InsightRecord["topRepositories"];
  recent_repositories: string | InsightRecord["recentRepositories"];
  activity_score: number;
  popularity_score: number;
  language_diversity_score: number;
  profile_tags: string | string[];
  summary: string;
}

export function mapProfile(row: ProfileRow): ProfileRecord {
  return {
    id: row.id,
    githubId: row.github_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    profileUrl: row.profile_url,
    bio: row.bio,
    company: row.company,
    blog: row.blog,
    location: row.location,
    email: row.email,
    publicRepos: row.public_repos,
    followers: row.followers,
    following: row.following,
    githubCreatedAt: row.github_created_at,
    githubUpdatedAt: row.github_updated_at,
    lastAnalyzedAt: row.last_analyzed_at,
    analysisStatus: row.analysis_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapRepository(row: RepositoryRow): RepositoryRecord {
  return {
    id: row.id,
    profileId: row.profile_id,
    githubRepoId: row.github_repo_id,
    name: row.name,
    fullName: row.full_name,
    repoUrl: row.repo_url,
    description: row.description,
    primaryLanguage: row.primary_language,
    stars: row.stars,
    forks: row.forks,
    openIssues: row.open_issues,
    watchers: row.watchers,
    sizeKb: row.size_kb,
    isFork: Boolean(row.is_fork),
    topics: parseJson<string[]>(row.topics, []),
    licenseName: row.license_name,
    githubCreatedAt: row.github_created_at,
    githubUpdatedAt: row.github_updated_at,
    pushedAt: row.pushed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapInsight(row: InsightRow): InsightRecord {
  return {
    profileId: row.profile_id,
    totalStars: row.total_stars,
    totalForks: row.total_forks,
    analyzedRepositories: row.analyzed_repositories,
    originalRepositoryCount: row.original_repository_count,
    forkRepositoryCount: row.fork_repository_count,
    languageCount: row.language_count,
    topLanguages: parseJson(row.top_languages, []),
    topRepositories: parseJson(row.top_repositories, []),
    recentRepositories: parseJson(row.recent_repositories, []),
    activityScore: Number(row.activity_score),
    popularityScore: Number(row.popularity_score),
    languageDiversityScore: Number(row.language_diversity_score),
    profileTags: parseJson<string[]>(row.profile_tags, []),
    summary: row.summary
  };
}

function parseJson<T>(value: string | T, fallback: T): T {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
