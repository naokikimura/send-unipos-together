import UniposAPI from './unipos/api.js';
import UniposCardFormElement from './unipos/card-form/element.js';
import UniposPointElement from './unipos/point/element.js';
import UniposRecipientsElement from './unipos/recipients/element.js';
import UniposSuggestMembersElement from './unipos/suggest-members/element.js';

const api = new UniposAPI({
  load: () => browser.tabs.executeScript({
    code: `[window.localStorage.getItem('authnToken'), window.localStorage.getItem('refreshToken')]`,
  }).then(results => (results[0] as [string, string])),

  save: (authnToken, refreshToken) => browser.tabs.executeScript({
    code: `window.localStorage.setItem('authnToken', '${authnToken}'); window.localStorage.setItem('refreshToken', '${refreshToken}');`,
  }).then(),
});

// tslint:disable: no-console
window.addEventListener('DOMContentLoaded', () => {
  const progress = document.getElementById('progress') as HTMLProgressElement;
  const statusText = document.getElementById('status_text');
  const recipients = document.getElementById('recipients') as UniposRecipientsElement;

  for (const point of document.querySelectorAll<UniposPointElement>('input[is="unipos-point"]')) {
    point.fetchAvailablePoint = async () => {
      try {
        const profile = await api.getProfile();
        return profile && profile.member.pocket.available_point;
      } catch (error) {
        console.error(error);
      }
    };
  }

  for (const suggestMembers of document.querySelectorAll<UniposSuggestMembersElement>('input[is="unipos-suggest-members"]')) {
    suggestMembers.findSuggestMembers = value => api.findSuggestMembers(value, 10)
      .catch(reason => {
        console.error(reason);
        return [];
      });
  }

  for (const form of document.querySelectorAll<UniposCardFormElement>('form[is="unipos-card-form"]')) {
    form.fetchProfile = () => api.getProfile();
    form.sendCard = (...args) => api.sendCard(...args).then(result => { });

    form.addEventListener('reset', event => {
      progress.value = 0;
      statusText.textContent = '';

      // FIXME:
      for (const node of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea')) {
        node.readOnly = false;
      }
    });

    form.addEventListener('cardsubmit', (event: CustomEvent) => {
      progress.max = recipients.members.length;
      statusText.textContent = '';

      // FIXME:
      for (const node of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea')) {
        node.readOnly = true;
      }
    });

    form.addEventListener('cardsubmitted', (event: CustomEvent) => {
      window.alert(browser.i18n.getMessage('m1'));
      form.reset();
    });

    form.addEventListener('cardsubmittingerror', (event: CustomEvent) => {
      window.alert(browser.i18n.getMessage('m4'));
      console.error(event);
    });

    form.addEventListener('send', (event: CustomEvent) => {
      const to = event.detail.to;
      progress.value += 1;
      if (!to.id) return event.preventDefault();
      statusText.textContent = browser.i18n.getMessage('m3', to.display_name);
    });

    form.addEventListener('sendingerror', (event: CustomEvent) => {
      event.preventDefault();
      console.error(event);
    });

    form.addEventListener('sent', (event: CustomEvent) => {
      console.debug(event);
      const to = event.detail.to;
      console.info(`Sent Unipos to ${to.display_name}`);
    });
  }

  browser.storage.sync.get(['options']).then(result => {
    const { recipientMembers = [], point = null, message = '' } = result.options || {};
    recipients.appendMember(...recipientMembers);
    document.querySelector<HTMLInputElement>('fieldset#card [name="point"]').value = point === null ? '' : point;
    document.querySelector<HTMLTextAreaElement>('fieldset#card [name="message"]').value = message;
  }).catch(console.error);
});
