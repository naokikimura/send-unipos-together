import JSONRPC, { JSONRPCError } from '../jsonrpc.js';
import { UniposMember, UniposProfile } from './index';

interface TokenStore {
  load(): [string, string] | Promise<[string, string]>;
  save(authnToken: string, refreshToken: string): void | Promise<void>;
}

interface RefreshTokenResult {
  authn_token: string;
  refresh_token: string;
}

type FindSuggestMembersResult = UniposMember[];

type GetProfileResult = UniposProfile;

interface SendCardResult {
  created_at: number;
  id: string;
}

const defaultTokenStore: TokenStore = {
  load: async () => [undefined, undefined] as [string, string],
  save: async () => undefined,
};

export default class UniposAPI {
  public static async refreshToken(authnToken: string, refreshToken: string): Promise<RefreshTokenResult> {
    return JSONRPC.call<RefreshTokenResult>(
      'https://unipos.me/a/jsonrpc', 'Unipos.RefreshToken', { 'authn_token': authnToken, 'refresh_token': refreshToken });
  }

  private tokenStore: TokenStore;

  constructor(tokenStore: TokenStore = defaultTokenStore) {
    this.tokenStore = tokenStore;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async call<T>(url: string, method: string, params: any): Promise<T> {
    const configure = (token: string) => (req: Request): Request => {
      const headers = new Headers(req.headers);
      headers.append('x-unipos-token', token);
      return new Request(req, { headers });
    };
    const call = (token: string): Promise<T> => JSONRPC.call<T>(url, method, params, configure(token));
    const [authnToken, refreshToken] = await this.tokenStore.load();
    try {
      return await call(authnToken);
    } catch (error) {
      if (!(error instanceof JSONRPCError) || error.code !== -40000) throw error;
      const result = await UniposAPI.refreshToken(authnToken, refreshToken);
      await this.tokenStore.save(result.authn_token, result.refresh_token);
      return await call(result.authn_token);
    }
  }

  public findSuggestMembers(term: string, limit = 1000): Promise<FindSuggestMembersResult> {
    return this.call<FindSuggestMembersResult>(
      'https://unipos.me/q/jsonrpc', 'Unipos.FindSuggestMembers', { term, limit });
  }

  public getProfile(): Promise<GetProfileResult> {
    return this.call<GetProfileResult>('https://unipos.me/q/jsonrpc', 'Unipos.GetProfile', []);
  }

  public sendCard(from: string, to: string, point: number, message: string): Promise<SendCardResult> {
    return this.call<SendCardResult>(
      'https://unipos.me/c/jsonrpc', 'Unipos.SendCard', { 'from_member_id': from, 'to_member_id': to, point, message });
  }
}
