export default class UniposMessageElement extends HTMLTextAreaElement {
  constructor() {
    super();
    this.addEventListener('input', (event) => {
      const textarea = event.target;
      while (textarea.scrollHeight > textarea.offsetHeight) textarea.rows++;
    });
  }
}

window.customElements.define('unipos-message', UniposMessageElement, { extends: 'textarea' });