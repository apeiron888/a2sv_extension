import { getFromStorage, incrementAttempt, getAttempt } from '../utils/storage.js';
import { submitSolution } from '../utils/api.js';
import { waitForElement } from '../utils/domUtils.js';
import { showToast, showFallbackPanel } from './shared.js';

(async function() {
  try {
    // Check if we are on a submissions page (contains the status table)
    const isSubmissionsPage = document.querySelector('.status-frame-datatable') !== null;
    if (!isSubmissionsPage) {
      // Not a submissions page, do nothing
      return;
    }

    const config = await getFromStorage(['email', 'groupSheetId', 'githubConnected']);
    if (!config.email || !config.groupSheetId || !config.githubConnected) return;

    // Wait for the submissions table
    const table = await waitForElement('.status-frame-datatable', 8000);
    if (!table) throw new Error('Table not found');

    // Get all rows with data-submission-id (accepted or not)
    const rows = table.querySelectorAll('tr[data-submission-id]');
    if (rows.length === 0) throw new Error('No submission rows found');

    // For each row, check if it's accepted
    for (const row of rows) {
      // Find the verdict cell – it contains a span with class "verdict-accepted"
      const verdictSpan = row.querySelector('.verdict-accepted');
      if (!verdictSpan) continue; // not accepted, skip

      // This is an accepted submission – add a sync button
      // Find the last cell (actions column) or create a new one
      let actionsCell = row.querySelector('td:last-child');
      if (!actionsCell) continue;

      // Check if we already added a button (avoid duplicates)
      if (actionsCell.querySelector('.a2sv-sync-btn')) continue;

      // Create sync button
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

      // Extract submission ID and contest ID
      const submissionId = row.getAttribute('data-submission-id');
      // Contest ID can be found from the problem link
      const problemLink = row.querySelector('td[data-problemid] a');
      let contestId = null;
      if (problemLink) {
        const href = problemLink.getAttribute('href');
        const match = href.match(/\/contest\/(\d+)\/problem/);
        if (match) contestId = match[1];
      }
      if (!contestId) {
        // Fallback: try to get from URL
        const urlMatch = window.location.pathname.match(/\/contest\/(\d+)/);
        if (urlMatch) contestId = urlMatch[1];
      }

      // Get problem name for attempt tracking
      const problemName = problemLink ? problemLink.textContent.trim() : 'unknown';
      const problemSlug = problemName.toLowerCase().replace(/\s+/g, '-');

      syncBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Disable button temporarily
        syncBtn.disabled = true;
        syncBtn.textContent = '...';

        // Show fallback panel with pre-filled trial number
        const trial = await getAttempt('codeforces', problemSlug);
        showFallbackPanel({ trial, problemTitle: problemName, platform: 'codeforces' });

        // Fetch the code from the submission page
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
              // Fill the code in the fallback panel
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

    // Mark successful injection
    window.__a2svInjected = true;
  } catch (err) {
    console.warn('A2SV Codeforces injection failed, using fallback', err);
    setTimeout(() => showFallbackPanel(), 2000);
  }
})();