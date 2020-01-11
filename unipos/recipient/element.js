const assignedNodes = (slot, options = { flatten: false }) => {
  const nodes = slot.assignedNodes(options);
  return nodes.length ? nodes : Array.from(slot.childNodes);
};

const assignedElements = (slot, options = { flatten: false }) => {
  const elements = slot.assignedElements(options);
  return elements.length ? elements : Array.from(slot.children);
};

export default class UniposRecipientElement extends HTMLElement {
  static get observedAttributes() { return ['disabled']; }
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
    form.addEventListener('formdata', this.formdataEventListener);
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

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'disabled') {
      this.disabled = newValue != null;
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
    const slot = this.shadowRoot.querySelector('slot[name="member"]');
    const elements = assignedElements(slot)
      .filter(element => element.tagName === 'UNIPOS-MEMBER' || element.querySelector('unipos-member'));
    return (elements[0] || {}).member;
  }
}

window.customElements.define('unipos-recipient', UniposRecipientElement);