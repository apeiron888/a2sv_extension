import { getFromStorage, incrementAttempt, getAttempt } from '../utils/storage.js';
import { submitSolution } from '../utils/api.js';
import { waitForElement, getLeetCodeTitle, getLeetCodeCode } from '../utils/domUtils.js';
import { showToast, showFallbackPanel } from './shared.js';

(async function() {
  try {
    const submitContainer = await waitForElement('[data-e2e-locator="console-submit-button"]', 5000);
    if (!submitContainer) throw new Error('Submit button not found');

    const config = await getFromStorage(['email', 'groupName', 'groupSheetId', 'githubConnected']);
    const group = config.groupName || config.groupSheetId;
    if (!config.email || !group || !config.githubConnected) return;

    const syncContainer = document.createElement('div');
    syncContainer.className = 'a2sv-sync-container';
    syncContainer.style.display = 'flex';
    syncContainer.style.alignItems = 'center';
    syncContainer.style.marginLeft = '8px';

    const trialInput = document.createElement('input');
    trialInput.type = 'number';
    trialInput.min = '1';
    trialInput.value = '1';
    trialInput.placeholder = 'Trial #';
    trialInput.style.width = '70px';
    trialInput.style.marginRight = '4px';
    trialInput.className = submitContainer.querySelector('button')?.className || '';

    const timeInput = document.createElement('input');
    timeInput.type = 'number';
    timeInput.min = '0';
    timeInput.placeholder = 'Min';
    timeInput.style.width = '60px';
    timeInput.style.marginRight = '4px';
    timeInput.className = trialInput.className;

    const syncButton = document.createElement('button');
    syncButton.textContent = 'Sync';
    syncButton.className = submitContainer.querySelector('button')?.className || '';
    syncButton.style.marginLeft = '4px';

    syncContainer.appendChild(trialInput);
    syncContainer.appendChild(timeInput);
    syncContainer.appendChild(syncButton);

    submitContainer.parentElement.appendChild(syncContainer);

    const problemSlug = window.location.pathname.split('/')[2];

    syncButton.addEventListener('click', async () => {
      syncButton.disabled = true;
      syncButton.textContent = 'Syncing...';

      const title = getLeetCodeTitle();
      const code = getLeetCodeCode();
      const trial = parseInt(trialInput.value, 10);
      const time = parseInt(timeInput.value, 10);

      if (!code) {
        showToast('Could not extract code. Please use fallback.', 'error');
        syncButton.disabled = false;
        syncButton.textContent = 'Sync';
        return;
      }

      try {
        const res = await submitSolution({
          platform: 'leetcode',
          problemTitle: title,
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