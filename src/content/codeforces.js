import { incrementAttempt, getAttempt } from '../utils/storage.js';
import { submitSolution } from '../utils/api.js';
import { waitForElement } from '../utils/domUtils.js';
import { showToast, showFallbackPanel, monitorSubmissionJob } from './shared.js';
import { sendMessage, storageGet } from '../utils/browser.js';

// ─── Competitive Companion-style URL parser for Codeforces ────────────────────
/**
 * Parses any supported Codeforces URL and extracts structured problem data.
 * Handles all URL formats:
 *   - /contest/{id}/problem/{index}
 *   - /contest/{id}/my  (submissions page)
 *   - /problemset/problem/{contestId}/{index}
 *   - /gym/{id}/problem/{index}
 *   - /group/{groupId}/contest/{contestId}/problem/{index}
 */
class CodeforcesParser {
  constructor() {
    this.hostname = 'https://codeforces.com';
  }

  /**
   * Normalize a problem URL by stripping hash/query and trailing slash.
   * @param {string} url
   */
  normalizeUrl(url) {
    if (!url) return null;
    return url.split('#')[0].split('?')[0].replace(/\/$/, '');
  }

  /**
   * Extract contestId and problemIndex from a problem href.
   * Supports all known Codeforces URL formats.
   * @param {string} href - relative or absolute href
   * @returns {{ contestId: string|null, problemIndex: string|null, type: string }}
   */
  parseProblemHref(href) {
    if (!href) return { contestId: null, problemIndex: null, type: 'unknown' };

    // /contest/{id}/problem/{index}
    let m = href.match(/\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/);
    if (m) return { contestId: m[1], problemIndex: m[2], type: 'contest' };

    // /problemset/problem/{contestId}/{index}
    m = href.match(/\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);
    if (m) return { contestId: m[1], problemIndex: m[2], type: 'problemset' };

    // /gym/{id}/problem/{index}
    m = href.match(/\/gym\/(\d+)\/problem\/([A-Za-z0-9]+)/);
    if (m) return { contestId: m[1], problemIndex: m[2], type: 'gym' };

    // /group/{groupId}/contest/{contestId}/problem/{index}
    m = href.match(/\/group\/\w+\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/);
    if (m) return { contestId: m[1], problemIndex: m[2], type: 'group' };

    return { contestId: null, problemIndex: null, type: 'unknown' };
  }

  /**
   * Infer contestId from the current page URL as a fallback
   * when the problem link uses a relative path.
   */
  getContestIdFromPage() {
    const path = window.location.pathname;
    const m = path.match(/\/contest\/(\d+)/);
    if (m) return m[1];
    const m2 = path.match(/\/problemset\/problem\/(\d+)/);
    if (m2) return m2[1];
    return null;
  }

  /**
   * Build the canonical problem URL from extracted parts.
   */
  buildProblemUrl(parsed) {
    if (!parsed.contestId || !parsed.problemIndex) return null;
    if (parsed.type === 'problemset') {
      return `${this.hostname}/problemset/problem/${parsed.contestId}/${parsed.problemIndex}`;
    }
    return `${this.hostname}/contest/${parsed.contestId}/problem/${parsed.problemIndex}`;
  }
}

