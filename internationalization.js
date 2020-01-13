export default class Internationalization {
  constructor(messages, defaultLocale, ...requestedLocales) {
    // See https://tc39.es/ecma402/#sec-bestavailablelocale
    const bestAvailableLocale = (availableLocales, locale) => {
      let candidate = locale;
      while(true) {
        if (availableLocales.includes(candidate)) return candidate;
        const pos = candidate.lastIndexOf('-');
        if (pos === -1) return undefined;
        candidate = candidate.substring(0, pos);
      }
    };

    // https://tc39.es/ecma402/#sec-lookupmatcher
    const lookupMatcher = (availableLocales, requestedLocales) => {
      for (const locale of requestedLocales) {
        const noExtensionsLocale = (new window.Intl.Locale(locale)).baseName;
        const availableLocale = bestAvailableLocale(availableLocales, noExtensionsLocale);
        if (availableLocale !== undefined) return availableLocale;
      }
      return defaultLocale;
    };
    const locale = lookupMatcher(Object.keys(messages), requestedLocales);
    this._messages = messages[locale.toString()];
  }

  getMessage(messageName) {
    return this._messages[messageName] && this._messages[messageName].message;
  }
}