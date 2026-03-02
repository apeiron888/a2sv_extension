import { incrementAttempt, getAttempt } from '../utils/storage.js';
import { storageGet } from '../utils/browser.js';
import { submitSolution } from '../utils/api.js';
import { waitForElement, getLeetCodeTitle, getLeetCodeCodeAsync } from '../utils/domUtils.js';
import { fetchRecentAcceptedSubmission } from '../utils/leetcodeApi.js';
import { showToast, showFallbackPanel, monitorSubmissionJob } from './shared.js';

(async function () {
  try {
    const submitContainer = await waitForElement('[data-e2e-locator="console-submit-button"]', 8000);
    if (!submitContainer) throw new Error('Submit button not found after 8 s');

    const config = await storageGet(['email', 'groupName', 'groupSheetId', 'githubConnected']);
    const group = config.groupName || config.groupSheetId;
    if (!config.email || !group || !config.githubConnected) return;

    const submitButton = submitContainer.tagName === 'BUTTON'
      ? submitContainer
      : submitContainer.querySelector('button');

    // ── Build sync UI ──────────────────────────────────────────────────────────
    const syncContainer = document.createElement('div');
    syncContainer.className = 'a2sv-sync-container';
    Object.assign(syncContainer.style, {
      display: 'flex', alignItems: 'center', gap: '6px',
      marginLeft: '8px', padding: '2px 4px',
    });

    const trialInput = document.createElement('input');
    trialInput.type = 'number';
    trialInput.min = '1';
    trialInput.value = '1';
    trialInput.placeholder = 'Trial #';
    Object.assign(trialInput.style, { width: '70px', padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--border-tertiary, #d0d7de)' });

    const timeInput = document.createElement('input');
    timeInput.type = 'number';
    timeInput.min = '0';
    timeInput.placeholder = 'Min';
    Object.assign(timeInput.style, { width: '60px', padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--border-tertiary, #d0d7de)' });

    const syncButton = document.createElement('button');
    syncButton.textContent = '⚡ Sync';
    syncButton.className = submitButton?.className || '';

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

    // Extract slug from URL — more reliable than parsing the title
    const problemSlug = window.location.pathname.split('/').filter(Boolean)[1] || '';

    // ── Sync button handler ────────────────────────────────────────────────────
    syncButton.addEventListener('click', async () => {
      syncButton.disabled = true;
      syncButton.textContent = '⏳ Fetching…';

      const title = getLeetCodeTitle();
      const trial = parseInt(trialInput.value, 10) || 1;
      const time = parseInt(timeInput.value, 10) || 0;
      const problemUrl = window.location.origin + window.location.pathname;

      // 1. Try LeetCode GraphQL API first (LeetSync pattern – most reliable)
      let code = null;
      let language = null;
      const apiResult = await fetchRecentAcceptedSubmission(problemSlug);
      if (apiResult?.code) {
        code = apiResult.code;
        language = apiResult.language;
        console.log('[A2SV][leetcode][code-source]', { source: 'leetcode-api', language });
      } else {
        // 2. Fall back to Monaco DOM extraction
        syncButton.textContent = '⏳ Reading editor…';
        code = await getLeetCodeCodeAsync(3000);
        language = detectLanguage();
        console.log('[A2SV][leetcode][code-source]', { source: 'editor-dom', language });
      }

      if (!code) {
        showToast('Could not read your code — opening manual fallback…', 'error');
        showFallbackPanel({ trial, time, problemTitle: title, platform: 'leetcode', problemUrl });
        syncButton.disabled = false;
        syncButton.textContent = '⚡ Sync';
        return;
      }

      syncButton.textContent = '🚀 Syncing…';
      // Show cold-start notice if needed after 6 s
      const coldStartTimer = setTimeout(() => {
        showToast('Server is waking up — this may take up to 40 s on first request…', 'info', 35000);
      }, 6000);

      try {
        const res = await submitSolution({
          platform: 'leetcode',
          problemTitle: title,
          problemSlug,
          problemUrl,
          code,
          timeTaken: time,
          trial,
          language: language || detectLanguage(),
        });
        clearTimeout(coldStartTimer);
        console.log('[A2SV][submit-response]', { source: 'leetcode', response: res });

        if (res.success) {
          showToast('Processing…', 'info', 2500);
          await incrementAttempt('leetcode', problemSlug);
          trialInput.value = (trial + 1).toString();
          if (res.jobId) {
            monitorSubmissionJob(res.jobId, 'leetcode');
          }
        } else {
          clearTimeout(coldStartTimer);
          console.error('[A2SV][submit-failed]', { source: 'leetcode', response: res });
          showToast('Submission failed. Check console.', 'error', 4500);
        }
      } catch (err) {
        clearTimeout(coldStartTimer);
        console.error('[A2SV][submit-exception]', { source: 'leetcode', error: err?.message || String(err) });
        showToast('Submission failed. Check console.', 'error', 4500);
      } finally {
        syncButton.disabled = false;
        syncButton.textContent = '⚡ Sync';
      }
    });

    fallbackButton.addEventListener('click', () => {
      showFallbackPanel({
        trial: parseInt(trialInput.value, 10) || 1,
        time: parseInt(timeInput.value, 10) || 0,
        problemTitle: getLeetCodeTitle(),
        platform: 'leetcode',
        problemUrl: window.location.origin + window.location.pathname,
      });
    });

    const storedTrial = await getAttempt('leetcode', problemSlug);
    trialInput.value = storedTrial;

    window.__a2svInjected = true;
  } catch (err) {
    console.warn('[A2SV] LeetCode injection failed, showing fallback in 2 s:', err);
    setTimeout(() => showFallbackPanel(), 2000);
  }
})();

// ── Language detection (DOM fallback) ──────────────────────────────────────────
function detectLanguage() {
  const selectors = [
    '[data-cy="lang-select"] .ant-select-selection-item',
    '[data-e2e-locator="lang-select"] .ant-select-selection-item',
    '[data-e2e-locator="lang-select"]',
    'button[data-e2e-locator="lang-select"]',
    '#editor button',
    '[data-track-load="code_editor"] button',
    '[data-cy="lang-select"]',
    '.ant-select-selection-item',
  ];
  const normalize = (t) => t.toLowerCase().replace(/\s+/g, ' ').trim();
  const mapLanguage = (t) => {
    if (!t) return 'unknown';
    if (t.includes('javascript')) return 'javascript';
    if (t.includes('python')) return 'python';
    if (t.includes('c++')) return 'c++';
    if (t.includes('c#') || t.includes('c sharp')) return 'c#';
    if (t.includes('java')) return 'java';
    if (t.includes('golang') || t === 'go' || t.startsWith('go ')) return 'go';
    if (t.includes('kotlin')) return 'kotlin';
    if (t.includes('rust')) return 'rust';
    if (t.includes('php')) return 'php';
    if (t.includes('swift')) return 'swift';
    if (t.includes('typescript')) return 'typescript';
    return 'unknown';
  };

  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) {
        const mapped = mapLanguage(normalize(el.textContent));
        if (mapped !== 'unknown') return mapped;
      }
    } catch (_) { }
  }

  // Broaden search on editor area
  const editorRoot = document.querySelector('#editor') || document.querySelector('[data-track-load="code_editor"]') || document.body;
  const candidates = Array.from(editorRoot.querySelectorAll('button, span'))
    .map(el => normalize(el.textContent || ''))
    .filter(t => t && t.length <= 40);
  for (const t of candidates) {
    const mapped = mapLanguage(t);
    if (mapped !== 'unknown') return mapped;
  }
  return 'unknown';
}