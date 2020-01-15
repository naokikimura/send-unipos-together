import Internationalization from '../../internationalization.js';
import { UniposMember } from '../index';
import UniposRecipientElement from '../recipient/element.js';

const i18n = new Internationalization({
  en: {
    valueMissing: {
      message: 'Please specify at least one recipient.',
    },
  },
  ja: {
    valueMissing: {
      message: '宛先を 1 つ以上指定してください。',
    },
  },
}, 'en', ...window.navigator.languages);

export default class UniposRecipientsElement extends HTMLElement {
  static get observedAttributes() { return ['disabled', 'required']; }
  static get formAssociated() { return true; }

  private _disabled = false;
  private internals: any /* ElementInternals */; // TODO:
  private pastForm: HTMLFormElement = null;
  private input: HTMLInputElement = undefined;

  constructor() {
    super();
    this.disabled = false;
    this.internals = (this as any).attachInternals(); // TODO:
    this.internals.setFormValue(null);
    const shadow = this.attachShadow({ mode: 'open' });
    const template = document.getElementById('unipos-recipients') as HTMLTemplateElement;
    shadow.appendChild(document.importNode(template.content, true));

    const inputSlot = shadow.querySelector<HTMLSlotElement>('slot[name="input"]');
    inputSlot.addEventListener('slotchange', event => {
      this.input = inputSlot.assignedElements({ flatten: true })
        .filter((element): element is HTMLInputElement => element instanceof HTMLInputElement)[0];
      this.validate();
    });

    const recipientsSlot = shadow.querySelector<HTMLSlotElement>('slot[name="recipients"]');
    recipientsSlot.addEventListener('slotchange', event => {
      this.validate();
      this.dispatchEvent(new CustomEvent('change'));
    });
  }

  public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    switch (name) {
      case 'disabled':
        this.disabled = newValue !== null;
        break;

      case 'required':
        if (this.required) this.validate();
        break;

      default:
        break;
    }
  }

  public formResetCallback() {
    for (const element of this.recipientElements) element.remove();
  }

  public formAssociatedCallback(form: HTMLFormElement) {
    this.pastForm && this.pastForm.removeEventListener('formdata', this.formdataEventListener);
    form && form.addEventListener('formdata', this.formdataEventListener);
    this.pastForm = form;
  }

  public formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
    this.recipientElements
      .forEach(recipient => recipient.disabled = disabled);
  }

  public findMembers(...ids: string[]) {
    return this.members.filter(member => ids.includes(member.id));
  }

  public appendMember(...members: UniposMember[]) {
    const fragment = members.reduce((element, member) => {
      element.appendChild(this.createRecipientNode(member));
      return element;
    }, this.ownerDocument.createDocumentFragment());
    this.appendChild(fragment);
    return this;
  }

  private createRecipientNode(member: UniposMember) {
    const element = this.ownerDocument.createElement('unipos-recipient') as UniposRecipientElement;
    element.member = member;
    element.setAttribute('slot', 'recipients');
    return element;
  }

  private formdataEventListener = (event: any /* FormDataEvent */) => { // TODO:
    if (this.disabled) return;
    const data = event.formData;
    for (const recipient of this.recipientElements) {
      if (recipient.disabled) continue;
      data.append(this.name, recipient.member.id);
    }
  }

  private validate() {
    this.internals.setValidity({
      valueMissing: this.required && this.recipientElements.length === 0,
    }, i18n.getMessage('valueMissing'), this.input);
  }

  get form(): HTMLFormElement {
    return this.internals.form;
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
    if (value) this.setAttribute('required', '');
    else this.removeAttribute('required');
  }

  get members() {
    return [...this.recipientElements]
      .map(recipient => recipient.member);
  }

  get recipientElements() {
    const recipientsSlot = this.shadowRoot.querySelector<HTMLSlotElement>('slot[name="recipients"]');
    return recipientsSlot.assignedElements({ flatten: true })
      .filter((element): element is UniposRecipientElement => element instanceof UniposRecipientElement);
  }
}

window.customElements.define('unipos-recipients', UniposRecipientsElement);
