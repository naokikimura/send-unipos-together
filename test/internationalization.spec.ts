import { expect } from 'chai';
import Internationalization from '../src/internationalization';

describe('Internationalization', () => {
  describe('getMessage', () => {
    it('it should return a message', () => {
      const dictionary = {
        de: { hello_world: { message: 'Hallo Welt!' } },
        en: { hello_world: { message: 'Hello World!' } },
        es: { hello_world: { message: 'Hola Mundo!' } },
      };
      const i18n = new Internationalization(dictionary, 'en', 'en');
      const message = i18n.getMessage('hello_world');
      expect(message).to.equal('Hello World!');
    });
  });
});
