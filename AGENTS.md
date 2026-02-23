We are building the "Simple Threads" web-app in which users make text posts and other users can respond via comment. It will feature simple email signup/login, along with a simple vertical feed.
Tech stack:
Frontend: Next.js, TailwindCSS, ShadCN
Backend: EC2, Express.js, MySQL, Cognito

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

Backend API summary (app/backend):

POST /auth/signup
Request:

{
  "email": "user@example.com",
  "username": "rithik",
  "password": "PlainTextPassword123!"
}
Response 201:

{
  "message": "Signup successful. Please verify your email if required.",
  "userId": "cognito-sub"
}
POST /auth/login
Request:

{
  "email": "user@example.com",
  "password": "PlainTextPassword123!"
}
Response 200:

{
  "accessToken": "...",
  "refreshToken": "...",
  "idToken": "...",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "id": "cognito-sub",
    "email": "user@example.com",
    "username": "rithik"
  }
}
POST /auth/signout
Request:

{
  "accessToken": "..."
}
Response 200:

{
  "message": "Signed out successfully"
}
POST /posts/create
Headers:

Authorization: Bearer <accessToken>
Request:

{
  "content": "My first thread post"
}
Response 201:

{
  "id": 1,
  "user_id": "cognito-sub",
  "username": "rithik",
  "content": "My first thread post"
}
POST /comments/create
Headers:

Authorization: Bearer <accessToken>
Request:

{
  "postId": 1,
  "content": "Nice post!"
}
Response 201:

{
  "id": 10,
  "post_id": 1,
  "user_id": "cognito-sub",
  "username": "rithik",
  "content": "Nice post!"
}
GET /posts?page=1&pageSize=10
Request: no body
Response 200:

{
  "page": 1,
  "pageSize": 10,
  "total": 42,
  "totalPages": 5,
  "posts": [
    {
      "id": 1,
      "user_id": "cognito-sub",
      "username": "rithik",
      "content": "My first thread post",
      "created_at": "2026-02-23T20:00:00.000Z",
      "comments": [
        {
          "id": 10,
          "post_id": 1,
          "user_id": "another-sub",
          "username": "alex",
          "content": "Nice post!",
          "created_at": "2026-02-23T20:05:00.000Z"
        }
      ]
    }
  ]
}