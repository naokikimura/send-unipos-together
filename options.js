window.addEventListener('DOMContentLoaded', (event) => {
  chrome.storage.sync.get(['options'], result => {
    const { point = null, message = '' } = result.options || {};
    document.querySelector('form#options [name="point"]').value = point === null ? '' : point;
    document.querySelector('form#options [name="message"]').value = message;
  });

  document.querySelector('form#options').addEventListener('change', (event) => {
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const options = {
      point: data.get('point'),
      message: data.get('message')
    };
    chrome.storage.sync.set({ options: options });
  });
});