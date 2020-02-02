import UniposAPI from './unipos/api.js';
import UniposCardFormElement from './unipos/card-form/element.js';
import UniposPointElement from './unipos/point/element.js';
import UniposRecipientsElement from './unipos/recipients/element.js';
import UniposSuggestMembersElement from './unipos/suggest-members/element.js';
import { UniposProfile, UniposMember } from './unipos/index.js';
import Localizer from './localizer.js';

const api = new UniposAPI({
  load: (): Promise<[string, string]> => browser.tabs.executeScript({
    code: `[window.localStorage.getItem('authnToken'), window.localStorage.getItem('refreshToken')]`,
  }).then(results => (results[0] as [string, string])),

  save: (authnToken, refreshToken): Promise<void> => browser.tabs.executeScript({
    code: `window.localStorage.setItem('authnToken', '${authnToken}'); window.localStorage.setItem('refreshToken', '${refreshToken}');`,
  }).then(),
});

const localizer = new Localizer();

// tslint:disable: no-console
window.addEventListener('DOMContentLoaded', () => {
  localizer.localize();

  const progress = document.getElementById('progress') as HTMLProgressElement;
  const statusText = document.getElementById('status_text');
  const recipients = document.getElementById('recipients') as UniposRecipientsElement;
  const dialog = document.getElementById('dialog') as HTMLDialogElement;

  for (const point of document.querySelectorAll<UniposPointElement>('input[is="unipos-point"]')) {
    point.fetchAvailablePoint = async (): Promise<number> => {
      try {
        const profile = await api.getProfile();
        return profile && profile.member.pocket.available_point;
      } catch (error) {
        console.error(error);
      }
    };
  }

  for (const suggestMembers of document.querySelectorAll<UniposSuggestMembersElement>('input[is="unipos-suggest-members"]')) {
    suggestMembers.findSuggestMembers = (value): Promise<UniposMember[]> => api.findSuggestMembers(value, 10)
      .catch(reason => {
        console.error(reason);
        return [];
      });
  }

  const form = document.querySelector<UniposCardFormElement>('form[is="unipos-card-form"]');
  form.fetchProfile = (): Promise<UniposProfile> => api.getProfile();
  form.sendCard = (...args): Promise<void> => api.sendCard(...args).then(() => undefined);

  form.addEventListener('reset', () => {
    progress.value = 0;
    statusText.textContent = '';
  });

  form.addEventListener('cardsubmit', () => {
    progress.value = 0;
    progress.max = recipients.members.length;
    statusText.textContent = browser.i18n.getMessage('card_submit');
    dialog.querySelector<HTMLButtonElement>('form button[value="ok"]').disabled = true;
    dialog.querySelector<HTMLButtonElement>('form button[value="cancel"]').disabled = false;
    dialog.showModal();
  });

  form.addEventListener('cardsubmitted', () => {
    statusText.textContent = browser.i18n.getMessage('card_submitted');
    dialog.querySelector<HTMLButtonElement>('form button[value="ok"]').disabled = false;
    dialog.querySelector<HTMLButtonElement>('form button[value="cancel"]').disabled = true;
  });

  form.addEventListener('cardsubmittingerror', (event: CustomEvent) => {
    statusText.textContent = browser.i18n.getMessage('card_submitting_error');
    dialog.querySelector<HTMLButtonElement>('form button[value="ok"]').disabled = false;
    dialog.querySelector<HTMLButtonElement>('form button[value="cancel"]').disabled = true;
    console.error(event);
  });

  form.addEventListener('cardsubmitcanceled', (event: CustomEvent) => {
    statusText.textContent = browser.i18n.getMessage('card_submit_canceled');
    dialog.querySelector<HTMLButtonElement>('form button[value="ok"]').disabled = false;
    dialog.querySelector<HTMLButtonElement>('form button[value="cancel"]').disabled = true;
    console.info(event);
  });

  form.addEventListener('send', (event: CustomEvent) => {
    const to = event.detail.to;
    progress.value += 1;
    if (!to.id) return event.preventDefault();
    statusText.textContent = browser.i18n.getMessage('send', to.display_name);
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

  dialog.addEventListener('close', () => {
    switch (dialog.returnValue) {
      case 'cancel':
        form.cancel();
        break;

      case 'ok':
        form.reset();
        break;

      default:
        break;
    }
  });

  browser.storage.sync.get(['options']).then(result => {
    const { recipientMembers = [], point = null, message = '' } = result.options || {};
    recipients.appendMember(...recipientMembers);
    document.querySelector<HTMLInputElement>('fieldset#card [name="point"]').value = point === null ? '' : point;
    document.querySelector<HTMLTextAreaElement>('fieldset#card [name="message"]').value = message;
  }).catch(console.error);
});
