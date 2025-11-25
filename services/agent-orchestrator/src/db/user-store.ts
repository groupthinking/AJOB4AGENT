import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { User, OAuthAccount, PasswordResetToken, CreateUserInput, OAuthInput } from '../types/auth';

// In-memory store for development/testing
// Replace with actual database implementation (PostgreSQL/SQLite/MongoDB) for production
class UserStore {
  private users: Map<string, User> = new Map();
  private oauthAccounts: Map<string, OAuthAccount> = new Map();
  private passwordResetTokens: Map<string, PasswordResetToken> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void>;

  constructor() {
    // Initialize with sample test users
    this.initPromise = this.initializeTestUsers();
  }

  private async initializeTestUsers() {
    if (this.initialized) return;
    
    // Password: 'password123'
    const passwordHash = await bcrypt.hash('password123', 10);

    const testUsers: User[] = [
      {
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User',
        password_hash: passwordHash,
        role: 'user',
        plan: 'PILOT',
        application_credits: 5,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'test-user-2',
        email: 'pro@example.com',
        name: 'Pro User',
        password_hash: passwordHash,
        role: 'user',
        plan: 'PRO',
        application_credits: 100,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'test-admin-1',
        email: 'admin@example.com',
        name: 'Admin User',
        password_hash: passwordHash,
        role: 'admin',
        plan: 'ENTERPRISE',
        application_credits: 999,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    for (const user of testUsers) {
      this.users.set(user.id, user);
    }
    this.initialized = true;
  }

  // Ensure initialization is complete before operations
  private async ensureInitialized(): Promise<void> {
    await this.initPromise;
  }

  async findById(id: string): Promise<User | null> {
    await this.ensureInitialized();
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    await this.ensureInitialized();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async findByOAuth(provider: string, providerId: string): Promise<User | null> {
    await this.ensureInitialized();
    for (const account of this.oauthAccounts.values()) {
      if (account.provider === provider && account.provider_account_id === providerId) {
        return this.findById(account.user_id);
      }
    }
    return null;
  }

  async create(input: CreateUserInput): Promise<User> {
    await this.ensureInitialized();
    const existingUser = await this.findByEmail(input.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user: User = {
      id: crypto.randomUUID(),
      email: input.email.toLowerCase(),
      name: input.name,
      password_hash: passwordHash,
      role: 'user',
      plan: 'PILOT',
      application_credits: 5,
      email_verified: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.users.set(user.id, user);
    return user;
  }

  async createFromOAuth(input: OAuthInput): Promise<User> {
    await this.ensureInitialized();
    // Check if user exists with this OAuth
    const existingOAuthUser = await this.findByOAuth(input.provider, input.providerId);
    if (existingOAuthUser) {
      return existingOAuthUser;
    }

    // Check if user exists with this email
    let user = await this.findByEmail(input.email);
    
    if (!user) {
      // Create new user
      user = {
        id: crypto.randomUUID(),
        email: input.email.toLowerCase(),
        name: input.name,
        password_hash: '', // No password for OAuth users
        image: input.image,
        role: 'user',
        plan: 'PILOT',
        application_credits: 5,
        email_verified: true, // OAuth emails are verified
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.users.set(user.id, user);
    }

    // Link OAuth account
    const oauthAccount: OAuthAccount = {
      id: crypto.randomUUID(),
      user_id: user.id,
      provider: input.provider,
      provider_account_id: input.providerId,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.oauthAccounts.set(oauthAccount.id, oauthAccount);

    return user;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user || !user.password_hash) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    return isValid ? user : null;
  }

  async updatePassword(userId: string, newPassword: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) {
      return false;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.password_hash = passwordHash;
    user.updated_at = new Date();
    this.users.set(user.id, user);
    return true;
  }

  async createPasswordResetToken(userId: string): Promise<string> {
    // Remove any existing tokens for this user
    for (const [key, token] of this.passwordResetTokens.entries()) {
      if (token.user_id === userId) {
        this.passwordResetTokens.delete(key);
      }
    }

    const tokenValue = crypto.randomBytes(32).toString('hex');
    const resetToken: PasswordResetToken = {
      id: crypto.randomUUID(),
      user_id: userId,
      token: tokenValue,
      expires_at: new Date(Date.now() + 3600000), // 1 hour
      created_at: new Date(),
    };

    this.passwordResetTokens.set(resetToken.id, resetToken);
    return tokenValue;
  }

  async findPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    for (const resetToken of this.passwordResetTokens.values()) {
      if (resetToken.token === token) {
        // Check if expired
        if (new Date() > resetToken.expires_at) {
          this.passwordResetTokens.delete(resetToken.id);
          return null;
        }
        return resetToken;
      }
    }
    return null;
  }

  async deletePasswordResetToken(id: string): Promise<void> {
    this.passwordResetTokens.delete(id);
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) {
      return null;
    }

    const updatedUser = {
      ...user,
      ...updates,
      updated_at: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async decrementCredits(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user || user.application_credits <= 0) {
      return false;
    }

    user.application_credits -= 1;
    user.updated_at = new Date();
    this.users.set(user.id, user);
    return true;
  }
}

// Export singleton instance
export const userStore = new UserStore();
