import { getFromStorage, incrementAttempt, getAttempt } from '../utils/storage.js';
import { submitSolution } from '../utils/api.js';
import { waitForElement, getLeetCodeTitle, getLeetCodeCodeAsync } from '../utils/domUtils.js';
import { showToast, showFallbackPanel } from './shared.js';

(async function() {
  try {
    const submitContainer = await waitForElement('[data-e2e-locator="console-submit-button"]', 5000);
    if (!submitContainer) throw new Error('Submit button not found');

    const config = await getFromStorage(['email', 'groupName', 'groupSheetId', 'githubConnected']);
    const group = config.groupName || config.groupSheetId;
    if (!config.email || !group || !config.githubConnected) return;

    const submitButton = submitContainer.tagName === 'BUTTON'
      ? submitContainer
      : submitContainer.querySelector('button');

    const syncContainer = document.createElement('div');
    syncContainer.className = 'a2sv-sync-container';
    syncContainer.style.display = 'flex';
    syncContainer.style.alignItems = 'center';
    syncContainer.style.gap = '6px';
    syncContainer.style.marginLeft = '8px';
    syncContainer.style.padding = '2px 4px';

    const trialInput = document.createElement('input');
    trialInput.type = 'number';
    trialInput.min = '1';
    trialInput.value = '1';
    trialInput.placeholder = 'Trial #';
    trialInput.style.width = '70px';
    trialInput.style.marginRight = '0';
    trialInput.style.padding = '4px 6px';
    trialInput.style.borderRadius = '6px';
    trialInput.style.border = '1px solid var(--border-tertiary, #d0d7de)';

    const timeInput = document.createElement('input');
    timeInput.type = 'number';
    timeInput.min = '0';
    timeInput.placeholder = 'Min';
    timeInput.style.width = '60px';
    timeInput.style.marginRight = '0';
    timeInput.style.padding = '4px 6px';
    timeInput.style.borderRadius = '6px';
    timeInput.style.border = '1px solid var(--border-tertiary, #d0d7de)';

    const syncButton = document.createElement('button');
    syncButton.textContent = 'Sync';
    syncButton.className = submitButton?.className || '';
    syncButton.style.marginLeft = '0';

    const fallbackButton = document.createElement('button');
    fallbackButton.type = 'button';
    fallbackButton.textContent = 'Fallback';
    fallbackButton.className = submitButton?.className || '';

    syncContainer.appendChild(trialInput);
    syncContainer.appendChild(timeInput);
    syncContainer.appendChild(syncButton);
    syncContainer.appendChild(fallbackButton);

    const submitWrapper = submitContainer.parentElement;
    if (submitWrapper) {
      submitWrapper.style.display = 'flex';
      submitWrapper.style.alignItems = 'center';
      submitWrapper.style.gap = '8px';
      submitWrapper.appendChild(syncContainer);
    }

    const problemSlug = window.location.pathname.split('/')[2];

    syncButton.addEventListener('click', async () => {
      syncButton.disabled = true;
      syncButton.textContent = 'Syncing...';

      const title = getLeetCodeTitle();
      const code = await getLeetCodeCodeAsync();
      const trial = parseInt(trialInput.value, 10);
      const time = parseInt(timeInput.value, 10);
      const problemUrl = window.location.origin + window.location.pathname;

      if (!code) {
        showToast('Could not extract code. Opening fallback panel...', 'error');
        showFallbackPanel({ trial, time, problemTitle: title, platform: 'leetcode', problemUrl });
        syncButton.disabled = false;
        syncButton.textContent = 'Sync';
        return;
      }

      try {
        const res = await submitSolution({
          platform: 'leetcode',
          problemTitle: title,
          problemUrl,
          code,
          timeTaken: time,
          trial,
          language: detectLanguage()
        });
        if (res.success) {
          showToast('Synced!');
          await incrementAttempt('leetcode', problemSlug);
          trialInput.value = (trial + 1).toString();
        } else {
          showToast(res.error || 'Error', 'error');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        syncButton.disabled = false;
        syncButton.textContent = 'Sync';
      }
    });

    fallbackButton.addEventListener('click', () => {
      showFallbackPanel({
        trial: parseInt(trialInput.value, 10),
        time: parseInt(timeInput.value, 10),
        problemTitle: getLeetCodeTitle(),
        platform: 'leetcode',
        problemUrl: window.location.origin + window.location.pathname
      });
    });

    const storedTrial = await getAttempt('leetcode', problemSlug);
    trialInput.value = storedTrial;

    window.__a2svInjected = true;
  } catch (err) {
    console.warn('A2SV LeetCode injection failed, using fallback', err);
    setTimeout(() => showFallbackPanel(), 2000);
  }
})();

function detectLanguage() {
  const selector = document.querySelector('[data-cy="lang-select"] .ant-select-selection-item');
  if (selector) {
    const lang = selector.innerText.toLowerCase();
    if (lang.includes('python')) return 'python';
    if (lang.includes('java')) return 'java';
    if (lang.includes('c++')) return 'c++';
    if (lang.includes('javascript')) return 'javascript';
  }
  return 'unknown';
}