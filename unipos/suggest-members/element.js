export default class UniposSuggestMembersElement extends HTMLInputElement {
  constructor() {
    super();
    this.findSuggestMembers = (value) => Promise.resolve([]);
    this.addEventListener('input', (event) => {
      if (!event.target.list) return;
      this.findSuggestMembers(event.target.value)
        .then(members => {
          const dataList = event.target.list;
          const document = dataList.ownerDocument;
          if (!dataList) return;
          const fragment = members
            .map(member => {
              const option = document.createElement('option');
              option.value = member.uname;
              option.textContent = `${member.display_name} ${member.uname}`
              return option;
            })
            .reduce((parent, child) => {
              parent.appendChild(child);
              return parent;
            }, document.createDocumentFragment());
          dataList.textContent = '';
          dataList.appendChild(fragment);
        });
    });
  }
}

window.customElements.define('unipos-suggest-members', UniposSuggestMembersElement, { extends: 'input' });