export default function define(template) {
  return class UniposMemberElement extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: "open" });
      const document = template.ownerDocument;
      shadow.appendChild(document.importNode(template.content, true));
    }

    get member() {
      return {
        id: this.shadowRoot.querySelector('slot[name="id"]').assignedElements().reduce((text, node) => text + node.textContent, ''),
        uname: this.shadowRoot.querySelector('slot[name="uname"]').assignedElements().reduce((text, node) => text + node.textContent, ''),
        display_name: this.shadowRoot.querySelector('slot[name="display_name"]').assignedElements().reduce((text, node) => text + node.textContent, ''),
        picture_url: this.shadowRoot.querySelector('slot[name="picture"]').assignedElements().filter(e => e.tagName === 'IMG' || e.querySelector('img'))[0].src
      };
    }
  };
}