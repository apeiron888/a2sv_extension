export function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element not found: ${selector}`));
    }, timeout);
  });
}

export function getLeetCodeTitle() {
  const selectors = [
    '[data-cy="question-title"]',
    '.css-v3d350',
    '.mr-2.text-label-1'
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el.innerText.trim();
  }
  return null;
}

export function getLeetCodeCode() {
  if (window.monaco && window.monaco.editor) {
    const models = window.monaco.editor.getModels();
    if (models.length) {
      const withContent = models
        .map((model) => ({ model, value: model.getValue() }))
        .filter((item) => item.value && item.value.trim().length > 0)
        .sort((a, b) => b.value.length - a.value.length);
      if (withContent.length) return withContent[0].value;
      return models[0].getValue();
    }
  }
  const textarea = document.querySelector('textarea[data-cy="code-area"]');
  if (textarea) return textarea.value;
  const legacyEditor = document.querySelector('.monaco-editor');
  if (legacyEditor && window.monaco && window.monaco.editor) {
    const models = window.monaco.editor.getModels();
    if (models.length) return models[0].getValue();
  }
  return null;
}

export function getLeetCodeCodeAsync(timeout = 2000) {
  const direct = getLeetCodeCode();
  if (direct) return Promise.resolve(direct);

  return new Promise((resolve) => {
    let done = false;

    const handler = (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.source !== 'a2sv' || data.type !== 'LEETCODE_CODE') return;
      done = true;
      window.removeEventListener('message', handler);
      resolve(data.code || null);
    };

    window.addEventListener('message', handler);

    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('leetcodeCodeInjector.js');
    (document.head || document.documentElement).appendChild(script);
    script.addEventListener('load', () => script.remove());
    script.addEventListener('error', () => script.remove());

    setTimeout(() => {
      if (done) return;
      window.removeEventListener('message', handler);
      resolve(null);
    }, timeout);
  });
}