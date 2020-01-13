export default class UniposSuggestMembersElement extends HTMLInputElement {
  constructor() {
    super();
    this.findSuggestMembers = (value) => Promise.resolve([]);
    const find = async (...values) => {
      const findBy = async (term) => {
        const result = (await this.findSuggestMembers(term)) || [];
        return result.length === 1 ? result[0] : { display_name: term };
      };
      const terms = values.map(term => term.trim()).filter(term => term !== '');
      return Promise.all(terms.map(findBy));
    };

    this.addEventListener('input', (event) => {
      if (!event.target.list) return;
      this.findSuggestMembers(event.target.value)
        .then((members = []) => {
          const dataList = event.target.list;
          if (!dataList) return;
          const document = dataList.ownerDocument;
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

    this.addEventListener('keypress', (event) => {
      if (!this.recipients) return;
      if (event.key !== 'Enter') return;
      event.preventDefault();
      find(this.value)
        .then(members => {
          this.recipients && this.recipients.appendMember(...members);
          this.value = ''
          if (this.list) this.list.textContent = '';
        });
    });

    this.addEventListener('blur', (event) => {
      if (!this.recipients) return;
      find(this.value)
        .then(members => {
          this.recipients && this.recipients.appendMember(...members);
          this.value = ''
          if (this.list) this.list.textContent = '';
        });
    });

    this.addEventListener('paste', (event) => {
      if (!this.recipients) return;
      if (event.target.value) return;
      event.preventDefault();
      const values = event.clipboardData.getData('text/plain').split(/[\r\n]/);
      find(...values)
        .then(members => {
          this.recipients && this.recipients.appendMember(...members);
        });
    });
  }

  get recipients() {
    const attribute = this.getAttribute('recipients');
    return attribute ? this.ownerDocument.getElementById(attribute) : this.closest('unipos-recipients');
  }
}

window.customElements.define('unipos-suggest-members', UniposSuggestMembersElement, { extends: 'input' });