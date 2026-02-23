We are building the "Simple Threads" web-app in which users make text posts and other users can respond via comment. It will feature simple email signup/login, along with a simple vertical feed.
Tech stack:
Frontend: Next.js, TailwindCSS, ShadCN
Backend: AWS (EC2), Express.js

Project structure:
apps/
  - backend/
  - frontend/
package.json

Note:
- You are in a sandbox with no internet access. If you need to install dependencies, ShadCN components, etc., STOP and ask me. I will install myself and say "continue."
- Do not add packages with explicit version names to package.json. Rather, tell me the package you want installed and I will run `npm i`, letting npm resolve the version.

Backend secrets:
PORT=
AWS_REGION=
COGNITO_USER_POOL_ID=
COGNITO_CLIENT_ID=
COGNITO_CLIENT_SECRET=
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
FRONTEND_URL=

Frontend secrets:
NEXT_PUBLIC_API_URL=

Architecture:
All requests → NEXT_PUBLIC_API_URL → ALB → EC2 instances.

DB Schema:
users(id: varchar PK, email: varchar unique, username: varchar unique, created_at: datetime)
posts(id: int PK, user_id: varchar, username: varchar, content: text, created_at: datetime)
comments(id: int PK, post_id: int FK->posts.id, user_id: varchar, username: varchar, content: text, created_at: datetime)