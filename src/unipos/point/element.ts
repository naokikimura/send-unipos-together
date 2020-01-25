import UniposRecipientsElement from '../recipients/element.js';

type FetchAvailablePoint = () => number | Promise<number>

export default class UniposPointElement extends HTMLInputElement {
  static get observedAttributes(): string[] { return ['recipients']; }

  private _fetchAvailablePoint: FetchAvailablePoint;

  constructor() {
    super();
  }

  public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
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

  private recipientsChangeEventListener = async (): Promise<void> => {
    const availablePoint = await this.fetchAvailablePoint();
    const length = this.recipients && this.recipients.members.length;
    this.max = String(Math.min(120, availablePoint > 1 ? Math.floor(availablePoint / length) : availablePoint));
  }

  get fetchAvailablePoint(): FetchAvailablePoint {
    return this._fetchAvailablePoint || ((): number => 120);
  }

  set fetchAvailablePoint(value) {
    this._fetchAvailablePoint = value;
  }

  get recipients(): UniposRecipientsElement {
    const attribute = this.getAttribute('recipients');
    return attribute
      ? this.ownerDocument.getElementById(attribute) as UniposRecipientsElement
      : this.closest<UniposRecipientsElement>('unipos-recipients');
  }
}

window.customElements.define('unipos-point', UniposPointElement, { extends: 'input' });
