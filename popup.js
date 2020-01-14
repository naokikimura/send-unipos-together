import UniposAPI from './unipos/api.js';

const api = new UniposAPI({
  load: () => browser.tabs.executeScript({
    code: "[window.localStorage.getItem('authnToken'), window.localStorage.getItem('refreshToken')]"
  }).then(results => results[0]),

  save: (authnToken, refreshToken) => browser.tabs.executeScript({
    code: `window.localStorage.setItem('authnToken', '${authnToken}'); window.localStorage.setItem('refreshToken', '${refreshToken}');`
  })
});

window.addEventListener('DOMContentLoaded', (event) => {
  const progress = document.getElementById('progress');
  const statusText = document.getElementById('status_text');
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

  for (const form of document.querySelectorAll('form[is="unipos-card-form"]')) {
    form.fetchProfile = () => api.getProfile();
    form.sendCard = (...args) => api.sendCard(...args);

    form.addEventListener('reset', (event) => {
      progress.value = 0;
      statusText.textContent = '';

      // FIXME:
      for (const node of form.querySelectorAll('input,select,textarea')) {
        node.readOnly = false;
      }
    });

    form.addEventListener('cardsubmit', (event) => {
      progress.max = recipients.members.length;
      statusText.textContent = '';

      // FIXME:
      for (const node of form.querySelectorAll('input,select,textarea')) {
        node.readOnly = true;
      }
    });

    form.addEventListener('cardsubmitted', (event) => {
      window.alert(browser.i18n.getMessage('m1'));
      form.reset();
    });

    form.addEventListener('cardsubmittingerror', (event) => {
      window.alert(browser.i18n.getMessage('m4'));
      console.error(error);
    });

    form.addEventListener('send', (event) => {
      const to = event.detail.to;
      progress.value += 1;
      if (!to.id) return event.preventDefault();
      statusText.textContent = browser.i18n.getMessage('m3', to.display_name);
    });

    form.addEventListener('sendingerror', (event) => {
      event.preventDefault();
      console.error(event);
    });

    form.addEventListener('sent', (event) => {
      console.debug(event);
      const to = event.detail.to;
      console.info(`Sent Unipos to ${to.display_name}`);
    });
  }

  browser.storage.sync.get(['options']).then(result => {
    const { recipientMembers = [], point = null, message = '' } = result.options || {};
    recipients.appendMember(...recipientMembers);
    document.querySelector('fieldset#card [name="point"]').value = point === null ? '' : point;
    document.querySelector('fieldset#card [name="message"]').value = message;
  }).catch(console.error);
});