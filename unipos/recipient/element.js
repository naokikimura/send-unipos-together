const assignedNodes = (slot, options = { flatten: false }) => {
  const nodes = slot.assignedNodes(options);
  return nodes.length ? nodes : Array.from(slot.childNodes);
};

export default class UniposRecipientElement extends HTMLElement {
  static get formAssociated() { return true; }

  constructor() {
    super();
    this.internals = this.attachInternals();
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.getElementById('unipos-recipient');
    shadow.appendChild(document.importNode(template.content, true));
    shadow.getElementById('remove').addEventListener('click', (event) => {
      this.parentNode.removeChild(this);
    });
    const memberSlot = shadow.querySelector('slot[name="member"]');
    memberSlot.addEventListener('slotchange', (event) => {
      this.updateFormValue();
      assignedNodes(memberSlot).forEach(node => {
        new MutationObserver((mutations) => {
          this.updateFormValue();
        }).observe(node, { childList: true, characterData: true, subtree: true });
      });
    });
  }

  updateFormValue() {
    this.internals.setFormValue((this.member || {}).id);
  }

  connectedCallback() {
    this.updateFormValue();
  }

  get name() {
    return this.getAttribute('name');
  }

  set name(value) {
    this.setAttribute('name');
  }

  get member() {
    return assignedNodes(this.shadowRoot.querySelector('slot[name="member"]'))
      .filter(node => node.nodeName === 'UNIPOS-MEMBER' || node.querySelector('unipos-member'))[0].member;
  }
}

window.customElements.define('unipos-recipient', UniposRecipientElement);