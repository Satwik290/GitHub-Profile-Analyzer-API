# GitHub Profile Analyzer API

Backend service that analyzes a public GitHub profile, stores useful insights in MySQL, and exposes retrieval APIs for stored analyses.

## Tech Stack

- Node.js + Express.js
- TypeScript
- MySQL
- GitHub public REST API

## Features

- Analyze a GitHub username and persist the result.
- Store profile facts, repositories, and derived insights.
- Fetch all stored analyzed profiles.
- Fetch a single stored profile analysis.
- Fetch repositories or insights separately.
- Optional `GITHUB_TOKEN` support for higher GitHub API limits.
- Centralized validation, request IDs, rate limiting, and JSON error handling.

## API Endpoints

Base URL defaults to `http://localhost:3000/api/v1`.

```http
GET  /health
POST /api/v1/profiles/:username/analyze?forceRefresh=false&maxRepositories=100
GET  /api/v1/profiles?page=1&limit=20
GET  /api/v1/profiles/:username
GET  /api/v1/profiles/:username/repositories
GET  /api/v1/profiles/:username/insights
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create the database:

```bash
mysql -u root -p < database/schema.sql
```

3. Configure environment:

```bash
cp .env.example .env
```

Update MySQL credentials in `.env`. Add `GITHUB_TOKEN` if available.

For TiDB Cloud, use `DATABASE_URL` in `.env`; it takes precedence over the individual `MYSQL_*` fields:

```env
DATABASE_URL=mysql://2vfGSezohd4Q5rd.root:<PASSWORD>@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/github_analyzer
MYSQL_SSL=true
DB_AUTO_MIGRATE=true
```

Replace `<PASSWORD>` with your TiDB Cloud password. Do not commit the real password.

Your provided connection string ends with `/sys`. That is a system database name, so use an application database such as `github_analyzer` in the URL path. With `DB_AUTO_MIGRATE=true`, the app creates the configured database and missing tables at startup.

4. Run in development:

```bash
npm run dev
```

If startup fails with `ECONNREFUSED`, MySQL is not reachable at your configured `MYSQL_HOST` and `MYSQL_PORT`. Start MySQL, confirm credentials in `.env`, and prefer `MYSQL_HOST=127.0.0.1` on Windows if `localhost` causes connection issues.

5. Build and run production output:

```bash
npm run build
npm start
```

## Example Requests

Analyze a user:

```bash
curl -X POST "http://localhost:3000/api/v1/profiles/octocat/analyze?forceRefresh=true"
```

List stored profiles:

```bash
curl "http://localhost:3000/api/v1/profiles"
```

Fetch one stored profile:

```bash
curl "http://localhost:3000/api/v1/profiles/octocat"
```

## Response Shape

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {
    "source": "github"
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "GITHUB_USER_NOT_FOUND",
    "message": "GitHub user not found",
    "requestId": "..."
  }
}
```

## Database Schema

The schema/export is available at `database/schema.sql`.

TiDB Cloud setup notes are available at `docs/TIDB_CLOUD_SETUP.md`.

## Notes For Submission

- GitHub repository link: create a git repo from this folder and push it.
- Live deployed API URL: deploy with the same environment variables and run `database/schema.sql` on the target MySQL instance.
- Postman collection: included at `postman/GitHub_Profile_Analyzer.postman_collection.json`.
