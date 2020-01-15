window.addEventListener('DOMContentLoaded', (event) => {
  chrome.storage.sync.get(['options'], result => {
    const { point = null, message = '' } = result.options || {};
    document.querySelector<HTMLInputElement>('form#options [name="point"]').value = point === null ? '' : point;
    document.querySelector<HTMLTextAreaElement>('form#options [name="message"]').value = message;
  });

  document.querySelector<HTMLFormElement>('form#options').addEventListener('change', function (event) {
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const options = {
      point: data.get('point'),
      message: data.get('message')
    };
    chrome.storage.sync.set({ options: options });
  });
});