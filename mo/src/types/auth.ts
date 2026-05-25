export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type AuthSession = AuthTokens & {
  user: AuthUser;
  expires_at: number;
};
