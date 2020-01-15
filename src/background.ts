chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        actions: [new chrome.declarativeContent.ShowPageAction()],
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { hostEquals: 'unipos.me', schemes: ['https'] },
          }),
        ],
      },
    ]);
  });
});
