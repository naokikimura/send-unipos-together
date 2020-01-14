import UniposAPI from './unipos/api.js';

const newRejectedPromise = (errorConstructor, message) => Promise.reject(new errorConstructor(message));

function promisify(original, makeCallback) {
  function defaultMakeCallback(resolve, reject) {
    return function callback(error, result) {
      if (error)
        reject(error);
      else
        resolve(result);
    }
  }
  return function (...args) {
    const that = this;
    return new Promise(function executor(resolve, reject) {
      original.apply(that, args.concat((makeCallback || defaultMakeCallback)(resolve, reject)));
    });
  };
}

const makeCallback = function (resolve, reject) {
  return function callback(...args) {
    const [results] = args;
    const error = chrome.runtime.lastError;
    if (error)
      reject(error);
    else
      resolve(results);
  };
};

const storageArea = ((global, storageType) => {
  if (global.hasOwnProperty('browser')) {
    return global.browser.storage[storageType];
  } else if (global.hasOwnProperty('chrome')) {
    const storageArea = global.chrome.storage[storageType];
    return new class StorageArea {
      get(keys) { return promisify(storageArea.get.bind(storageArea), makeCallback)(keys); }
      getBytesInUse(keys) { return promisify(storageArea.getBytesInUse.bind(storageArea), makeCallback)(keys); }
      set(keys) { return promisify(storageArea.set.bind(storageArea), makeCallback)(keys); }
      remove(keys) { return promisify(storageArea.remove.bind(storageArea))(keys); }
      clear() { return promisify(storageArea.clear.bind(storageArea), makeCallback)(); }
    }();
  } else {
    const reject = () => newRejectedPromise(ReferenceError, 'browser or chrome is not defined');
    return new class {
      get(keys) { return reject(); }
      getBytesInUse(keys) { return reject(); }
      set(keys) { return reject(); }
      remove(keys) { return reject(); }
      clear() { return reject(); }
    }();
  }
})(window, 'sync');

function executeScriptAsync(...args) {
  if (window.hasOwnProperty('browser'))
    return browser.tabs.executeScript(...args);
  else if (window.hasOwnProperty('chrome'))
    return promisify(chrome.tabs.executeScript.bind(chrome.tabs), makeCallback)(...args);
  else
    return newRejectedPromise(ReferenceError, 'browser or chrome is not defined');
};

const api = new UniposAPI({
  load: () => executeScriptAsync({
    code: "[window.localStorage.getItem('authnToken'), window.localStorage.getItem('refreshToken')]"
  }).then(results => results[0]),

  save: (authnToken, refreshToken) => executeScriptAsync({
    code: `window.localStorage.setItem('authnToken', '${authnToken}'); window.localStorage.setItem('refreshToken', '${refreshToken}');`
  })
});

window.addEventListener('DOMContentLoaded', (event) => {
  const progress = document.getElementById('progress');
  const statusText = document.getElementById('status_text');
  const recipients = document.getElementById('recipients');

  for (const point of document.querySelectorAll('input[is="unipos-point"]')) {
    point.fetchAvailablePoint = async () => {
      try {
        const profile = await api.getProfile();
        return profile && profile.member.pocket.available_point;
      } catch (error) {
        console.error(error);
      }
    };
  }

  for (const suggestMembers of document.querySelectorAll('input[is="unipos-suggest-members"]')) {
    suggestMembers.findSuggestMembers = (value) => api.findSuggestMembers(value, 10).catch(console.error);
  }

  for (const form of document.querySelectorAll('form[is="unipos-card-form"]')) {
    form.fetchProfile = () => api.getProfile();
    form.sendCard = (...args) => api.sendCard(...args);

    form.addEventListener('reset', (event) => {
      progress.value = 0;
      statusText.textContent = '';

      // FIXME:
      for (const node of form.querySelectorAll('input,select,textarea')) {
        node.readOnly = false;
      }
    });

    form.addEventListener('cardsubmit', (event) => {
      progress.max = recipients.members.length;
      statusText.textContent = '';

      // FIXME:
      for (const node of form.querySelectorAll('input,select,textarea')) {
        node.readOnly = true;
      }
    });

    form.addEventListener('cardsubmitted', (event) => {
      window.alert(chrome.i18n.getMessage('m1'));
      form.reset();
    });

    form.addEventListener('cardsubmittingerror', (event) => {
      window.alert(chrome.i18n.getMessage('m4'));
      console.error(error);
    });

    form.addEventListener('send', (event) => {
      const to = event.detail.to;
      progress.value += 1;
      if (!to.id) return event.preventDefault();
      statusText.textContent = chrome.i18n.getMessage('m3', to.display_name);
    });

    form.addEventListener('sendingerror', (event) => {
      event.preventDefault();
      console.error(event);
    });

    form.addEventListener('sent', (event) => {
      console.debug(event);
      const to = event.detail.to;
      console.info(`Sent Unipos to ${to.display_name}`);
    });
  }

  storageArea.get(['options']).then(result => {
    const { recipientMembers = [], point = null, message = '' } = result.options || {};
    recipients.appendMember(...recipientMembers);
    document.querySelector('fieldset#card [name="point"]').value = point === null ? '' : point;
    document.querySelector('fieldset#card [name="message"]').value = message;
  }).catch(console.error);
});