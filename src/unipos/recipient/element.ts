import { UniposMember } from '../index';

function updateShadow(shadowRoot: ShadowRoot, { id = '', uname = '', display_name: displayName = '', picture_url: pictureUrl }: DOMStringMap): void {
  shadowRoot.getElementById('member-id').textContent = id;
  shadowRoot.getElementById('member-uname').textContent = uname;
  shadowRoot.getElementById('member-display_name').textContent = displayName;
  const img = shadowRoot.getElementById('member-picture') as HTMLImageElement;
  img.setAttribute('alt', displayName);
  img.src = pictureUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
}

export default class UniposRecipientElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'data-id',
      'data-uname',
      'data-display_name',
      'data-picture_url',
    ];
  }

  static get formAssociated(): boolean { return true; }

  private internals: ElementInternals;

  constructor() {
    super();
    this.internals = this.attachInternals();
    const shadow = this.attachShadow({ mode: 'open' });
    const template = document.getElementById('unipos-recipient') as HTMLTemplateElement;
    shadow.appendChild(document.importNode(template.content, true));
    shadow.getElementById('remove').addEventListener('click', () => {
      this.remove();
    });
  }

  public formAssociatedCallback(): void {
    this.internals.setFormValue(this.member.id);
  }

  public formDisabledCallback(disabled: boolean): void {
    const button = this.shadowRoot.getElementById('remove') as HTMLButtonElement;
    button.disabled = disabled;
  }

  public connectedCallback(): void {
    updateShadow(this.shadowRoot, this.dataset);
  }

  public attributeChangedCallback(name: string): void {
    switch (name) {
      case 'data-id':
        this.internals.setFormValue(this.member.id);
      // eslint-disable-next-line no-fallthrough
      case 'data-uname':
      case 'data-display_name':
      case 'data-picture_url':
        updateShadow(this.shadowRoot, this.dataset);
        break;

      default:
        break;
    }
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

  get member(): UniposMember {
    return {
      'display_name': this.dataset.display_name,
      id: this.dataset.id,
      'picture_url': this.dataset.picture_url,
      uname: this.dataset.uname,
    } as UniposMember;
  }

  set member(member) {
    for (const key of Object.keys(member)) {
      if (!['id', 'uname', 'display_name', 'picture_url'].includes(key)) continue;
      const value = member[key];
      if (value === undefined) {
        delete this.dataset[key];
      } else {
        this.dataset[key] = value;
      }
    }
  }
}

window.customElements.define('unipos-recipient', UniposRecipientElement);
