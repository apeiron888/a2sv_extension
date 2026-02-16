import { getFromStorage, incrementAttempt, getAttempt } from '../utils/storage.js';
import { submitSolution } from '../utils/api.js';
import { waitForElement } from '../utils/domUtils.js';
import { showToast, showFallbackPanel } from './shared.js';

(async function() {
  try {
    // Check if we are on a submissions page (contains table of submissions)
    const isSubmissionsPage = window.location.pathname.includes('/my') || document.querySelector('.status-frame-datatable');
    if (!isSubmissionsPage) {
      // Not a submissions page, maybe we don't inject here
      return;
    }

    const config = await getFromStorage(['email', 'groupSheetId', 'githubConnected']);
    if (!config.email || !config.groupSheetId || !config.githubConnected) return;

    // Wait for the submissions table
    const table = await waitForElement('.status-frame-datatable', 8000);
    if (!table) throw new Error('Table not found');

    // Get all accepted rows
    const rows = table.querySelectorAll('tr[data-submission-id]');
    for (const row of rows) {
      const verdictCell = row.querySelector('.verdict-accepted');
      if (!verdictCell) continue;

      // Add a sync button in a new cell or append to an existing cell
      const actionsCell = row.querySelector('.status-actions') || row.cells[row.cells.length - 1];
      if (!actionsCell) continue;

      const syncBtn = document.createElement('button');
      syncBtn.textContent = '⚡';
      syncBtn.title = 'Sync to A2SV';
      syncBtn.style.marginLeft = '5px';
      syncBtn.style.cursor = 'pointer';
      syncBtn.className = actionsCell.querySelector('a')?.className || ''; // copy style

      // Extract submission ID and contest ID
      const submissionId = row.getAttribute('data-submission-id');
      const contestId = new URLSearchParams(window.location.search).get('contestId') || window.location.pathname.split('/')[2];

      syncBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        // Open a small inline form or use fallback panel
        // For simplicity, we'll use the fallback panel but pre-fill what we can
        showFallbackPanel({ trial: await getAttempt('codeforces', submissionId) }); // we need problem slug

        // Fetch the code
        chrome.runtime.sendMessage({ type: 'FETCH_CF_CODE', contestId, submissionId }, async (response) => {
          if (response.error) {
            showToast('Failed to fetch code: ' + response.error, 'error');
            return;
          }
          // Fill the code in the fallback panel
          const panel = document.querySelector('#a2sv-fallback-panel');
          if (panel) {
            const codeArea = panel.querySelector('#a2sv-fallback-code');
            codeArea.value = response.code;
          }
        });
      });

      actionsCell.appendChild(syncBtn);
    }

    window.__a2svInjected = true;
  } catch (err) {
    console.warn('A2SV Codeforces injection failed, using fallback', err);
    setTimeout(() => showFallbackPanel(), 2000);
  }
})();