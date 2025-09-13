import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
  authUrl: string;
  tokenUrl: string;
}

interface OAuthState {
  platform: string;
  userId?: string;
  timestamp: number;
  nonce: string;
}

export class OAuthManager {
  private router: Router;
  private states: Map<string, OAuthState> = new Map();
  
  private configs: { [platform: string]: OAuthConfig } = {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:8080/auth/github/callback',
      scope: 'read:user',
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token'
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/auth/google/callback',
      scope: 'openid profile email',
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token'
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:8080/auth/linkedin/callback',
      scope: 'r_liteprofile r_emailaddress',
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken'
    }
  };

  constructor() {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Start OAuth flow
    this.router.get('/auth/:platform', this.startOAuthFlow.bind(this));
    
    // OAuth callback handlers
    this.router.get('/auth/:platform/callback', this.handleOAuthCallback.bind(this));
    
    // Get user's connected accounts
    this.router.get('/auth/accounts', this.getUserAccounts.bind(this));
    
    // Disconnect account
    this.router.delete('/auth/:platform/disconnect', this.disconnectAccount.bind(this));
  }

  private async startOAuthFlow(req: Request, res: Response): Promise<void> {
    try {
      const platform = req.params.platform;
      const config = this.configs[platform];
      
      if (!config) {
        res.status(400).json({ error: `Platform ${platform} not supported` });
        return;
      }

      if (!config.clientId || !config.clientSecret) {
        res.status(500).json({ 
          error: `OAuth not configured for ${platform}. Please set environment variables.`,
          required_env: [`${platform.toUpperCase()}_CLIENT_ID`, `${platform.toUpperCase()}_CLIENT_SECRET`]
        });
        return;
      }

      // Generate state for security
      const state = this.generateState(platform, req.query.userId as string);
      
      // Build authorization URL
      const authUrl = new URL(config.authUrl);
      authUrl.searchParams.append('client_id', config.clientId);
      authUrl.searchParams.append('redirect_uri', config.redirectUri);
      authUrl.searchParams.append('scope', config.scope);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('response_type', 'code');
      
      // Platform-specific parameters
      if (platform === 'google') {
        authUrl.searchParams.append('access_type', 'offline');
        authUrl.searchParams.append('prompt', 'consent');
      }

      console.log(`🔐 Starting OAuth flow for ${platform}: ${authUrl.toString()}`);
      
      res.json({
        success: true,
        platform,
        authUrl: authUrl.toString(),
        state,
        message: `Visit the URL to authorize ${platform} access`
      });

    } catch (error) {
      console.error(`❌ OAuth start failed for ${req.params.platform}:`, error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async handleOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const platform = req.params.platform;
      const { code, state, error } = req.query;

      if (error) {
        res.status(400).json({ 
          success: false, 
          error: `OAuth error: ${error}`,
          description: req.query.error_description 
        });
        return;
      }

      if (!code || !state) {
        res.status(400).json({ 
          success: false, 
          error: 'Missing authorization code or state' 
        });
        return;
      }

      // Verify state
      const stateData = this.verifyState(state as string);
      if (!stateData || stateData.platform !== platform) {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid state parameter' 
        });
        return;
      }

      // Exchange code for access token
      const tokenData = await this.exchangeCodeForToken(platform, code as string);
      
      // Get user profile
      const userProfile = await this.getUserProfile(platform, tokenData.access_token);
      
      // Store the connection (in production, save to database)
      const accountInfo = {
        platform,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        profile: userProfile,
        connectedAt: new Date().toISOString()
      };

      console.log(`✅ ${platform} OAuth successful for user: ${userProfile.name || userProfile.login}`);

      res.json({
        success: true,
        platform,
        message: `Successfully connected ${platform} account`,
        profile: {
          id: userProfile.id,
          name: userProfile.name || userProfile.login,
          email: userProfile.email,
          avatar: userProfile.avatar_url
        }
      });

    } catch (error) {
      console.error(`❌ OAuth callback failed for ${req.params.platform}:`, error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async exchangeCodeForToken(platform: string, code: string): Promise<any> {
    const config = this.configs[platform];
    
    const tokenParams = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code'
    };

    const response = await axios.post(config.tokenUrl, tokenParams, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data;
  }

  private async getUserProfile(platform: string, accessToken: string): Promise<any> {
    const profileUrls = {
      github: 'https://api.github.com/user',
      google: 'https://www.googleapis.com/oauth2/v2/userinfo',
      linkedin: 'https://api.linkedin.com/v2/people/~'
    };

    const profileUrl = profileUrls[platform as keyof typeof profileUrls];
    if (!profileUrl) {
      throw new Error(`Profile URL not configured for ${platform}`);
    }

    const response = await axios.get(profileUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    return response.data;
  }

  private generateState(platform: string, userId?: string): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const stateData: OAuthState = {
      platform,
      userId,
      timestamp: Date.now(),
      nonce
    };

    const stateString = Buffer.from(JSON.stringify(stateData)).toString('base64');
    this.states.set(stateString, stateData);
    
    // Clean up old states (older than 10 minutes)
    this.cleanupOldStates();
    
    return stateString;
  }

  private verifyState(state: string): OAuthState | null {
    try {
      const stateData = this.states.get(state);
      if (!stateData) return null;
      
      // Check if state is too old (10 minutes)
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        this.states.delete(state);
        return null;
      }
      
      this.states.delete(state); // Use once
      return stateData;
    } catch {
      return null;
    }
  }

  private cleanupOldStates(): void {
    const now = Date.now();
    for (const [state, data] of this.states.entries()) {
      if (now - data.timestamp > 10 * 60 * 1000) {
        this.states.delete(state);
      }
    }
  }

  private async getUserAccounts(req: Request, res: Response): Promise<void> {
    // In production, fetch from database
    res.json({
      success: true,
      accounts: [
        // Mock data - replace with real user accounts
        {
          platform: 'github',
          connected: false,
          profile: null
        },
        {
          platform: 'google', 
          connected: false,
          profile: null
        },
        {
          platform: 'linkedin',
          connected: false,
          profile: null
        }
      ]
    });
  }

  private async disconnectAccount(req: Request, res: Response): Promise<void> {
    const platform = req.params.platform;
    
    // In production, remove from database and revoke tokens
    console.log(`🔌 Disconnecting ${platform} account`);
    
    res.json({
      success: true,
      message: `Disconnected ${platform} account`
    });
  }

  getRouter(): Router {
    return this.router;
  }

  // Method to check if a platform is configured
  isPlatformConfigured(platform: string): boolean {
    const config = this.configs[platform];
    return !!(config && config.clientId && config.clientSecret);
  }

  // Get configured platforms
  getConfiguredPlatforms(): string[] {
    return Object.keys(this.configs).filter(platform => 
      this.isPlatformConfigured(platform)
    );
  }
}