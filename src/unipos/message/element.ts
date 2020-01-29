export default class UniposMessageElement extends HTMLTextAreaElement {
  constructor() {
    super();
    this.addEventListener('input', () => {
      while (this.scrollHeight > this.offsetHeight) this.rows++;
    });
  }
}

window.customElements.define('unipos-message', UniposMessageElement, { extends: 'textarea' });
