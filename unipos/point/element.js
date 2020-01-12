export default class UniposPointElement extends HTMLInputElement {
  static get observedAttributes() { return ['recipients']; }

  constructor() {
    super();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'recipients':
        ((oldValue, newValue) => {
          const document = this.ownerDocument;
          const past = document.getElementById(oldValue);
          past && past.removeEventListener('change', this.recipientsChangeEventListener);
          const current = document.getElementById(newValue);
          current && current.addEventListener('change', this.recipientsChangeEventListener);
        })(oldValue, newValue);
        break;

      default:
        break;
    }
  }

  recipientsChangeEventListener = (event) => {
    (async () => {
      const availablePoint = await this.fetchAvailablePoint();
      const length = this.recipients && this.recipients.members.length;
      this.max = Math.min(120, availablePoint > 1 ? Math.floor(availablePoint / length) : availablePoint);
    })();
  }

  get fetchAvailablePoint() {
    return this._fetchAvailablePoint || Promise.resolve(120);
  }

  set fetchAvailablePoint(value) {
    this._fetchAvailablePoint = value;
  }

  get recipients() {
    return this.ownerDocument.getElementById(this.getAttribute('recipients'));
  }
}

window.customElements.define('unipos-point', UniposPointElement, { extends: 'input' });