import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import { z } from "zod";
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4002);

const requiredEnv = [
  "AWS_REGION",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    throw new Error(`Missing required env var: ${name}`);
  }
}

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const dbPool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
});

// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || true,
//     credentials: true,
//   })
// );
app.use(cors());
app.use(express.json());

const createPostBodySchema = z.object({
  content: z.string().trim().min(1),
});

const createCommentBodySchema = z.object({
  postId: z.coerce.number().int().positive(),
  content: z.string().trim().min(1),
});

async function resolveUserFromAccessToken(accessToken: string) {
  const cognitoUser = await cognitoClient.send(
    new GetUserCommand({ AccessToken: accessToken })
  );

  const attributes = cognitoUser.UserAttributes || [];
  const sub = attributes.find((a) => a.Name === "sub")?.Value;
  if (!sub) {
    throw new Error("Unable to resolve user id from token");
  }

  const [rows] = await dbPool.execute(
    "SELECT id, username FROM users WHERE id = ? LIMIT 1",
    [sub]
  );
  const users = rows as { id: string; username: string }[];

  if (!users.length) {
    throw new Error("User not found in local DB");
  }

  return users[0];
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  try {
    const user = await resolveUserFromAccessToken(token);
    (req as any).authUser = user;
    return next();
  } catch (error: any) {
    return res.status(401).json({
      error: "Unauthorized",
      details: error?.message,
    });
  }
}

app.post("/posts/create", requireAuth, async (req, res) => {
  const parsed = createPostBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: z.flattenError(parsed.error),
    });
  }
  const { content } = parsed.data;
  const user = (req as any).authUser as { id: string; username: string };

  try {
    const [result] = await dbPool.execute(
      `INSERT INTO posts (user_id, username, content, created_at)
       VALUES (?, ?, ?, NOW())`,
      [user.id, user.username, content.trim()]
    );

    const insertResult = result as mysql.ResultSetHeader;
    return res.status(201).json({
      id: insertResult.insertId,
      user_id: user.id,
      username: user.username,
      content: content.trim(),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to create post",
      details: error?.message,
    });
  }
});

app.post("/comments/create", requireAuth, async (req, res) => {
  const parsed = createCommentBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: z.flattenError(parsed.error),
    });
  }
  const { postId, content } = parsed.data;
  const user = (req as any).authUser as { id: string; username: string };

  try {
    const [postRows] = await dbPool.execute("SELECT id FROM posts WHERE id = ? LIMIT 1", [
      postId,
    ]);
    const posts = postRows as { id: number }[];

    if (!posts.length) {
      return res.status(404).json({ error: "Post not found" });
    }

    const [result] = await dbPool.execute(
      `INSERT INTO comments (post_id, user_id, username, content, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [postId, user.id, user.username, content.trim()]
    );
    const insertResult = result as mysql.ResultSetHeader;

    return res.status(201).json({
      id: insertResult.insertId,
      post_id: Number(postId),
      user_id: user.id,
      username: user.username,
      content: content.trim(),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to create comment",
      details: error?.message,
    });
  }
});

app.get("/posts", async (req, res) => {
  const parsedPage = Number.parseInt(String(req.query.page ?? "1"), 10);
  const parsedPageSize = Number.parseInt(String(req.query.pageSize ?? "10"), 10);

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize =
    Number.isFinite(parsedPageSize) && parsedPageSize > 0
      ? Math.min(50, parsedPageSize)
      : 10;
  const offset = (page - 1) * pageSize;

  try {
    const [countRows] = await dbPool.execute("SELECT COUNT(*) AS total FROM posts");
    const total = Number((countRows as { total: number }[])[0]?.total || 0);

    const [postRows] = await dbPool.execute(
      `SELECT id, user_id, username, content, created_at
       FROM posts
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );
    const posts = postRows as {
      id: number;
      user_id: string;
      username: string;
      content: string;
      created_at: string;
    }[];

    if (!posts.length) {
      return res.json({
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        posts: [],
      });
    }

    const postIds = posts.map((p) => p.id);
    const placeholders = postIds.map(() => "?").join(", ");
    const [commentRows] = await dbPool.execute(
      `SELECT id, post_id, user_id, username, content, created_at
       FROM comments
       WHERE post_id IN (${placeholders})
       ORDER BY created_at ASC`,
      postIds
    );
    const comments = commentRows as {
      id: number;
      post_id: number;
      user_id: string;
      username: string;
      content: string;
      created_at: string;
    }[];

    const commentsByPostId = new Map<number, typeof comments>();
    for (const comment of comments) {
      if (!commentsByPostId.has(comment.post_id)) {
        commentsByPostId.set(comment.post_id, []);
      }
      commentsByPostId.get(comment.post_id)?.push(comment);
    }

    return res.json({
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      posts: posts.map((post) => ({
        ...post,
        comments: commentsByPostId.get(post.id) || [],
      })),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to fetch posts",
      details: error?.message,
    });
  }
});

app.get("/health", async (_req, res) => {
  try {
    await dbPool.query("SELECT 1");
    return res.json({ ok: true });
  } catch (_error) {
    return res.status(500).json({ ok: false });
  }
});

app.listen(port, () => {
  console.log(`post-service listening on port ${port}`);
});
