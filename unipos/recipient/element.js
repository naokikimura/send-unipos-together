function updateShadow(shadowRoot, { id = '', uname = '', display_name = '', picture_url }) {
  shadowRoot.getElementById('member-id').textContent = id;
  shadowRoot.getElementById('member-uname').textContent = uname;
  shadowRoot.getElementById('member-display_name').textContent = display_name;
  shadowRoot.getElementById('member-picture').setAttribute('alt', display_name);
  shadowRoot.getElementById('member-picture').src = picture_url || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
}

export default class UniposRecipientElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'data-id',
      'data-uname',
      'data-display_name',
      'data-picture_url',
      'disabled'
    ];
  }

  static get formAssociated() { return true; }

  constructor() {
    super();
    this.disabled = false;
    this.pastForm = null;
    this.internals = this.attachInternals();
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.getElementById('unipos-recipient');
    shadow.appendChild(document.importNode(template.content, true));
    shadow.getElementById('remove').addEventListener('click', (event) => {
      this.parentNode.removeChild(this);
    });
  }

  formAssociatedCallback(form) {
    this.pastForm && this.pastForm.removeEventListener('formdata', this.formdataEventListener);
    form && form.addEventListener('formdata', this.formdataEventListener);
    this.pastForm = form;
  }

  formDisabledCallback(disabled) {
    this.disabled = disabled;
    this.shadowRoot.getElementById('remove').disabled = disabled;
  }

  formdataEventListener = (event) => {
    if (this.disabled) return;
    const data = event.formData;
    data.append(this.name, this.member.id);
  }

  connectedCallback() {
    updateShadow(this.shadowRoot, this.dataset);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'disabled':
        this.disabled = newValue != null;
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

  get form() {
    return this.internals.form;
  }

  get name() {
    return this.getAttribute('name');
  }

  set name(value) {
    this.setAttribute('name');
  }

  get member() {
    return {
      id: this.dataset.id,
      uname: this.dataset.uname,
      display_name: this.dataset.display_name,
      picture_url: this.dataset.picture_url
    };
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