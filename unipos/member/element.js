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
        id: this.shadowRoot.querySelector('slot[name="id"]').textContent,
        uname: this.shadowRoot.querySelector('slot[name="uname"]').textContent,
        display_name: this.shadowRoot.querySelector('slot[name="display_name"]').textContent,
        picture_url: this.shadowRoot.querySelector('slot[name="picture"] img').src
      };
    }
  };
}