export default class UniposRecipientsElement extends HTMLElement {
  static get observedAttributes() { return ['disabled']; }
  static get formAssociated() { return true; }

  constructor() {
    super();
    this.disabled = false;
    this.internals = this.attachInternals();
    this.internals.setFormValue(null);
    this.pastForm = null;
    (new MutationObserver((mutations) => {
      mutations
        .filter(mutation => mutation.type === 'childList')
        .forEach(mutation => {
          this.dispatchEvent(new CustomEvent('change', { detail: mutation }));
        });
    })).observe(this, { childList: true, subtree: true });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'disabled') {
      this.disabled = newValue !== null;
    }
  }

  formAssociatedCallback(form) {
    this.pastForm && this.pastForm.removeEventListener('formdata', this.formdataEventListener);
    form && form.addEventListener('formdata', this.formdataEventListener);
    this.pastForm = form;
  }

  formDisabledCallback(disabled) {
    this.disabled = disabled;
    this.querySelector('unipos-recipient')
      .forEach(recipient => recipient.disabled);
  }

  formdataEventListener = (event) => {
    if (this.disabled) return;
    const data = event.formData;
    for (const member of this.querySelectorAll('unipos-recipient')) {
      if (member.disabled) continue;
      data.append(this.name, member.member.id);
    }
  }

  get form() {
    return this.internals.form;
  }

  get name() {
    return this.getAttribute('name');
  }

  set name(value) {
    this.setAttribute('name', value);
  }

  get members() {
    return [...this.querySelectorAll('unipos-recipient')]
      .map(recipient => recipient.member);
  }

  findMembers(...ids) {
    return this.members.filter(member => ids.includes(member.id));
  }

  createRecipientNode(member) {
    const element = this.ownerDocument.createElement('unipos-recipient');
    element.member = member;
    return element;
  }

  appendMember(...members) {
    const fragment = members.reduce((element, member) => {
      element.appendChild(this.createRecipientNode(member))
      return element;
    }, this.ownerDocument.createDocumentFragment());
    this.appendChild(fragment);
    return this;
  }
}

window.customElements.define('unipos-recipients', UniposRecipientsElement);