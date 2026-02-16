import { getFromStorage, incrementAttempt, getAttempt } from '../utils/storage.js';
import { submitSolution } from '../utils/api.js';
import { waitForElement } from '../utils/domUtils.js';
import { showToast, showFallbackPanel } from './shared.js';

(async function() {
  try {
    const isSubmissionsPage = document.querySelector('.status-frame-datatable') !== null;
    if (!isSubmissionsPage) return;

    const config = await getFromStorage(['email', 'groupName', 'groupSheetId', 'githubConnected']);
    const group = config.groupName || config.groupSheetId;
    if (!config.email || !group || !config.githubConnected) return;

    const table = await waitForElement('.status-frame-datatable', 8000);
    if (!table) throw new Error('Table not found');

    const rows = table.querySelectorAll('tr[data-submission-id]');
    if (rows.length === 0) throw new Error('No submission rows found');

    for (const row of rows) {
      const verdictSpan = row.querySelector('.verdict-accepted');
      if (!verdictSpan) continue;

      let actionsCell = row.querySelector('td:last-child');
      if (!actionsCell) continue;
      if (actionsCell.querySelector('.a2sv-sync-btn')) continue;

      actionsCell.style.display = 'flex';
      actionsCell.style.alignItems = 'center';
      actionsCell.style.gap = '8px';

      const wrapper = document.createElement('div');
      wrapper.className = 'a2sv-sync-wrapper';
      wrapper.style.display = 'flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '6px';

      const trialInput = document.createElement('input');
      trialInput.type = 'number';
      trialInput.min = '1';
      trialInput.value = '1';
      trialInput.placeholder = 'Trial #';
      trialInput.style.width = '70px';
      trialInput.style.padding = '2px 6px';
      trialInput.style.border = '1px solid #aaa';
      trialInput.style.borderRadius = '4px';

      const timeInput = document.createElement('input');
      timeInput.type = 'number';
      timeInput.min = '0';
      timeInput.placeholder = 'Min';
      timeInput.style.width = '60px';
      timeInput.style.padding = '2px 6px';
      timeInput.style.border = '1px solid #aaa';
      timeInput.style.borderRadius = '4px';

      const syncBtn = document.createElement('button');
      syncBtn.textContent = '⚡ Sync';
      syncBtn.className = 'a2sv-sync-btn';
      syncBtn.style.cursor = 'pointer';
      syncBtn.style.border = '1px solid #aaa';
      syncBtn.style.borderRadius = '4px';
      syncBtn.style.padding = '2px 6px';
      syncBtn.style.backgroundColor = '#f0f0f0';
      syncBtn.title = 'Sync to A2SV';

      const submissionId = row.getAttribute('data-submission-id');
      const problemLink = row.querySelector('td[data-problemid] a');
      let contestId = null;
      if (problemLink) {
        const href = problemLink.getAttribute('href');
        const match = href.match(/\/contest\/(\d+)\/problem/);
        if (match) contestId = match[1];
      }
      if (!contestId) {
        const urlMatch = window.location.pathname.match(/\/contest\/(\d+)/);
        if (urlMatch) contestId = urlMatch[1];
      }

      const problemName = problemLink ? problemLink.textContent.trim() : 'unknown';
      const problemSlug = problemName.toLowerCase().replace(/\s+/g, '-');

      syncBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        syncBtn.disabled = true;
        syncBtn.textContent = 'Syncing...';

        const trial = parseInt(trialInput.value, 10) || 1;
        const time = parseInt(timeInput.value, 10) || 0;

        if (!contestId || !submissionId) {
          showToast('Missing contest or submission ID', 'error');
          syncBtn.disabled = false;
          syncBtn.textContent = '⚡ Sync';
          return;
        }

        chrome.runtime.sendMessage(
          { type: 'FETCH_CF_CODE', contestId, submissionId },
          async (response) => {
            if (chrome.runtime.lastError || response?.error || !response?.code) {
              showToast('Could not fetch code. Opening fallback...', 'error');
              showFallbackPanel({
                trial,
                time,
                problemTitle: problemName,
                platform: 'codeforces'
              });
              syncBtn.disabled = false;
              syncBtn.textContent = '⚡ Sync';
              return;
            }

            try {
              const res = await submitSolution({
                platform: 'codeforces',
                problemTitle: problemName,
                code: response.code,
                timeTaken: time,
                trial,
                language: 'unknown'
              });
              if (res.success) {
                showToast('Synced!');
                await incrementAttempt('codeforces', problemSlug);
                trialInput.value = (trial + 1).toString();
              } else {
                showToast(res.error || 'Error', 'error');
              }
            } catch (err) {
              showToast(err.message, 'error');
            } finally {
              syncBtn.disabled = false;
              syncBtn.textContent = '⚡ Sync';
            }
          }
        );
      });

      const storedTrial = await getAttempt('codeforces', problemSlug);
      trialInput.value = storedTrial;

      wrapper.appendChild(trialInput);
      wrapper.appendChild(timeInput);
      wrapper.appendChild(syncBtn);
      actionsCell.appendChild(wrapper);
    }

    window.__a2svInjected = true;
  } catch (err) {
    console.warn('A2SV Codeforces injection failed', err);
  }
})();