// ─── Main injection ────────────────────────────────────────────────────────────
(async function () {
  try {
    const isSubmissionsPage = document.querySelector('.status-frame-datatable') !== null;
    if (!isSubmissionsPage) return;

    const config = await storageGet(['email', 'groupName', 'groupSheetId', 'githubConnected']);
    const group = config.groupName || config.groupSheetId;
    if (!config.email || !group || !config.githubConnected) return;

    const table = await waitForElement('.status-frame-datatable', 8000);
    if (!table) throw new Error('Submissions table not found after 8 s');

    const rows = table.querySelectorAll('tr[data-submission-id]');
    if (rows.length === 0) throw new Error('No submission rows found');

    const headerRow = table.querySelector('tr');
    const headerCells = headerRow ? Array.from(headerRow.querySelectorAll('th, td')) : [];
    const headerIndex = (label) => headerCells.findIndex(c => c.textContent.trim().toLowerCase() === label);
    const langIndex = headerIndex('lang') >= 0 ? headerIndex('lang') : headerIndex('language');

    const parser = new CodeforcesParser();

    for (const row of rows) {
      const verdictSpan = row.querySelector('.verdict-accepted');
      if (!verdictSpan) continue;

      const actionsCell = row.querySelector('td:last-child');
      if (!actionsCell) continue;
      if (actionsCell.querySelector('.a2sv-sync-btn')) continue;

      // ── Build per-row sync UI ────────────────────────────────────────────────
      const wrapper = document.createElement('div');
      wrapper.className = 'a2sv-sync-wrapper';
      Object.assign(wrapper.style, { display: 'flex', alignItems: 'center', gap: '6px' });

      const trialInput = document.createElement('input');
      trialInput.type = 'number'; trialInput.min = '1'; trialInput.value = '1';
      trialInput.placeholder = 'Trial #';
      Object.assign(trialInput.style, { width: '70px', padding: '2px 6px', border: '1px solid #aaa', borderRadius: '4px' });

      const timeInput = document.createElement('input');
      timeInput.type = 'number'; timeInput.min = '0'; timeInput.placeholder = 'Min';
      Object.assign(timeInput.style, { width: '60px', padding: '2px 6px', border: '1px solid #aaa', borderRadius: '4px' });

      const syncBtn = document.createElement('button');
      syncBtn.textContent = '⚡ Sync';
      syncBtn.className = 'a2sv-sync-btn';
      Object.assign(syncBtn.style, {
        cursor: 'pointer', border: '1px solid #aaa', borderRadius: '4px',
        padding: '2px 6px', backgroundColor: '#f0f0f0',
      });
      syncBtn.title = 'Sync to A2SV';

      // ── Parse submission + problem info using the CodeforcesParser ───────────
      const submissionId = row.getAttribute('data-submission-id');
      const submissionLink = row.querySelector('a[href*="/submission/"]');
      const submissionUrl = submissionLink
        ? new URL(submissionLink.getAttribute('href'), window.location.origin).toString()
        : null;

      const problemLink = row.querySelector('td[data-problemid] a') || row.querySelector('a[href*="/problem/"]');
      const problemHref = problemLink ? problemLink.getAttribute('href') : window.location.pathname;
      const parsed = parser.parseProblemHref(problemHref);

      // Fallback: get contestId from the current page URL
      if (!parsed.contestId) {
        parsed.contestId = parser.getContestIdFromPage();
      }

      const problemName = problemLink ? problemLink.textContent.trim() : 'unknown';
      const problemSlug = problemName.toLowerCase().replace(/\s+/g, '-');
      const problemUrl = parser.normalizeUrl(
        problemLink
          ? new URL(problemLink.getAttribute('href'), window.location.origin).toString()
          : parser.buildProblemUrl(parsed)
      );

      const languageCell = langIndex >= 0 ? row.querySelectorAll('td')[langIndex] : null;
      const languageText = languageCell ? languageCell.textContent.trim() : '';

      wrapper.appendChild(trialInput);
      wrapper.appendChild(timeInput);
      wrapper.appendChild(syncBtn);
      actionsCell.appendChild(wrapper);

      // Restore stored trial number
      const storedTrial = await getAttempt('codeforces', problemSlug);
      trialInput.value = storedTrial;

      // ── Sync button click ────────────────────────────────────────────────────
      syncBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        syncBtn.disabled = true;
        syncBtn.textContent = '⏳ Fetching code…';

        const trial = parseInt(trialInput.value, 10) || 1;
        const time = parseInt(timeInput.value, 10) || 0;

        if (!submissionUrl && (!parsed.contestId || !submissionId)) {
          showToast('❌ Could not determine submission URL. Use the Fallback button.', 'error');
          syncBtn.disabled = false;
          syncBtn.textContent = '⚡ Sync';
          return;
        }

        // Fetch code via background (which fetches Codeforces submission page)
        sendMessage({
          type: 'FETCH_CF_CODE',
          submissionUrl,
          contestId: parsed.contestId,
          submissionId,
        }).then(async (response) => {
          if (!response?.code) {
            const errMsg = response?.error || 'Could not fetch code';
            showToast(`❌ ${errMsg}`, 'error', 8000);
            showFallbackPanel({ trial, time, problemTitle: problemName, platform: 'codeforces', problemUrl });
            syncBtn.disabled = false;
            syncBtn.textContent = '⚡ Sync';
            return;
          }

          syncBtn.textContent = '🚀 Syncing…';
          const coldStartTimer = setTimeout(() => {
            showToast('⏳ Server is waking up — this may take up to 40 s on first request…', 'info', 35000);
          }, 6000);

          try {
            const res = await submitSolution({
              platform: 'codeforces',
              problemTitle: problemName,
              problemSlug,
              problemUrl,
              contestId: parsed.contestId,
              problemIndex: parsed.problemIndex,
              code: response.code,
              timeTaken: time,
              trial,
              language: detectCFLanguage(languageText),
            });
            clearTimeout(coldStartTimer);
            console.log('[A2SV][submit-response]', { source: 'codeforces', response: res });

            if (res.success) {
              showToast('Submitting…', 'info', 2500);
              await incrementAttempt('codeforces', problemSlug);
              trialInput.value = (trial + 1).toString();
              if (res.jobId) {
                monitorSubmissionJob(res.jobId, 'codeforces');
              }
            } else {
              console.error('[A2SV][submit-failed]', { source: 'codeforces', response: res });
              showToast('Submission failed. Check console.', 'error', 4500);
            }
          } catch (err) {
            clearTimeout(coldStartTimer);
            console.error('[A2SV][submit-exception]', { source: 'codeforces', error: err?.message || String(err) });
            showToast('Submission failed. Check console.', 'error', 4500);
          } finally {
            syncBtn.disabled = false;
            syncBtn.textContent = '⚡ Sync';
          }
        }).catch(err => {
          showToast(`❌ Extension error: ${err.message}`, 'error');
          syncBtn.disabled = false;
          syncBtn.textContent = '⚡ Sync';
        });
      });
    }

    window.__a2svInjected = true;
  } catch (err) {
    console.warn('[A2SV] Codeforces injection failed:', err);
  }
})();

function detectCFLanguage(text) {
  const lang = (text || '').toLowerCase();
  if (lang.includes('python')) return 'python';
  if (lang.includes('pypy')) return 'python';
  if (lang.includes('java')) return 'java';
  if (lang.includes('c++')) return 'c++';
  if (lang.includes('javascript') || lang.includes('node')) return 'javascript';
  if (lang.includes('typescript')) return 'typescript';
  if (lang.includes('c#')) return 'c#';
  if (lang.includes('kotlin')) return 'kotlin';
  if (lang.includes('go')) return 'go';
  if (lang.includes('rust')) return 'rust';
  if (lang.includes('php')) return 'php';
  return 'unknown';
}