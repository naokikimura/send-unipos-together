const assignedNodes = (slot, options = { flatten: false }) => {
  const nodes = slot.assignedNodes(options);
  return nodes.length ? nodes : Array.from(slot.childNodes);
};

class UniposMemberElement extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    const template = document.getElementById('unipos-member');
    shadow.appendChild(document.importNode(template.content, true));
  }

  get member() {
    return {
      id: assignedNodes(this.shadowRoot.querySelector('slot[name="id"]')).reduce((text, node) => text + node.textContent, ''),
      uname: assignedNodes(this.shadowRoot.querySelector('slot[name="uname"]')).reduce((text, node) => text + node.textContent, ''),
      display_name: assignedNodes(this.shadowRoot.querySelector('slot[name="display_name"]')).reduce((text, node) => text + node.textContent, ''),
      picture_url: assignedNodes(this.shadowRoot.querySelector('slot[name="picture"]')).filter(e => e.tagName === 'IMG' || e.querySelector('img'))[0].getAttribute('src')
    };
  }
};

window.customElements.define('unipos-member', UniposMemberElement);

export default UniposMemberElement;