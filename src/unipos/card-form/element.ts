import { UniposMember, UniposProfile } from '../index';
import UniposRecipientsElement from '../recipients/element.js';

export default class UniposCardFormElement extends HTMLFormElement {
  private _sendCard: (id: string, to: string, point: number, message: string) => void | Promise<void>;
  private _fetchProfile: () => UniposProfile | Promise<UniposProfile>;
  private _resolveMembers: (...ids: string[]) => UniposMember[];

  constructor() {
    super();

    this.addEventListener('submit', event => {
      event.preventDefault();
      const cardSubmitEvent = new CustomEvent('cardsubmit', { cancelable: true });
      if (!this.dispatchEvent(cardSubmitEvent)) return;
      const data = new FormData(this);
      (async () => {
        const profile = (await this.fetchProfile()) || { member: {} } as UniposProfile;
        const from = profile.member;
        const point = Number(data.get('point'));
        const message = String(data.get('message'));
        const members = this.resolveMembers(...data.getAll('to').map(String));
        for (const to of members) {
          const sendEvent = new CustomEvent('send', { cancelable: true, detail: { to, from, point, message } });
          if (!this.dispatchEvent(sendEvent)) continue;
          try {
            const result = await this.sendCard(from.id, to.id, point, message);
            const sentEvent = new CustomEvent('sent', { detail: { to, from, point, message, result } });
            this.dispatchEvent(sentEvent);
          } catch (error) {
            const sendingErrorEvent = new CustomEvent('sendingerror', { detail: { to, from, point, message, error } });
            if (!this.dispatchEvent(sendingErrorEvent)) throw error;
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
    return this._fetchProfile instanceof Function ? this._fetchProfile : () => ({ member: {} } as UniposProfile);
  }

  set fetchProfile(value) {
    this._fetchProfile = value;
  }

  get sendCard() {
    return this._sendCard instanceof Function
      ? this._sendCard
      : (...args: [string, string, number, string]) => { };
  }

  set sendCard(value) {
    this._sendCard = value;
  }

  get resolveMembers() {
    const defaultResolveMembers = (...ids: string[]) => this.recipientsElements.flatMap(e => e.findMembers(...ids));
    return this._resolveMembers instanceof Function ? this._resolveMembers : defaultResolveMembers;
  }

  set resolveMembers(value) {
    this._resolveMembers = value;
  }

  get recipientsElements() {
    return [...this.elements].filter((e): e is UniposRecipientsElement => e instanceof UniposRecipientsElement);
  }
}

window.customElements.define('unipos-card-form', UniposCardFormElement, { extends: 'form' });
