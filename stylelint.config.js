module.exports = {
  extends: 'stylelint-config-recommended',
  rules: {
    'selector-type-no-unknown': [
      true,
      {
        ignore: ["custom-elements"]
      }
    ],
    'no-descending-specificity': [
      true,
      {
        ignore: ["selectors-within-list"]
      }
    ],
    'selector-pseudo-element-no-unknown': [
      true,
      {
        ignorePseudoElements: ['/^part\\b/']
      }
    ],
    'font-family-no-missing-generic-family-keyword': null,
  }
}
