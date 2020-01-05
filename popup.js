window.addEventListener('DOMContentLoaded', (event) => {
  const executeScript = (...args) => new Promise((resolve, reject) => {
    chrome.tabs.executeScript(...args.concat(resolve));
  });

  const loadTokens = () => executeScript({
    code: "[window.localStorage.getItem('authnToken'), window.localStorage.getItem('refreshToken')]"
  }).then(results => results[0]);

  const saveTokens = (authnToken, refreshToken) => executeScript({
    code: `window.localStorage.setItem('authnToken', '${authnToken}'); window.localStorage.setItem('refreshToken', '${refreshToken}');`
  });

  class JSONRPC {
    static async call(url, method, params, token = null) {
      const res = await fetch(url, {
        "headers": {
          "accept": "*/*",
          "content-type": "application/json",
          "x-unipos-token": token || undefined
        },
        "body": JSON.stringify({
          "jsonrpc": "2.0",
          "method": method,
          "params": params,
          "id": new Date().getTime() * 1000 + Math.floor(Math.random() * 1000)
        }),
        "method": "POST"
      });
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

  const refreshToken = async (authnToken, refreshToken) => {
    const result = await JSONRPC.call('https://unipos.me/a/jsonrpc', 'Unipos.RefreshToken', { "authn_token": authnToken, "refresh_token": refreshToken });
    await saveTokens(result.authn_token, result.refresh_token);
    return [result.authn_token, result.refresh_token];
  };

  const callWithToken = async (...args) => {
    const [aToken, rToken] = await loadTokens();
    try {
      return await JSONRPC.call.apply(undefined, args.concat(aToken));
    } catch (error) {
      if (error.code !== -40000) throw error;
      const [authnToken] = await refreshToken(aToken, rToken);
      return await JSONRPC.call.apply(undefined, args.concat(authnToken));
    }
  };

  const findSuggestMembers = (term, limit = 1000) =>
    callWithToken('https://unipos.me/q/jsonrpc', 'Unipos.FindSuggestMembers', { "term": term, "limit": limit });

  const getProfile = () => callWithToken('https://unipos.me/q/jsonrpc', 'Unipos.GetProfile', []);

  const sendCard = (from, to, point, message) =>
    callWithToken('https://unipos.me/c/jsonrpc', 'Unipos.SendCard', { 'from_member_id': from, 'to_member_id': to, 'point': point, 'message': message });

  class Recipients {
    constructor(text) {
      this.text = text;
    }

    static createRecipientElement(member) {
      const recipient = document.createElement('span');
      recipient.classList.add('recipient');
      recipient.classList.add(member.id ? 'exist' : 'not_exist')
      const span = document.createElement('span');
      const img = document.createElement('img');
      img.src = member.picture_url || chrome.i18n.getMessage('m2');
      img.alt = member.display_name;
      span.appendChild(img);
      const name = member.display_name + (member.uname ? `(@${member.uname})` : '')
      span.appendChild(document.createTextNode(name));
      recipient.appendChild(span);
      const button = document.createElement('button');
      button.textContent = '×';
      button.addEventListener('click', event => {
        recipient.parentNode.removeChild(recipient);
      });
      recipient.appendChild(button);
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'to'
      input.value = member.id || '';
      recipient.appendChild(input);
      return recipient;
    }

    insertBefore(target) {
      const parent = target.parentNode;
      return Promise.all(
        this.text.split(/[\r\n]/).filter(term => term !== '').map(async term => {
          const result = await findSuggestMembers(term);
          const member = result.length === 1 ? result[0] : { display_name: term };
          parent.insertBefore(Recipients.createRecipientElement(member), target);
        })
      );
    }
  }

  document.getElementById('card').addEventListener('reset', (event) => {
    const parent = document.getElementById('recipients');
    for (child of parent.querySelectorAll('.recipient'))
      parent.removeChild(child);
  });

  document.getElementById('card').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    (async () => {
      const profile = await getProfile();
      const from = profile.member.id;
      const point = Number(data.get('point'));
      const message = data.get('message');
      for (const to of data.getAll('to')) {
        if (to === '') continue;
        const result = await sendCard(from, to, point, message);
        console.debug(result);
        console.info(`Sent Unipos to ${to}`);
      }
      window.alert(chrome.i18n.getMessage('m1'));
      form.reset();
    })().catch(error => {
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
        document.getElementById('recipient').required = mutation.target.querySelectorAll('.recipient').length === 0
      });
  })).observe(document.getElementById('recipients'), { childList: true })
});