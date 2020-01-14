import UniposRecipientsElement from '../recipients/element.js';

export default class UniposCardFormElement extends HTMLFormElement {
  constructor() {
    super();

    this.addEventListener('submit', (event) => {
      event.preventDefault();
      const cardSubmitEvent = new CustomEvent('cardsubmit', { cancelable: true });
      if (!this.dispatchEvent(cardSubmitEvent)) return;
      const data = new FormData(this);
      (async () => {
        const profile = (await this.fetchProfile()) || { member: {} };
        const from = profile.member;
        const point = Number(data.get('point'));
        const message = data.get('message');
        const members = this.resolveMembers(...data.getAll('to'));
        for (const to of members) {
          const sendEvent = new CustomEvent('send', { cancelable: true, detail: { to, from, point, message } });
          if (!form.dispatchEvent(sendEvent)) continue;
          try {
            const result = await this.sendCard(from.id, to.id, point, message);
            const sentEvent = new CustomEvent('sent', { detail: { to, from, point, message, result } });
            form.dispatchEvent(sentEvent);
          } catch (error) {
            const sendingErrorEvent = new CustomEvent('sendingerror', { detail: { to, from, point, message, error } });
            if (!form.dispatchEvent(sendingErrorEvent)) throw error;
          }
        }
        const cardsubmittedEvent = new CustomEvent('cardsubmitted');
        this.dispatchEvent(cardsubmittedEvent);
      })().catch(error => {
        const cardSubmittingErrorEvent = new CustomEvent('cardsubmittingerror', { detail: error });
        this.dispatchEvent(cardSubmittingErrorEvent);
      });
    });
  }

  get fetchProfile() {
    return this._fetchProfile instanceof Function ? this._fetchProfile : () => ({ member: {} });
  }

  set fetchProfile(value) {
    this._fetchProfile = value;
  }

  get sendCard() {
    return this._sendCard instanceof Function ? this._sendCard : () => { };
  }

  set sendCard(value) {
    this._sendCard = value;
  }

  get resolveMembers() {
    const defaultResolveMembers = (...ids) => this.recipientsElements.flatMap(e => e.findMembers(...ids));
    return this._resolveMembers instanceof Function ? this._resolveMembers : defaultResolveMembers;
  }

  set resolveMembers(value) {
    this._resolveMembers = value;
  }

  get recipientsElements() {
    return [...this.elements].filter(e => e instanceof UniposRecipientsElement);
  }
}

window.customElements.define('unipos-card-form', UniposCardFormElement, { extends: 'form' });