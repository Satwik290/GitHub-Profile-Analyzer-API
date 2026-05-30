import type { RowDataPacket } from "mysql2";
import type { Pool, PoolConnection, ResultSetHeader } from "mysql2/promise";
import { pool } from "../../config/database";
import type { GitHubRepository, GitHubUser } from "../../types/github";
import type { InsightRecord, ProfileRecord, RepositoryRecord } from "../../types/profile";
import {
  type InsightRow,
  mapInsight,
  mapProfile,
  mapRepository,
  type ProfileRow,
  type RepositoryRow
} from "./profile.mappers";

type DbExecutor = Pool | PoolConnection;

export class ProfileRepository {
  public async withTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  public async findByUsername(username: string, db: DbExecutor = pool): Promise<ProfileRecord | null> {
    const [rows] = await db.execute<ProfileRow[]>(
      `SELECT * FROM github_profiles WHERE username = :username LIMIT 1`,
      { username: username.toLowerCase() }
    );

    return rows[0] ? mapProfile(rows[0]) : null;
  }

  public async list(page: number, limit: number, db: DbExecutor = pool): Promise<{ items: ProfileRecord[]; total: number }> {
    const offset = (page - 1) * limit;
    const safeLimit = toSafePaginationNumber(limit);
    const safeOffset = toSafePaginationNumber(offset);
    const [rows] = await db.execute<ProfileRow[]>(
      `SELECT * FROM github_profiles ORDER BY last_analyzed_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`
    );
    const [countRows] = await db.execute<Array<{ total: number } & RowDataPacket>>(
      `SELECT COUNT(*) AS total FROM github_profiles`
    );

    return {
      items: rows.map(mapProfile),
      total: Number(countRows[0]?.total ?? 0)
    };
  }

  public async upsertProfile(
    user: GitHubUser,
    analysisStatus: ProfileRecord["analysisStatus"],
    db: DbExecutor = pool
  ): Promise<ProfileRecord> {
    await db.execute<ResultSetHeader>(
      `INSERT INTO github_profiles (
        github_id, username, display_name, avatar_url, profile_url, bio, company, blog, location, email,
        public_repos, followers, following, github_created_at, github_updated_at, last_analyzed_at, analysis_status
      ) VALUES (
        :githubId, :username, :displayName, :avatarUrl, :profileUrl, :bio, :company, :blog, :location, :email,
        :publicRepos, :followers, :following, :githubCreatedAt, :githubUpdatedAt, UTC_TIMESTAMP(), :analysisStatus
      )
      ON DUPLICATE KEY UPDATE
        display_name = VALUES(display_name),
        avatar_url = VALUES(avatar_url),
        profile_url = VALUES(profile_url),
        bio = VALUES(bio),
        company = VALUES(company),
        blog = VALUES(blog),
        location = VALUES(location),
        email = VALUES(email),
        public_repos = VALUES(public_repos),
        followers = VALUES(followers),
        following = VALUES(following),
        github_updated_at = VALUES(github_updated_at),
        last_analyzed_at = UTC_TIMESTAMP(),
        analysis_status = VALUES(analysis_status)`,
      {
        githubId: user.id,
        username: user.login.toLowerCase(),
        displayName: user.name,
        avatarUrl: user.avatar_url,
        profileUrl: user.html_url,
        bio: user.bio,
        company: user.company,
        blog: user.blog,
        location: user.location,
        email: user.email,
        publicRepos: user.public_repos,
        followers: user.followers,
        following: user.following,
        githubCreatedAt: toMysqlDateTime(user.created_at),
        githubUpdatedAt: toMysqlDateTime(user.updated_at),
        analysisStatus
      }
    );

    const saved = await this.findByUsername(user.login, db);
    if (!saved) {
      throw new Error("Profile upsert failed");
    }

    return saved;
  }

