const querystring = require('querystring');
const stream = require('stream');

function createRequest(url, options) {
  url = new URL(url);
  return require(url.protocol.replace(/:$/, '')).request(url, Object.assign({ agent }, options));
}

function fetch(request) {
  return new Promise((resolve, reject) => {
    request.on('response', resolve).on('error', reject).end();
  });
}

function toJSON(response) {
  return new Promise((resolve, reject) => {
    const data = [];
    response
      .on('data', chunk => { data.push(chunk); })
      .on('end', () => {
        const body = data.reduce((text, chunk) => text + chunk.toString());
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

function isSuccessful(response) {
  return response.statusCode >= 200 && response.statusCode <= 299
}

function ResponseParser(condition, parse) {
  return function parseResponse(response) {
    if (!condition(response)) throw new Error(response.statusMessage);
    return parse(response);
  };
}

async function refreshToken() {
  const url = new URL('https://accounts.google.com/o/oauth2/token');
  const request = createRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
  });
  request.write(querystring.stringify({
    grant_type: 'refresh_token',
    client_id: this._credential.installed.client_id,
    client_secret: this._credential.installed.client_secret,
    refresh_token: this._accessTokenResponse.refresh_token,
  }));
  return Object.assign(
    this._accessTokenResponse,
    await fetch(request).then(ResponseParser(isSuccessful, toJSON))
  );
}

class ChromeWebStoreAPI {
  constructor(credential, accessTokenResponse) {
    this._credential = credential;
    this._accessTokenResponse = accessTokenResponse;
  }

  get Items() {
    const that = this;
    async function fetchItem(id, projection = 'DRAFT') {
      const { access_token } = await refreshToken.call(that);
      const url = new URL(id, 'https://www.googleapis.com/chromewebstore/v1.1/items/');
      url.searchParams.set('projection', projection);
      const request = createRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'x-goog-api-version': 2,
        },
      });
      return fetch(request).then(ResponseParser(isSuccessful, toJSON));
    }
    return class Items {
      static valueOf({ id, kind, publicKey, uploadState, crxVersion }) {
        return new this(id, kind, publicKey, uploadState, crxVersion);
      }
      static async fetch(id) {
        return this.valueOf(await fetchItem(id))
      }
      constructor(id, kind, publicKey, uploadState, crxVersion) {
        this._id = id;
        this._kind = kind;
        this._publicKey = publicKey;
        this._uploadState = uploadState;
        this._crxVersion = crxVersion;
      }
      get id() { return this._id; }
      get kind() { return this._kind; }
      get publicKey() { return this._publicKey; }
      get uploadState() { return this._uploadState; }
      get crxVersion() { return this._crxVersion; }

      async upload(contents, uploadType) {
        const { access_token } = await refreshToken.call(that);
        const url = new URL(this.id, 'https://www.googleapis.com/upload/chromewebstore/v1.1/items/');
        url.searchParams.set('uploadType', uploadType || '');
        const request = createRequest(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-goog-api-version': 2,
          },
        });
        if (contents instanceof stream.Readable) {
          contents.pipe(request);
        } else {
          request.write(contents);
        }
        return fetch(request).then(ResponseParser(isSuccessful, toJSON));
      }

      async publish(publishTarget = 'default') {
        const { access_token } = await refreshToken.call(that);
        const url = new URL(`${this.id}/publish`, 'https://www.googleapis.com/chromewebstore/v1.1/items/');
        url.searchParams.set('publishTarget', publishTarget);
        const request = createRequest(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-goog-api-version': 2,
            'Content-Length': 0,
          },
        });
        return fetch(request).then(ResponseParser(isSuccessful, toJSON));
      }
    }
  }
}

module.exports = function Plugin(id, credential, accessTokenResponse) {
  const stream = require('stream');
  const api = new ChromeWebStoreAPI(
    typeof credential === 'string' ? JSON.parse(credential) : credential,
    typeof accessTokenResponse === 'string' ? JSON.parse(accessTokenResponse) : accessTokenResponse,
  );
  return {
    upload(uploadType) {
      return new stream.Transform({
        objectMode: true,
        transform(vinyl, encoding, callback) {
          api.Items.fetch(id).then(async (item) => {
            const result = await item.upload(vinyl.contents, uploadType);
            if (result.uploadState === 'FAILURE') {
              const message = (result.itemError || []).map(error => error.error_detail).join('\n');
              throw new Error(message);
            }
            this.push(vinyl);
          }).then(callback).catch(callback);
        },
      });
    },
    async publish(publishTarget) {
      const item = new api.Items(id);
      const result = await item.publish(publishTarget);
      (result.statusDetail || []).forEach(console.log);
    },
  };
}
