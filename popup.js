window.addEventListener('DOMContentLoaded', (event) => {
  const executeScript = (...args) => new Promise((resolve, reject) => {
    chrome.tabs.executeScript(...args.concat(resolve));
  });

  class JSONRPC {
    static async call(url, method, params, configure = (request) => request) {
      const request = new Request(url, {
        "headers": {
          "accept": "application/json",
          "content-type": "application/json",
        },
        "body": JSON.stringify({
          "jsonrpc": "2.0",
          "method": method,
          "params": params,
          "id": String(new Date().getTime() * 1000 + Math.floor(Math.random() * 1000))
        }),
        "method": "POST"
      });
      const res = await fetch(configure(request));
      const body = await res.json();
      if (body.error)
        throw new class JSONRPCError extends Error {
          constructor(error) {
            super(error.message);
            this.code = error.code;
            this.data = error.data;
          }
        }(body.error);
      return body.result;
    }
  }

  class UniposAPI {
    static async refreshToken(authnToken, refreshToken) {
      const result = await JSONRPC.call('https://unipos.me/a/jsonrpc', 'Unipos.RefreshToken', { "authn_token": authnToken, "refresh_token": refreshToken });
      return [result.authn_token, result.refresh_token];
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

  class Recipients {
    constructor(text) {
      this.text = text;
    }

    static createRecipientElement(member) {
      const recipient = document.createElement('span');
      recipient.classList.add('recipient');
      recipient.classList.add(member.id ? 'exist' : 'not_exist')
      const span = document.createElement('span');
      span.classList.add('member');
      const img = document.createElement('img');
      img.src = member.picture_url || chrome.i18n.getMessage('m2');
      img.alt = member.display_name;
      span.appendChild(img);
      const name = member.display_name + (member.uname ? `(@${member.uname})` : '')
      span.appendChild(document.createTextNode(name));
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'to'
      input.value = member.id || '';
      input.title = name;
      span.appendChild(input);
      recipient.appendChild(span);
      const button = document.createElement('button');
      button.textContent = '×';
      button.addEventListener('click', event => {
        recipient.parentNode.removeChild(recipient);
      });
      recipient.appendChild(button);
      return recipient;
    }

    insertBefore(target) {
      const parent = target.parentNode;
      return Promise.all(
        this.text.split(/[\r\n]/).filter(term => term !== '').map(async term => {
          const result = await api.findSuggestMembers(term);
          const member = result.length === 1 ? result[0] : { display_name: term };
          parent.insertBefore(Recipients.createRecipientElement(member), target);
        })
      );
    }
  }

  const api = new UniposAPI({
    load: () => executeScript({
      code: "[window.localStorage.getItem('authnToken'), window.localStorage.getItem('refreshToken')]"
    }).then(results => results[0]),

    save: (authnToken, refreshToken) => executeScript({
      code: `window.localStorage.setItem('authnToken', '${authnToken}'); window.localStorage.setItem('refreshToken', '${refreshToken}');`
    })
  });

  document.getElementById('card').addEventListener('reset', (event) => {
    const progress = document.getElementById('progress');
    progress.value = 0;

    const statusText = document.getElementById('status_text');
    statusText.textContent = '';

    const parent = document.getElementById('recipients');
    for (child of parent.querySelectorAll('.recipient'))
      parent.removeChild(child);

    for (const node of event.target.querySelectorAll('input,select,textarea,button')) {
      node.disabled = false;
    }
  });

  document.getElementById('card').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    for (const node of form.querySelectorAll('input,select,textarea,button')) {
      node.disabled = true;
    }
    const progress = document.getElementById('progress');
    const statusText = document.getElementById('status_text');
    (async () => {
      const profile = await api.getProfile();
      const from = profile.member.id;
      const point = Number(data.get('point'));
      const message = data.get('message');
      const toList = data.getAll('to');
      progress.max = toList.length;
      for (const to of toList) {
        progress.value += 1;
        if (to === '') continue;
        const name = form.querySelector(`input[name="to"][value="${to}"]`).title;
        statusText.textContent = chrome.i18n.getMessage('m3', name);
        const result = await api.sendCard(from, to, point, message);
        console.debug(result);
        console.info(`Sent Unipos to ${name}}`);
      }
      window.alert(chrome.i18n.getMessage('m1'));
      form.reset();
    })().catch(error => {
      window.alert(chrome.i18n.getMessage('m4'));
      console.error(error);
    });
  });

  document.getElementById('recipient').addEventListener('keypress', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const recipient = event.target;
    const text = recipient.value;
    (new Recipients(text)).insertBefore(document.getElementById('recipient'))
      .then(() => {
        recipient.value = ''
      })
      .catch(console.error);
  });

  document.getElementById('recipient').addEventListener('paste', (event) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    (new Recipients(text)).insertBefore(document.getElementById('recipient'))
      .catch(console.error);
  });

  (new MutationObserver((mutations) => {
    mutations
      .filter(mutation => mutation.type === 'childList')
      .forEach(mutation => {
        const length = mutation.target.querySelectorAll('.recipient').length;
        document.getElementById('recipient').required = length === 0;
        (async () => {
          const profile = await api.getProfile();
          const availablePoint = profile.member.pocket.available_point;
          document.getElementById('point').max = Math.min(120, availablePoint > 1 ? Math.floor(availablePoint / length) : availablePoint);
        })().catch(console.error);
      });
  })).observe(document.getElementById('recipients'), { childList: true })
});