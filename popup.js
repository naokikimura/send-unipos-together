import UniposAPI from './unipos/api.js';
import UniposMemberElement from './unipos/member/element.js';

window.addEventListener('DOMContentLoaded', (event) => {
  const executeScript = (...args) => new Promise((resolve, reject) => {
    chrome.tabs.executeScript(...args.concat(resolve));
  });

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
    constructor(element, template) {
      this.element = element;
      this.template = template;
    }

    get members() {
      return Array.from(this.element.querySelectorAll('unipos-member')).map(node => Member.new(node.member));
    }

    createRecipientNode(member) {
      const fragment = document.importNode(this.template.content, true);
      const recipientElement = fragment.querySelector('.recipient');
      recipientElement.classList.add(member.id ? 'exist' : 'not_exist');
      const memberElement = recipientElement.querySelector('unipos-member');
      const img = memberElement.querySelector('img[slot="picture"]');
      img.src = member.picture_url || chrome.i18n.getMessage('m2');
      img.alt = member.display_name;
      memberElement.querySelector('[slot="display_name"]').textContent = member.display_name;
      memberElement.querySelector('[slot="uname"]').textContent = member.uname;
      memberElement.querySelector('[slot="id"]').textContent = member.id || '';
      const input = recipientElement.querySelector('input[name="to"]');
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
    document.getElementById('suggest_members').textContent = '';
    document.getElementById('progress').value = 0;
    document.getElementById('status_text').textContent = '';

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
        const name = form.querySelector(`[name="to"][value="${CSS.escape(to)}"]`).title;
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

  document.getElementById('recipients_slot').addEventListener('input', (event) => {
    const value = event.target.value;
    api.findSuggestMembers(value, 10)
      .then(members => {
        const dataList = document.getElementById('suggest_members');
        dataList.textContent = '';
        dataList.appendChild(
          members
            .map(member => {
              const option = document.createElement('option');
              option.value = member.uname;
              option.textContent = `${member.display_name} ${member.uname}`
              return option;
            })
            .reduce((parent, child) => {
              parent.appendChild(child);
              return parent;
            }, document.createDocumentFragment())
        );
      })
      .catch(console.error);
  });

  document.getElementById('recipients_slot').addEventListener('keypress', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const recipientsSlot = event.target;
    const value = event.target.value;
    Members.fetch(api, value)
      .then(members => {
        recipients.appendMember(...members);
        recipientsSlot.value = ''
        document.getElementById('suggest_members').textContent = '';
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
        document.getElementById('suggest_members').textContent = '';
      })
      .catch(console.error);
  });

  document.getElementById('recipients_slot').addEventListener('paste', (event) => {
    if (event.target.value) return;
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
          document.querySelector('#point input[type="number"]').max
            = Math.min(120, availablePoint > 1 ? Math.floor(availablePoint / length) : availablePoint);
        })().catch(console.error);
      });
  })).observe(recipients.element, { childList: true })

  document.querySelector('#card #message textarea[name="message"]').addEventListener('input', (event) => {
    const textarea = event.target;
    while (textarea.scrollHeight > textarea.offsetHeight) textarea.rows++;
  });

  chrome.storage.sync.get(['options'], result => {
    const { recipientMembers = [], point = null, message = '' } = result.options || {};
    recipients.appendMember(...(recipientMembers.map(Member.new)));
    document.querySelector('form#card [name="point"]').value = point === null ? '' : point;
    document.querySelector('form#card [name="message"]').value = message;
  });
});