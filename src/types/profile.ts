export type AnalysisStatus = "completed" | "partial" | "failed";

export interface ProfileRecord {
  id: number;
  githubId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string;
  profileUrl: string;
  bio: string | null;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  githubCreatedAt: Date;
  githubUpdatedAt: Date;
  lastAnalyzedAt: Date;
  analysisStatus: AnalysisStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepositoryRecord {
  id: number;
  profileId: number;
  githubRepoId: number;
  name: string;
  fullName: string;
  repoUrl: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  sizeKb: number;
  isFork: boolean;
  topics: string[];
  licenseName: string | null;
  githubCreatedAt: Date;
  githubUpdatedAt: Date;
  pushedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsightRecord {
  profileId: number;
  totalStars: number;
  totalForks: number;
  analyzedRepositories: number;
  originalRepositoryCount: number;
  forkRepositoryCount: number;
  languageCount: number;
  topLanguages: Array<{ language: string; repositories: number; stars: number }>;
  topRepositories: Array<{ name: string; url: string; stars: number; forks: number; language: string | null }>;
  recentRepositories: Array<{ name: string; url: string; updatedAt: string; language: string | null }>;
  activityScore: number;
  popularityScore: number;
  languageDiversityScore: number;
  profileTags: string[];
  summary: string;
}
