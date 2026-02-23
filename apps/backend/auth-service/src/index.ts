import crypto from "crypto";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql2/promise";
import { z } from "zod";
import {
  CognitoIdentityProviderClient,
  GetUserCommand,
  GlobalSignOutCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4001);

const requiredEnv = [
  "AWS_REGION",
  "COGNITO_USER_POOL_ID",
  "COGNITO_CLIENT_ID",
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

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);
app.use(express.json());

function buildSecretHash(username: string) {
  if (!process.env.COGNITO_CLIENT_SECRET) {
    return undefined;
  }

  return crypto
    .createHmac("sha256", process.env.COGNITO_CLIENT_SECRET)
    .update(`${username}${process.env.COGNITO_CLIENT_ID}`)
    .digest("base64");
}

function getAttr(attributes: { Name?: string; Value?: string }[] = [], key: string) {
  const attr = attributes.find((item) => item.Name === key);
  return attr?.Value;
}

const signUpBodySchema = z.object({
  email: z.string().email(),
  username: z.string().min(1),
  password: z.string().min(1),
});

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signOutBodySchema = z.object({
  accessToken: z.string().min(1),
});

app.post("/auth/signup", async (req, res) => {
  const parsed = signUpBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: z.flattenError(parsed.error),
    });
  }
  const { email, username, password } = parsed.data;

  try {
    const secretHash = buildSecretHash(email);
    const signUpResult = await cognitoClient.send(
      new SignUpCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email,
        Password: password,
        SecretHash: secretHash,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "preferred_username", Value: username },
        ],
      })
    );

    if (!signUpResult.UserSub) {
      return res.status(500).json({ error: "Cognito did not return a user id" });
    }

    await dbPool.execute(
      `INSERT INTO users (id, email, username, created_at)
       VALUES (?, ?, ?, NOW())`,
      [signUpResult.UserSub, email, username]
    );

    return res.status(201).json({
      message: "Signup successful. Please verify your email if required.",
      userId: signUpResult.UserSub,
    });
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email or username already exists" });
    }

    return res.status(400).json({
      error: error?.name || "Signup failed",
      details: error?.message,
    });
  }
});

app.post("/auth/login", async (req, res) => {
  const parsed = loginBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: z.flattenError(parsed.error),
    });
  }
  const { email, password } = parsed.data;

  try {
    const secretHash = buildSecretHash(email);
    const authResult = await cognitoClient.send(
      new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          ...(secretHash ? { SECRET_HASH: secretHash } : {}),
        },
      })
    );

    if (!authResult.AuthenticationResult?.AccessToken) {
      return res.status(401).json({ error: "Login failed" });
    }

    const userResult = await cognitoClient.send(
      new GetUserCommand({
        AccessToken: authResult.AuthenticationResult.AccessToken,
      })
    );

    const sub = getAttr(userResult.UserAttributes, "sub");
    const dbUsername = getAttr(userResult.UserAttributes, "preferred_username");
    const dbEmail = getAttr(userResult.UserAttributes, "email");

    if (!sub || !dbEmail || !dbUsername) {
      return res.status(500).json({ error: "Incomplete Cognito user attributes" });
    }

    await dbPool.execute(
      `INSERT INTO users (id, email, username, created_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         email = VALUES(email),
         username = VALUES(username)`,
      [sub, dbEmail, dbUsername]
    );

    return res.json({
      accessToken: authResult.AuthenticationResult.AccessToken,
      refreshToken: authResult.AuthenticationResult.RefreshToken,
      idToken: authResult.AuthenticationResult.IdToken,
      expiresIn: authResult.AuthenticationResult.ExpiresIn,
      tokenType: authResult.AuthenticationResult.TokenType,
      user: {
        id: sub,
        email: dbEmail,
        username: dbUsername,
      },
    });
  } catch (error: any) {
    return res.status(401).json({
      error: error?.name || "Login failed",
      details: error?.message,
    });
  }
});

app.post("/auth/signout", async (req, res) => {
  const parsed = signOutBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: z.flattenError(parsed.error),
    });
  }
  const { accessToken } = parsed.data;

  try {
    await cognitoClient.send(
      new GlobalSignOutCommand({
        AccessToken: accessToken,
      })
    );

    return res.json({ message: "Signed out successfully" });
  } catch (error: any) {
    return res.status(400).json({
      error: error?.name || "Signout failed",
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
  console.log(`auth-service listening on port ${port}`);
}); // tmp
