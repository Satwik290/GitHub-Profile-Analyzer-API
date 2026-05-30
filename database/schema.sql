CREATE DATABASE IF NOT EXISTS github_analyzer
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE github_analyzer;

CREATE TABLE IF NOT EXISTS github_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  github_id BIGINT UNSIGNED NOT NULL,
  username VARCHAR(39) NOT NULL,
  display_name VARCHAR(255) NULL,
  avatar_url TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  bio TEXT NULL,
  company VARCHAR(255) NULL,
  blog TEXT NULL,
  location VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  public_repos INT UNSIGNED NOT NULL DEFAULT 0,
  followers INT UNSIGNED NOT NULL DEFAULT 0,
  following INT UNSIGNED NOT NULL DEFAULT 0,
  github_created_at DATETIME NOT NULL,
  github_updated_at DATETIME NOT NULL,
  last_analyzed_at DATETIME NOT NULL,
  analysis_status ENUM('completed', 'partial', 'failed') NOT NULL DEFAULT 'completed',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_github_profiles_github_id (github_id),
  UNIQUE KEY uq_github_profiles_username (username),
  KEY idx_github_profiles_last_analyzed_at (last_analyzed_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS github_repositories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  profile_id BIGINT UNSIGNED NOT NULL,
  github_repo_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(512) NOT NULL,
  repo_url TEXT NOT NULL,
  description TEXT NULL,
  primary_language VARCHAR(100) NULL,
  stars INT UNSIGNED NOT NULL DEFAULT 0,
  forks INT UNSIGNED NOT NULL DEFAULT 0,
  open_issues INT UNSIGNED NOT NULL DEFAULT 0,
  watchers INT UNSIGNED NOT NULL DEFAULT 0,
  size_kb INT UNSIGNED NOT NULL DEFAULT 0,
  is_fork BOOLEAN NOT NULL DEFAULT FALSE,
  topics JSON NOT NULL,
  license_name VARCHAR(255) NULL,
  github_created_at DATETIME NOT NULL,
  github_updated_at DATETIME NOT NULL,
  pushed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_github_repositories_profile_repo (profile_id, github_repo_id),
  KEY idx_github_repositories_profile_id (profile_id),
  KEY idx_github_repositories_stars (stars),
  CONSTRAINT fk_github_repositories_profile
    FOREIGN KEY (profile_id) REFERENCES github_profiles(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS profile_insights (
  profile_id BIGINT UNSIGNED NOT NULL,
  total_stars INT UNSIGNED NOT NULL DEFAULT 0,
  total_forks INT UNSIGNED NOT NULL DEFAULT 0,
  analyzed_repositories INT UNSIGNED NOT NULL DEFAULT 0,
  original_repository_count INT UNSIGNED NOT NULL DEFAULT 0,
  fork_repository_count INT UNSIGNED NOT NULL DEFAULT 0,
  language_count INT UNSIGNED NOT NULL DEFAULT 0,
  top_languages JSON NOT NULL,
  top_repositories JSON NOT NULL,
  recent_repositories JSON NOT NULL,
  activity_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  popularity_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  language_diversity_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  profile_tags JSON NOT NULL,
  summary TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (profile_id),
  CONSTRAINT fk_profile_insights_profile
    FOREIGN KEY (profile_id) REFERENCES github_profiles(id)
    ON DELETE CASCADE
) ENGINE=InnoDB;
