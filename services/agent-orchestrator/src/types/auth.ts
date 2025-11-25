export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  image?: string;
  role: 'user' | 'admin';
  plan: 'PILOT' | 'PRO' | 'ENTERPRISE';
  application_credits: number;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: 'google' | 'github';
  provider_account_id: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  created_at: Date;
  updated_at: Date;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface OAuthInput {
  provider: 'google' | 'github';
  providerId: string;
  email: string;
  name: string;
  image?: string;
}

export interface AuthResponse {
  user: Omit<User, 'password_hash'>;
  accessToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  plan: 'PILOT' | 'PRO' | 'ENTERPRISE';
  iat?: number;
  exp?: number;
}
