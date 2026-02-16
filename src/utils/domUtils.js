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
    if (models.length) return models[0].getValue();
  }
  const textarea = document.querySelector('textarea[data-cy="code-area"]');
  if (textarea) return textarea.value;
  return null;
}