import { getApiBaseUrl } from "@/lib/env";
import type {
  ConfirmSignUpRequest,
  CreateCommentRequest,
  CreatePostRequest,
  LoginRequest,
  LoginResponse,
  PostsResponse,
  ResendConfirmationCodeRequest,
  SignOutRequest,
  SignUpRequest,
} from "@/types/api";

export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  accessToken?: string;
};

function parseMaybeJson(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const rawText = await response.text();
  const data = parseMaybeJson(rawText);

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as Record<string, unknown>).error === "string"
        ? ((data as Record<string, unknown>).error as string)
        : `Request failed with status ${response.status}`;

    throw new ApiError(response.status, message);
  }

  return data as T;
}

export async function signUp(payload: SignUpRequest) {
  return request<{ message: string; userId: string }>("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export async function login(payload: LoginRequest) {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export async function confirmSignUp(payload: ConfirmSignUpRequest) {
  return request<{ message: string }>("/auth/confirm-signup", {
    method: "POST",
    body: payload,
  });
}

export async function resendConfirmationCode(payload: ResendConfirmationCodeRequest) {
  return request<{ message: string }>("/auth/resend-confirmation-code", {
    method: "POST",
    body: payload,
  });
}

export async function signOut(payload: SignOutRequest) {
  return request<{ message: string }>("/auth/signout", {
    method: "POST",
    body: payload,
  });
}

export async function getPosts(page: number, pageSize = 10) {
  return request<PostsResponse>(`/posts?page=${page}&pageSize=${pageSize}`);
}

export async function createPost(payload: CreatePostRequest, accessToken: string) {
  return request<{ id: number; user_id: string; username: string; content: string }>("/posts/create", {
    method: "POST",
    body: payload,
    accessToken,
  });
}

export async function createComment(payload: CreateCommentRequest, accessToken: string) {
  return request<{ id: number; post_id: number; user_id: string; username: string; content: string }>(
    "/comments/create",
    {
      method: "POST",
      body: payload,
      accessToken,
    }
  );
}
