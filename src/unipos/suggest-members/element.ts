import { UniposMember } from '../index';
import UniposRecipientsElement from '../recipients/element.js';

type FindSuggestMembers = (value: string) => UniposMember[] | Promise<UniposMember[]>;

export default class UniposSuggestMembersElement extends HTMLInputElement {
  private _findSuggestMembers: FindSuggestMembers;

  constructor() {
    super();
    this.findSuggestMembers = (): UniposMember[] => [];
    const find = async (...values: string[]): Promise<UniposMember[]> => {
      const findBy = async (term: string): Promise<UniposMember> => {
        const result = (await this.findSuggestMembers(term)) || [];
        return result.length === 1 ? result[0] : { 'display_name': term } as UniposMember;
      };
      const terms = values.map(term => term.trim()).filter(term => term !== '');
      return Promise.all(terms.map(findBy));
    };

    this.addEventListener('input', async () => {
      if (!this.list) return;
      const members = await this.findSuggestMembers(this.value);
      const dataList = this.list;
      if (!dataList) return;
      const document = dataList.ownerDocument;
      const fragment = members
        .map(member => {
          const option = document.createElement('option');
          option.value = member.uname;
          option.textContent = `${member.display_name} ${member.uname}`;
          return option;
        })
        .reduce((parent, child) => {
          parent.appendChild(child);
          return parent;
        }, document.createDocumentFragment());
      dataList.textContent = '';
      dataList.appendChild(fragment);
    });

    this.addEventListener('keypress', event => {
      if (!this.recipients) return;
      if (event.key !== 'Enter') return;
      event.preventDefault();
      find(this.value)
        .then(members => {
          this.recipients && this.recipients.appendMember(...members);
          this.value = '';
          if (this.list) this.list.textContent = '';
        });
    });

    this.addEventListener('blur', () => {
      if (!this.recipients) return;
      find(this.value)
        .then(members => {
          this.recipients && this.recipients.appendMember(...members);
          this.value = '';
          if (this.list) this.list.textContent = '';
        });
    });

    this.addEventListener('paste', event => {
      if (!this.recipients) return;
      if (this.value) return;
      event.preventDefault();
      const values = event.clipboardData.getData('text/plain').split(/[\r\n]/);
      find(...values)
        .then(members => {
          this.recipients && this.recipients.appendMember(...members);
        });
    });
  }

  get recipients(): UniposRecipientsElement {
    const attribute = this.getAttribute('recipients');
    return attribute
      ? this.ownerDocument.getElementById(attribute) as UniposRecipientsElement
      : this.closest<UniposRecipientsElement>('unipos-recipients');
  }

  get findSuggestMembers(): FindSuggestMembers {
    return this._findSuggestMembers;
  }

  set findSuggestMembers(value) {
    this._findSuggestMembers = value;
  }
}

window.customElements.define('unipos-suggest-members', UniposSuggestMembersElement, { extends: 'input' });
