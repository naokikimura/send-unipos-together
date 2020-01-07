import JSONRPC from '../jsonrpc.js';

export default class UniposAPI {
  static async refreshToken(authnToken, refreshToken) {
    return JSONRPC.call('https://unipos.me/a/jsonrpc', 'Unipos.RefreshToken', { "authn_token": authnToken, "refresh_token": refreshToken });
  }

  constructor(tokenStore = { load: async () => [], save: async (authnToken, refreshToken) => { } }) {
    this.tokenStore = tokenStore;
  }

  async call(...args) {
    const configure = authnToken => req => {
      const headers = new Headers(req.headers);
      headers.append('x-unipos-token', authnToken);
      return new Request(req, { headers: headers });
    };
    const [authnToken, refreshToken] = await this.tokenStore.load();
    try {
      return await JSONRPC.call(...args.concat(configure(authnToken)));
    } catch (error) {
      if (error.code !== -40000) throw error;
      const result = await UniposAPI.refreshToken(authnToken, refreshToken);
      await this.tokenStore.save(result.authn_token, result.refresh_token);
      return await JSONRPC.call(...args.concat(configure(result.authn_token)));
    }
  }

  findSuggestMembers(term, limit = 1000) {
    return this.call('https://unipos.me/q/jsonrpc', 'Unipos.FindSuggestMembers', { "term": term, "limit": limit });
  }

  getProfile() {
    return this.call('https://unipos.me/q/jsonrpc', 'Unipos.GetProfile', []);
  }

  sendCard(from, to, point, message) {
    return this.call('https://unipos.me/c/jsonrpc', 'Unipos.SendCard', { 'from_member_id': from, 'to_member_id': to, 'point': point, 'message': message });
  }
}