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

      const syncBtn = document.createElement('button');
      syncBtn.textContent = '⚡ Sync';
      syncBtn.className = 'a2sv-sync-btn';
      syncBtn.style.marginLeft = '8px';
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
        syncBtn.textContent = '...';

        const trial = await getAttempt('codeforces', problemSlug);
        showFallbackPanel({ trial, problemTitle: problemName, platform: 'codeforces' });

        if (!contestId || !submissionId) {
          showToast('Missing contest or submission ID', 'error');
          syncBtn.disabled = false;
          syncBtn.textContent = '⚡ Sync';
          return;
        }

        chrome.runtime.sendMessage(
          { type: 'FETCH_CF_CODE', contestId, submissionId },
          (response) => {
            if (chrome.runtime.lastError) {
              showToast('Error fetching code', 'error');
            } else if (response.error) {
              showToast(response.error, 'error');
            } else {
              const panel = document.querySelector('#a2sv-fallback-panel');
              if (panel) {
                const codeArea = panel.querySelector('#a2sv-fallback-code');
                if (codeArea) codeArea.value = response.code;
              }
            }
            syncBtn.disabled = false;
            syncBtn.textContent = '⚡ Sync';
          }
        );
      });

      actionsCell.appendChild(syncBtn);
    }

    window.__a2svInjected = true;
  } catch (err) {
    console.warn('A2SV Codeforces injection failed, using fallback', err);
    setTimeout(() => showFallbackPanel(), 2000);
  }
})();