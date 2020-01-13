import UniposAPI from './unipos/api.js';

window.addEventListener('DOMContentLoaded', (event) => {
  const executeScript = (...args) => new Promise((resolve, reject) => {
    chrome.tabs.executeScript(...args.concat(resolve));
  });

  const api = new UniposAPI({
    load: () => executeScript({
      code: "[window.localStorage.getItem('authnToken'), window.localStorage.getItem('refreshToken')]"
    }).then(results => results[0]),

    save: (authnToken, refreshToken) => executeScript({
      code: `window.localStorage.setItem('authnToken', '${authnToken}'); window.localStorage.setItem('refreshToken', '${refreshToken}');`
    })
  });

  document.getElementById('send_card').addEventListener('reset', (event) => {
    document.getElementById('progress').value = 0;
    document.getElementById('status_text').textContent = '';

    for (const node of event.target.querySelectorAll('fieldset#card, fieldset#buttons')) {
      node.disabled = false;
    }
  });

  document.getElementById('send_card').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.target;
    const data = new FormData(form);
    for (const node of form.querySelectorAll('fieldset#card, fieldset#buttons')) {
      node.disabled = true;
    }
    const progress = document.getElementById('progress');
    const statusText = document.getElementById('status_text');
    (async () => {
      const profile = await api.getProfile();
      const from = profile.member.id;
      const point = Number(data.get('point'));
      const message = data.get('message');
      const members = recipients.findMembers(...data.getAll('to'));
      progress.max = members.length;
      for (const member of members) {
        progress.value += 1;
        if (!member.id) continue;
        const name = member.display_name;
        statusText.textContent = chrome.i18n.getMessage('m3', name);
        const result = await api.sendCard(from, member.id, point, message);
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

  const recipients = document.getElementById('recipients');

  for (const point of document.querySelectorAll('input[is="unipos-point"]')) {
    point.fetchAvailablePoint = async () => {
      try {
        const profile = await api.getProfile();
        return profile && profile.member.pocket.available_point;
      } catch (error) {
        console.error(error);
      }
    };
  }

  for (const suggestMembers of document.querySelectorAll('input[is="unipos-suggest-members"]')) {
    suggestMembers.findSuggestMembers = (value) => api.findSuggestMembers(value, 10).catch(console.error);
  }

  chrome.storage.sync.get(['options'], result => {
    const { recipientMembers = [], point = null, message = '' } = result.options || {};
    recipients.appendMember(...recipientMembers);
    document.querySelector('fieldset#card [name="point"]').value = point === null ? '' : point;
    document.querySelector('fieldset#card [name="message"]').value = message;
  });
});