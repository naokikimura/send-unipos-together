import UniposRecipientsElement from '../recipients/element.js';

export default class UniposPointElement extends HTMLInputElement {
  static get observedAttributes() { return ['recipients']; }

  private _fetchAvailablePoint: () => Promise<number>;

  constructor() {
    super();
  }

  public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    switch (name) {
      case 'recipients':
        {
          const document = this.ownerDocument;
          const past = document.getElementById(oldValue);
          past && past.removeEventListener('change', this.recipientsChangeEventListener);
          const current = document.getElementById(newValue);
          current && current.addEventListener('change', this.recipientsChangeEventListener);
        }
        break;

      default:
        break;
    }
  }

  private recipientsChangeEventListener = (event: Event) => {
    (async () => {
      const availablePoint = await this.fetchAvailablePoint();
      const length = this.recipients && this.recipients.members.length;
      this.max = String(Math.min(120, availablePoint > 1 ? Math.floor(availablePoint / length) : availablePoint));
    })();
  }

  get fetchAvailablePoint() {
    return this._fetchAvailablePoint || (() => Promise.resolve(120));
  }

  set fetchAvailablePoint(value) {
    this._fetchAvailablePoint = value;
  }

  get recipients() {
    const attribute = this.getAttribute('recipients');
    return attribute
      ? this.ownerDocument.getElementById(attribute) as UniposRecipientsElement
      : this.closest<UniposRecipientsElement>('unipos-recipients');
  }
}

window.customElements.define('unipos-point', UniposPointElement, { extends: 'input' });
