type Translate = (key: string) => string;
type Parse = (value: string) => [string, string][];
interface Options {
  translate?: Translate;
  attributeName?: string;
  parse?: Parse;
}

const i18n = (window.browser || window.chrome || {}).i18n || { getMessage: (): string => undefined };

export default class Localizer {
  private static readonly defaultTranslate: Translate = i18n.getMessage;
  private static readonly defaultAttributeName = 'data-chrome-i18n';
  private static readonly defaultParse: Parse = (value) => {
    return (value || '').split(';').map(text => (text.includes('=') ? text.split('=') : ['', text]) as [string, string]);
  };

  private readonly translate: Translate;
  private readonly attributeName: string;
  private readonly parse: Parse;

  constructor(options: Options = {}) {
    const { translate = Localizer.defaultTranslate, attributeName = Localizer.defaultAttributeName, parse = Localizer.defaultParse } = options;
    this.translate = translate;
    this.attributeName = attributeName;
    this.parse = parse;
  }

  localizeElement(element: Element): void {
    for (const [destination, name] of this.parse(element.getAttribute(this.attributeName))) {
      if (!name) continue;
      const message = this.translate(name);
      if (!destination) {
        element.textContent = message;
      } else {
        element.setAttribute(destination, message);
      }
    }
  }

  localize<T extends Element>(target: Document | T | NodeListOf<T> = window.document): void {
    const nodes = target instanceof NodeList ? target : target.querySelectorAll(`[${CSS.escape(this.attributeName)}]`);
    for (const node of nodes) this.localizeElement(node);
  }
}
