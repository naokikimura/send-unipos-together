import Localizer from "./localizer.js";

const localizer = new Localizer();

window.addEventListener('DOMContentLoaded', () => {
  localizer.localize();

  browser.storage.sync.get(['options']).then(result => {
    const { point = null, message = '' } = result.options || {};
    document.querySelector<HTMLInputElement>('form#options [name="point"]').value = point === null ? '' : point;
    document.querySelector<HTMLTextAreaElement>('form#options [name="message"]').value = message;
  });

  document.querySelector<HTMLFormElement>('form#options').addEventListener('change', event => {
    const form = event.currentTarget as HTMLFormElement;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const options = {
      message: data.get('message'),
      point: data.get('point'),
    };
    browser.storage.sync.set({ options });
  });
});