  public async replaceRepositories(
    profileId: number,
    repositories: GitHubRepository[],
    db: DbExecutor = pool
  ): Promise<void> {
    await db.execute(`DELETE FROM github_repositories WHERE profile_id = :profileId`, { profileId });

    for (const repository of repositories) {
      await db.execute<ResultSetHeader>(
        `INSERT INTO github_repositories (
          profile_id, github_repo_id, name, full_name, repo_url, description, primary_language,
          stars, forks, open_issues, watchers, size_kb, is_fork, topics, license_name,
          github_created_at, github_updated_at, pushed_at
        ) VALUES (
          :profileId, :githubRepoId, :name, :fullName, :repoUrl, :description, :primaryLanguage,
          :stars, :forks, :openIssues, :watchers, :sizeKb, :isFork, :topics, :licenseName,
          :githubCreatedAt, :githubUpdatedAt, :pushedAt
        )`,
        {
          profileId,
          githubRepoId: repository.id,
          name: repository.name,
          fullName: repository.full_name,
          repoUrl: repository.html_url,
          description: repository.description,
          primaryLanguage: repository.language,
          stars: repository.stargazers_count,
          forks: repository.forks_count,
          openIssues: repository.open_issues_count,
          watchers: repository.watchers_count,
          sizeKb: repository.size,
          isFork: repository.fork,
          topics: JSON.stringify(repository.topics ?? []),
          licenseName: repository.license?.name ?? null,
          githubCreatedAt: toMysqlDateTime(repository.created_at),
          githubUpdatedAt: toMysqlDateTime(repository.updated_at),
          pushedAt: repository.pushed_at ? toMysqlDateTime(repository.pushed_at) : null
        }
      );
    }
  }

  public async findRepositoriesByProfileId(profileId: number, db: DbExecutor = pool): Promise<RepositoryRecord[]> {
    const [rows] = await db.execute<RepositoryRow[]>(
      `SELECT * FROM github_repositories WHERE profile_id = :profileId ORDER BY stars DESC, github_updated_at DESC`,
      { profileId }
    );

    return rows.map(mapRepository);
  }

  public async upsertInsight(insight: InsightRecord, db: DbExecutor = pool): Promise<void> {
    await db.execute<ResultSetHeader>(
      `INSERT INTO profile_insights (
        profile_id, total_stars, total_forks, analyzed_repositories, original_repository_count,
        fork_repository_count, language_count, top_languages, top_repositories, recent_repositories,
        activity_score, popularity_score, language_diversity_score, profile_tags, summary
      ) VALUES (
        :profileId, :totalStars, :totalForks, :analyzedRepositories, :originalRepositoryCount,
        :forkRepositoryCount, :languageCount, :topLanguages, :topRepositories,
        :recentRepositories, :activityScore, :popularityScore, :languageDiversityScore,
        :profileTags, :summary
      )
      ON DUPLICATE KEY UPDATE
        total_stars = VALUES(total_stars),
        total_forks = VALUES(total_forks),
        analyzed_repositories = VALUES(analyzed_repositories),
        original_repository_count = VALUES(original_repository_count),
        fork_repository_count = VALUES(fork_repository_count),
        language_count = VALUES(language_count),
        top_languages = VALUES(top_languages),
        top_repositories = VALUES(top_repositories),
        recent_repositories = VALUES(recent_repositories),
        activity_score = VALUES(activity_score),
        popularity_score = VALUES(popularity_score),
        language_diversity_score = VALUES(language_diversity_score),
        profile_tags = VALUES(profile_tags),
        summary = VALUES(summary)`,
      {
        ...insight,
        topLanguages: JSON.stringify(insight.topLanguages),
        topRepositories: JSON.stringify(insight.topRepositories),
        recentRepositories: JSON.stringify(insight.recentRepositories),
        profileTags: JSON.stringify(insight.profileTags)
      }
    );
  }

  public async findInsightByProfileId(profileId: number, db: DbExecutor = pool): Promise<InsightRecord | null> {
    const [rows] = await db.execute<InsightRow[]>(
      `SELECT * FROM profile_insights WHERE profile_id = :profileId LIMIT 1`,
      { profileId }
    );

    return rows[0] ? mapInsight(rows[0]) : null;
  }
}

function toSafePaginationNumber(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error("Invalid pagination value");
  }

  return value;
}

function toMysqlDateTime(value: string): string {
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}
