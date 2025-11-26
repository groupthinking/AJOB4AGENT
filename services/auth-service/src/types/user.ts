export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'USER' | 'ADMIN' | 'PREMIUM';
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: Omit<User, 'password'>;
  accessToken?: string;
  refreshToken?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}
