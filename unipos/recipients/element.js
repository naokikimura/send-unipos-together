export default class UniposRecipientsElement extends HTMLElement {
  static get observedAttributes() { return ['disabled']; }
  static get formAssociated() { return true; }

  constructor() {
    super();
    this.disabled = false;
    this.internals = this.attachInternals();
    this.internals.setFormValue(null);
    this.pastForm = null;
    const document = this.ownerDocument;
    const shadow = this.attachShadow({ mode: 'open' });
    const template = document.getElementById('unipos-recipients');
    shadow.appendChild(document.importNode(template.content, true));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'disabled') {
      this.disabled = newValue != null;
    }
  }

  formAssociatedCallback(form) {
    this.pastForm && this.pastForm.removeEventListener('formdata', this.formdataEventListener);
    form.addEventListener('formdata', this.formdataEventListener);
    this.pastForm = form;
  }

  formDisabledCallback(disabled) {
    this.disabled = disabled;
    const slot = this.shadowRoot.querySelector('slot[name="recipients"]');
    const elements = slot.assignedElements();
    elements
      .flatMap(element => [...element.querySelectorAll('unipos-recipient')])
      .forEach(recipient => recipient.disabled);
  }

  formdataEventListener = (event) => {
    if (this.disabled) return;
    const data = event.formData;
    for (const member of this.members) {
      data.append(this.name, member.id);
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
    const slot = this.shadowRoot.querySelector('slot[name="recipients"]');
    const elements = slot.assignedElements();
    return elements
      .flatMap(element => [...element.querySelectorAll('unipos-member')])
      .map(node => node.member);
  }

  findMembers(...ids) {
    return this.members.filter(member => ids.includes(member.id));
  }

  createRecipientNode(member) {
    const document = this.ownerDocument;
    const template = this.shadowRoot.getElementById('recipient');
    const fragment = document.importNode(template.content, true);
    const recipientElement = fragment.querySelector('unipos-recipient');
    recipientElement.classList.add(member.id ? 'exist' : 'not_exist');
    const memberElement = recipientElement.querySelector('unipos-member');
    const img = memberElement.querySelector('img[slot="picture"]');
    if (member.picture_url) img.src = member.picture_url;
    img.alt = member.display_name;
    memberElement.querySelector('[slot="display_name"]').textContent = member.display_name;
    memberElement.querySelector('[slot="uname"]').textContent = member.uname;
    memberElement.querySelector('[slot="id"]').textContent = member.id || '';
    return fragment;
  }

  appendMember(...members) {
    const slot = this.shadowRoot.querySelector('slot[name="recipients"]');
    const elements = slot.assignedElements();
    for (const element of elements) {
      members.reduce((element, member) => {
        element.appendChild(this.createRecipientNode(member))
        return element;
      }, element);
    }
    return this;
  }
}

window.customElements.define('unipos-recipients', UniposRecipientsElement);