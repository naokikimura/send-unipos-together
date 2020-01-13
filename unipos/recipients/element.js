import UniposRecipientElement from '../recipient/element.js';
import Internationalization from '../../internationalization.js';

const i18n = new Internationalization({
  en: {
    valueMissing: {
      message: 'Please specify at least one recipient.'
    }
  },
  ja: {
    valueMissing: {
      message: '宛先を 1 つ以上指定してください。'
    }
  }
}, 'en', ...window.navigator.languages);

const validate = function () {
  this._internals.setValidity({
    valueMissing: this.required && this.recipientElements.length === 0
  }, i18n.getMessage('valueMissing'), this._input);
};

export default class UniposRecipientsElement extends HTMLElement {
  static get observedAttributes() { return ['disabled', 'required']; }
  static get formAssociated() { return true; }

  constructor() {
    super();
    this.disabled = false;
    this._internals = this.attachInternals();
    this._internals.setFormValue(null);
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.getElementById('unipos-recipients');
    shadow.appendChild(document.importNode(template.content, true));
    this._pastForm = null;
    this._input = undefined;

    const inputSlot = shadow.querySelector('slot[name="input"]');
    inputSlot.addEventListener('slotchange', (event) => {
      this._input = inputSlot.assignedElements({ flatten: true })
        .filter(element => element instanceof HTMLInputElement)[0];
      validate.call(this);
    });

    const recipientsSlot = shadow.querySelector('slot[name="recipients"]');
    recipientsSlot.addEventListener('slotchange', (event) => {
      validate.call(this);
      this.dispatchEvent(new CustomEvent('change'));
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'disabled':
        this.disabled = newValue !== null;
        break;

      case 'required':
        if (this.required) validate.call(this);
        break;

      default:
        break;
    }
  }

  formResetCallback() {
    for (const element of this.recipientElements)
      element.remove();
  }

  formAssociatedCallback(form) {
    this._pastForm && this._pastForm.removeEventListener('formdata', this.formdataEventListener);
    form && form.addEventListener('formdata', this.formdataEventListener);
    this._pastForm = form;
  }

  formDisabledCallback(disabled) {
    this.disabled = disabled;
    this.recipientElements
      .forEach(recipient => recipient.disabled = disabled);
  }

  formdataEventListener = (event) => {
    if (this.disabled) return;
    const data = event.formData;
    for (const recipient of this.recipientElements) {
      if (recipient.disabled) continue;
      data.append(this.name, recipient.member.id);
    }
  }

  get form() {
    return this._internals.form;
  }

  get name() {
    return this.getAttribute('name');
  }

  set name(value) {
    this.setAttribute('name', value);
  }

  get disabled() {
    return !!this._disabled;
  }

  set disabled(value) {
    this._disabled = !!value;
  }

  get required() {
    return this.hasAttribute('required');
  }

  set required(value) {
    if (value)
      this.setAttribute('required', '');
    else
      this.removeAttribute('required');
  }

  get members() {
    return [...this.recipientElements]
      .map(recipient => recipient.member);
  }

  get recipientElements() {
    const recipientsSlot = this.shadowRoot.querySelector('slot[name="recipients"]');
    return recipientsSlot.assignedElements({ flatten: true })
      .filter(element => element instanceof UniposRecipientElement);
  }

  findMembers(...ids) {
    return this.members.filter(member => ids.includes(member.id));
  }

  createRecipientNode(member) {
    const element = this.ownerDocument.createElement('unipos-recipient');
    element.member = member;
    element.setAttribute('slot', 'recipients');
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