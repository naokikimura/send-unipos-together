import { UniposMember } from '../index';

function updateShadow(shadowRoot: ShadowRoot, { id = '', uname = '', display_name = '', picture_url }: DOMStringMap) {
  shadowRoot.getElementById('member-id').textContent = id;
  shadowRoot.getElementById('member-uname').textContent = uname;
  shadowRoot.getElementById('member-display_name').textContent = display_name;
  const img = shadowRoot.getElementById('member-picture') as HTMLImageElement;
  img.setAttribute('alt', display_name);
  img.src = picture_url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
}

export default class UniposRecipientElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'data-id',
      'data-uname',
      'data-display_name',
      'data-picture_url',
      'disabled',
    ];
  }

  static get formAssociated() { return true; }

  private _disabled = false;
  private pastForm: HTMLFormElement = null;
  private internals: any /* ElementInternals */; // TODO:

  constructor() {
    super();
    this.internals = (this as any).attachInternals(); // TODO:
    const shadow = this.attachShadow({ mode: 'open' });
    const template = document.getElementById('unipos-recipient') as HTMLTemplateElement;
    shadow.appendChild(document.importNode(template.content, true));
    shadow.getElementById('remove').addEventListener('click', event => {
      this.remove();
    });
  }

  public formAssociatedCallback(form: HTMLFormElement) {
    this.pastForm && this.pastForm.removeEventListener('formdata', this.formdataEventListener);
    form && form.addEventListener('formdata', this.formdataEventListener);
    this.pastForm = form;
  }

  public formDisabledCallback(disabled: boolean) {
    this.disabled = disabled;
    const button = this.shadowRoot.getElementById('remove') as HTMLButtonElement;
    button.disabled = disabled;
  }

  public connectedCallback() {
    updateShadow(this.shadowRoot, this.dataset);
  }

  public attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    switch (name) {
      case 'disabled':
        this.disabled = newValue !== null;
        break;

      case 'data-id':
      case 'data-uname':
      case 'data-display_name':
      case 'data-picture_url':
        updateShadow(this.shadowRoot, this.dataset);
        break;

      default:
        break;
    }
  }

  private formdataEventListener = (event: any /* FormDataEvent */) => { // TODO:
    if (this.disabled) return;
    const data = event.formData;
    data.append(this.name, this.member.id);
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

  get disabled() {
    return !!this._disabled;
  }

  set disabled(value) {
    this._disabled = !!value;
  }

  get member() {
    return {
      display_name: this.dataset.display_name,
      id: this.dataset.id,
      picture_url: this.dataset.picture_url,
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
