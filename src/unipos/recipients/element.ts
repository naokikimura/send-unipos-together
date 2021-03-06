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
  static get observedAttributes(): string[] { return ['required']; }
  static get formAssociated(): boolean { return true; }

  private internals: ElementInternals;
  private input: HTMLInputElement = undefined;
  private mutationObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        switch (mutation.attributeName) {
          case 'disabled':
            this.setFormValue();
            this.validate();
            break;

          case 'data-id':
            this.setFormValue();
            break;

          default:
            break;
        }
      }
    }
  });

  constructor() {
    super();
    this.internals = this.attachInternals();
    const shadow = this.attachShadow({ mode: 'open' });
    const template = document.getElementById('unipos-recipients') as HTMLTemplateElement;
    shadow.appendChild(document.importNode(template.content, true));

    const inputSlot = shadow.querySelector<HTMLSlotElement>('slot[name="input"]');
    inputSlot.addEventListener('slotchange', () => {
      this.input = inputSlot.assignedElements({ flatten: true })
        .filter((element): element is HTMLInputElement => element instanceof HTMLInputElement)[0];
      this.validate();
    });

    const recipientsSlot = shadow.querySelector<HTMLSlotElement>('slot[name="recipients"]');
    recipientsSlot.addEventListener('slotchange', () => {
      this.mutationObserver.disconnect();
      for (const recipient of this.recipientElements) {
        this.mutationObserver.observe(recipient, { attributes: true, attributeFilter: ['disabled', 'data-id'] });
      }
      this.setFormValue();
      this.validate();
      this.dispatchEvent(new CustomEvent('change'));
    });
  }

  public attributeChangedCallback(name: string): void {
    switch (name) {
      case 'required':
        if (this.required) this.validate();
        break;

      default:
        break;
    }
  }

  public formResetCallback(): void {
    for (const element of this.recipientElements) element.remove();
  }

  public formAssociatedCallback(): void {
    this.setFormValue();
  }

  public formDisabledCallback(): void {
    this.validate();
  }

  public findMembers(...ids: string[]): UniposMember[] {
    return this.members.filter(member => ids.includes(member.id));
  }

  public appendMember(...members: UniposMember[]): UniposRecipientsElement {
    const fragment = members.reduce((element, member) => {
      element.appendChild(this.createRecipientNode(member));
      return element;
    }, this.ownerDocument.createDocumentFragment());
    this.appendChild(fragment);
    return this;
  }

  private createRecipientNode(member: UniposMember): UniposRecipientElement {
    const element = this.ownerDocument.createElement('unipos-recipient') as UniposRecipientElement;
    element.member = member;
    element.setAttribute('slot', 'recipients');
    return element;
  }

  private setFormValue(): void {
    const data = this.recipientElements
      .filter(recipient => !recipient.disabled)
      .reduce((formData, recipient) => {
        formData.append(this.name, recipient.member.id);
        return formData;
      }, new FormData());
    this.internals.setFormValue(data);
  }

  private validate(): void {
    this.internals.setValidity({
      valueMissing: this.required && this.recipientElements.filter(recipient => !recipient.disabled).length === 0,
    }, i18n.getMessage('valueMissing'), this.input);
  }

  get form(): HTMLFormElement {
    return this.internals.form;
  }

  get name(): string {
    return this.getAttribute('name');
  }

  set name(value) {
    this.setAttribute('name', value);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value) {
    if (value) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  get required(): boolean {
    return this.hasAttribute('required');
  }

  set required(value) {
    if (value) this.setAttribute('required', '');
    else this.removeAttribute('required');
  }

  get members(): UniposMember[] {
    return [...this.recipientElements]
      .map(recipient => recipient.member);
  }

  get recipientElements(): UniposRecipientElement[] {
    const recipientsSlot = this.shadowRoot.querySelector<HTMLSlotElement>('slot[name="recipients"]');
    return recipientsSlot.assignedElements({ flatten: true })
      .filter((element): element is UniposRecipientElement => element instanceof UniposRecipientElement);
  }
}

window.customElements.define('unipos-recipients', UniposRecipientsElement);
