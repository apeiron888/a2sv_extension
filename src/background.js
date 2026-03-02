import { fetchFromBackend } from './utils/config.js';
import { storageSet, storageGet } from './utils/browser.js';

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// ─── Keep-alive: ping backend every 14 minutes to prevent Render cold starts ─
browserAPI.alarms.create('keepAlive', { periodInMinutes: 14 });
browserAPI.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    fetchFromBackend('/ping').catch(() => { });
  }
});

// ─── Message listener ──────────────────────────────────────────────────────────
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SUBMIT') {
    handleSubmit(message.data).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (message.type === 'FETCH_CF_CODE') {
    fetchCodeforcesCode(message.submissionUrl, message.contestId, message.submissionId)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  if (message.type === 'GITHUB_SUCCESS') {
    storageSet({ githubConnected: true }).catch(() => { });
    sendResponse({ ok: true });
  }
  if (message.type === 'GET_CONFIG') {
    storageGet(['email', 'studentName', 'githubHandle', 'groupName', 'groupSheetId', 'githubConnected'])
      .then(sendResponse)
      .catch(() => sendResponse({}));
    return true;
  }
  if (message.type === 'POLL_STATUS') {
    pollSubmissionStatus(message.jobId).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

// ─── Extension icon click ──────────────────────────────────────────────────────
browserAPI.action.onClicked.addListener(() => {
  browserAPI.runtime.openOptionsPage();
});

// ─── Submit handler with timeout and error classification ──────────────────────
async function handleSubmit(data) {
  const controller = new AbortController();
  // Total timeout: 55 s (handles Render cold-start of ~40-50 s)
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    const { response, baseUrl } = await fetchFromBackend('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let json = null;
    try {
      json = await response.json();
    } catch (_) {
      json = {};
    }

    console.log('[A2SV][background][submit]', {
      baseUrl,
      status: response.status,
      ok: response.ok,
      hasJobId: !!json?.jobId,
      success: !!json?.success,
      error: json?.error || null,
    });

    if (!response.ok) {
      // Surface specific backend error messages to the user
      return { error: json.error || `Server error (${response.status})` };
    }

    return json; // { success: true, jobId? } or error
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { error: 'Server took too long to respond. Your submission may still be processing — try the Sync button again in 1 minute.' };
    }
    if (!navigator.onLine) {
      return { error: 'No internet connection. Please check your network and try again.' };
    }
    return { error: `Network error: ${err.message}` };
  }
}

// ─── Poll async job status ─────────────────────────────────────────────────────
async function pollSubmissionStatus(jobId) {
  if (!jobId) return null;
  try {
    const { response: res, baseUrl } = await fetchFromBackend(`/api/submit/status/${jobId}`);
    if (!res.ok) return null;
    const json = await res.json();
    console.log('[A2SV][background][status]', { baseUrl, jobId, status: json?.status || null });
    return json;
  } catch (_) {
    return null;
  }
}

// ─── Codeforces code fetcher ───────────────────────────────────────────────────
async function fetchCodeforcesCode(submissionUrl, contestId, submissionId) {
  const url = submissionUrl || (contestId && submissionId
    ? `https://codeforces.com/contest/${contestId}/submission/${submissionId}`
    : null);
  if (!url) {
    return { error: 'Missing submission URL or contest/submission ID' };
  }
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      if (response.status === 403) {
        return { error: 'Codeforces denied access to the submission. Make sure you are logged in and this submission belongs to you.' };
      }
      return { error: `Codeforces returned HTTP ${response.status}. Try the Fallback button to paste code manually.` };
    }
    const html = await response.text();

    // Try DOM parsing first
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const sourceNode =
        doc.querySelector('#program-source-text') ||
        doc.querySelector('pre.program-source') ||
        doc.querySelector('pre.prettyprint') ||
        doc.querySelector('pre');
      const textareaNode = doc.querySelector('textarea#program-source-text');
      const textContent = (sourceNode && sourceNode.textContent) || (textareaNode && textareaNode.value);
      if (textContent && textContent.trim()) {
        return { code: textContent };
      }
    } catch (_) {
      // fall through to regex
    }

    // Regex fallback
    const match = html.match(/<pre[^>]*id="program-source-text"[^>]*>([\s\S]*?)<\/pre>/i);
    if (match) {
      let text = match[1]
        .replace(/<br\s*\/>/gi, '\n')
        .replace(/<\/pre>/gi, '')
        .replace(/<[^>]+>/g, '');
      text = decodeHtmlEntities(text);
      return { code: text };
    }

    return { error: 'Could not extract code from Codeforces. The submission page may have changed. Use the Fallback button to paste your code manually.' };
  } catch (err) {
    return { error: `Failed to fetch Codeforces code: ${err.message}` };
  }
}

function decodeHtmlEntities(input) {
  if (!input) return '';
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#47;/g, '/');
}