export type ApiErrorPayload = {
  error?: string;
  details?: unknown;
};

export type AuthUser = {
  id: string;
  email: string;
  username: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn?: number;
  tokenType?: string;
  user: AuthUser;
};

export type SignUpRequest = {
  email: string;
  username: string;
  password: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type ConfirmSignUpRequest = {
  email: string;
  code: string;
};

export type ResendConfirmationCodeRequest = {
  email: string;
};

export type SignOutRequest = {
  accessToken: string;
};

export type PostRecord = {
  id: number;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
  comments: CommentRecord[];
};

export type CommentRecord = {
  id: number;
  post_id: number;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
};

export type PostsResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  posts: PostRecord[];
};

export type CreatePostRequest = {
  content: string;
};

export type CreateCommentRequest = {
  postId: number;
  content: string;
};
