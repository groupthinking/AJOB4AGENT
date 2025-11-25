import { userStore } from '../db/user-store';

describe('Authentication', () => {
  describe('User Store', () => {
    it('should find test user by email', async () => {
      const user = await userStore.findByEmail('test@example.com');
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
      expect(user?.name).toBe('Test User');
      expect(user?.role).toBe('user');
      expect(user?.plan).toBe('PILOT');
    });

    it('should find pro user by email', async () => {
      const user = await userStore.findByEmail('pro@example.com');
      expect(user).not.toBeNull();
      expect(user?.plan).toBe('PRO');
    });

    it('should find admin user by email', async () => {
      const user = await userStore.findByEmail('admin@example.com');
      expect(user).not.toBeNull();
      expect(user?.role).toBe('admin');
      expect(user?.plan).toBe('ENTERPRISE');
    });

    it('should return null for non-existent user', async () => {
      const user = await userStore.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should verify correct password', async () => {
      const user = await userStore.verifyPassword('test@example.com', 'password123');
      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@example.com');
    });

    it('should reject incorrect password', async () => {
      const user = await userStore.verifyPassword('test@example.com', 'wrongpassword');
      expect(user).toBeNull();
    });

    it('should create new user', async () => {
      const newUser = await userStore.create({
        email: 'newuser@example.com',
        name: 'New User',
        password: 'securepassword123',
      });

      expect(newUser).not.toBeNull();
      expect(newUser.email).toBe('newuser@example.com');
      expect(newUser.name).toBe('New User');
      expect(newUser.role).toBe('user');
      expect(newUser.plan).toBe('PILOT');
      expect(newUser.application_credits).toBe(5);
    });

    it('should reject duplicate email registration', async () => {
      await expect(
        userStore.create({
          email: 'test@example.com',
          name: 'Duplicate User',
          password: 'password123',
        })
      ).rejects.toThrow('User with this email already exists');
    });

    it('should create user from OAuth', async () => {
      const oauthUser = await userStore.createFromOAuth({
        provider: 'google',
        providerId: 'google-123',
        email: 'oauth@example.com',
        name: 'OAuth User',
        image: 'https://example.com/avatar.png',
      });

      expect(oauthUser).not.toBeNull();
      expect(oauthUser.email).toBe('oauth@example.com');
      expect(oauthUser.email_verified).toBe(true);
    });

    it('should create and validate password reset token', async () => {
      const user = await userStore.findByEmail('test@example.com');
      expect(user).not.toBeNull();

      const token = await userStore.createPasswordResetToken(user!.id);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const resetToken = await userStore.findPasswordResetToken(token);
      expect(resetToken).not.toBeNull();
      expect(resetToken?.user_id).toBe(user!.id);
    });

    it('should update password', async () => {
      const user = await userStore.findByEmail('test@example.com');
      expect(user).not.toBeNull();

      // Store original password hash for comparison
      const originalHash = user!.password_hash;

      const result = await userStore.updatePassword(user!.id, 'newpassword123');
      expect(result).toBe(true);

      // Verify new password works
      const verifiedUser = await userStore.verifyPassword('test@example.com', 'newpassword123');
      expect(verifiedUser).not.toBeNull();

      // Verify old password no longer works
      const oldPasswordCheck = await userStore.verifyPassword('test@example.com', 'password123');
      expect(oldPasswordCheck).toBeNull();

      // Restore original password for other tests
      await userStore.updatePassword(user!.id, 'password123');
    });
  });

  describe('JWT Token', () => {
    it('should pass basic test', () => {
      expect(true).toBe(true);
    });
  });
});
