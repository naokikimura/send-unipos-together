/**
 * 
 * @param availableLocales 
 * @param locale 
 * @see https://tc39.es/ecma402/#sec-bestavailablelocale
 */
function bestAvailableLocale(availableLocales: string[], locale: string): string {
  let candidate = locale;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (availableLocales.includes(candidate)) return candidate;
    const pos = candidate.lastIndexOf('-');
    if (pos === -1) return undefined;
    candidate = candidate.substring(0, pos);
  }
}

/**
 * 
 * @param this 
 * @param availableLocales 
 * @param requestedLocales 
 * @see https://tc39.es/ecma402/#sec-lookupmatcher
 */
function lookupMatcher(this: { defaultLocale: string }, availableLocales: string[], requestedLocales: string[]): string {
  for (const locale of requestedLocales) {
    const noExtensionsLocale = locale.replace(/-u(?:-[0-9a-z]{2,8})+/gi, '');
    const availableLocale = bestAvailableLocale(availableLocales, noExtensionsLocale);
    if (availableLocale !== undefined) return availableLocale;
  }
  return this.defaultLocale;
}

interface Dictionary<T> {
  [key: string]: T;
}

interface Message {
  message: string;
}

type Messages = Dictionary<Message>;

export default class Internationalization {
  private _messages: Messages;
  private _defaultMessages: Messages;
  constructor(messagesDictionary: Dictionary<Messages>, defaultLocale: string, ...requestedLocales: string[]) {
    const locale = lookupMatcher.call({ defaultLocale }, Object.keys(messagesDictionary), requestedLocales);
    this._messages = messagesDictionary[locale] || {};
    this._defaultMessages = messagesDictionary[defaultLocale] || {};
  }

  public getMessage(messageName: string): string {
    const message = this._messages[messageName] && this._messages[messageName].message;
    return message || this._defaultMessages[messageName] && this._defaultMessages[messageName].message;
  }
}
