// See https://tc39.es/ecma402/#sec-bestavailablelocale
function bestAvailableLocale(availableLocales, locale) {
  let candidate = locale;
  while (true) {
    if (availableLocales.includes(candidate)) return candidate;
    const pos = candidate.lastIndexOf('-');
    if (pos === -1) return undefined;
    candidate = candidate.substring(0, pos);
  }
};

// https://tc39.es/ecma402/#sec-lookupmatcher
function lookupMatcher(availableLocales, requestedLocales) {
  for (const locale of requestedLocales) {
    const noExtensionsLocale = String(locale).replace(/-u(?:-[0-9a-z]{2,8})+/gi, '');
    const availableLocale = bestAvailableLocale(availableLocales, noExtensionsLocale);
    if (availableLocale !== undefined) return availableLocale;
  }
  return this.defaultLocale;
};

export default class Internationalization {
  constructor(messages, defaultLocale, ...requestedLocales) {
    const locale = lookupMatcher.call({ defaultLocale }, Object.keys(messages), requestedLocales);
    this._messages = messages[locale.toString()] || [];
    this._defaulMessages = messages[defaultLocale] || [];
  }

  getMessage(messageName) {
    const message = this._messages[messageName] && this._messages[messageName].message;
    return message || this._defaulMessages[messageName] && this._defaulMessages[messageName].message;
  }
}