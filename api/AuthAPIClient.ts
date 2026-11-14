
import {
  APIRequestContext,
  APIResponse
} from '@playwright/test';

export class AuthApiClient {
  constructor(
    private readonly request: APIRequestContext
  ) {}

  async login(
    email: string,
    password: string
  ): Promise<APIResponse> {

    return this.request.post('auth/login', {
      data: {
        email,
        password
      },
      timeout: 90000,
      maxRetries: 5
    });
  }

  async getAccessToken(
    email: string,
    password: string
  ): Promise<string> {
    const response = await this.login(email, password);

    if (!response.ok()) {
      throw new Error(
        `Authentication failed: HTTP ${response.status()}`
      );
    }

    const body = await response.json();

    const token = body.token;

    if (typeof token !== 'string' || !token) {
      throw new Error(
        'No access token found in authentication response'
      );
    }

    return token;
  }
}
