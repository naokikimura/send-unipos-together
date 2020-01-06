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

  class Member {
    static new(member) {
      return new Member(member.id, member.uname, member.display_name, member.picture_url);
    }

    static async find(api, term) {
      const result = await api.findSuggestMembers(term);
      return Member.new(result.length === 1 ? result[0] : { display_name: term });
    }

    constructor(id, uname, display_name, picture_url) {
      this.id = id;
      this.uname = uname;
      this.display_name = display_name;
      this.picture_url = picture_url;
    }
  }

  class Members {
    static async fetch(api, ...values) {
      const terms = values.map(term => term.trim()).filter(term => term !== '');
      return Promise.all(terms.map(async term => Member.find(api, term)));
    }
  }

  class RecipientsElement {
    static async new(element, template, ...values) {
      const members = await Members.fetch(...values);
      return new RecipientsElement(element, template).appendMember(...members);
    }

    constructor(element, template) {
      this.element = element;
      this.template = template;
    }

    get members() {
      return Array.from(this.element.querySelectorAll('.member')).map(node => new Member(
        node.querySelector('input.id').value,
        node.querySelector('.uname').textContent,
        node.querySelector('.display_name').textContent,
        node.querySelector('img.picture_url').src
      ));
    }

    createRecipientNode(member) {
      const fragment = document.importNode(this.template.content, true);
      const recipientElement = fragment.querySelector('.recipient');
      recipientElement.classList.add(member.id ? 'exist' : 'not_exist');
      const memberElement = recipientElement.querySelector('.member');
      const img = memberElement.querySelector('img.picture_url');
      img.src = member.picture_url || chrome.i18n.getMessage('m2');
      img.alt = member.display_name;
      memberElement.querySelector('.display_name').textContent = member.display_name;
      memberElement.querySelector('.uname').textContent = member.uname;
      const input = memberElement.querySelector('input.id');
      input.value = member.id || '';
      input.title = member.display_name;
      const button = recipientElement.querySelector('button.remove');
      button.addEventListener('click', event => {
        recipientElement.parentNode.removeChild(recipientElement);
      });
      return fragment;
    }

    appendMember(...members) {
      members.reduce((element, member) => {
        element.appendChild(this.createRecipientNode(member))
        return element;
      }, this.element);
      return this;
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

    for (const node of event.target.querySelectorAll('.recipients'))
      node.textContent = '';

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
        console.info(`Sent Unipos to ${name}`);
      }
      window.alert(chrome.i18n.getMessage('m1'));
      form.reset();
    })().catch(error => {
      window.alert(chrome.i18n.getMessage('m4'));
      console.error(error);
    });
  });

  const recipients = new RecipientsElement(document.querySelector('form#card .recipients'), document.getElementById('recipient'));

  document.getElementById('recipients_slot').addEventListener('keypress', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const recipientsSlot = event.target;
    const value = event.target.value;
    Members.fetch(api, value)
      .then(members => {
        recipients.appendMember(...members);
        recipientsSlot.value = ''
      })
      .catch(console.error);
  });

  document.getElementById('recipients_slot').addEventListener('blur', (event) => {
    const recipientsSlot = event.target;
    const value = event.target.value;
    Members.fetch(api, value)
      .then(members => {
        recipients.appendMember(...members);
        recipientsSlot.value = ''
      })
      .catch(console.error);
  });

  document.getElementById('recipients_slot').addEventListener('paste', (event) => {
    console.debug(event);
    event.preventDefault();
    const values = event.clipboardData.getData('text/plain').split(/[\r\n]/);
    Members.fetch(api, ...values)
      .then(members => {
        recipients.appendMember(...members);
      })
      .catch(console.error);
  });

  (new MutationObserver((mutations) => {
    mutations
      .filter(mutation => mutation.type === 'childList')
      .forEach(mutation => {
        const length = mutation.target.querySelectorAll('.recipient').length;
        document.getElementById('recipients_slot').required = length === 0;
        (async () => {
          const profile = await api.getProfile();
          const availablePoint = profile.member.pocket.available_point;
          document.getElementById('point').max = Math.min(120, availablePoint > 1 ? Math.floor(availablePoint / length) : availablePoint);
        })().catch(console.error);
      });
  })).observe(recipients.element, { childList: true })
});