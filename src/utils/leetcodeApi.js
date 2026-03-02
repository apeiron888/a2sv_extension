/**
 * LeetCode GraphQL API utilities.
 * Adapted from LeetSync's approach: query the LeetCode GraphQL API
 * to fetch code directly, bypassing fragile DOM selectors.
 *
 * The GraphQL endpoint is public and uses the user's authenticated
 * browser session (credentials: 'include'), so no extra API key is needed.
 */

const LEETCODE_GRAPHQL = 'https://leetcode.com/graphql';

const RECENT_AC_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      titleSlug
      lang
      timestamp
    }
  }
`;

const SUBMISSION_DETAIL_QUERY = `
  query submissionDetails($submissionId: Int!) {
    submissionDetails(submissionId: $submissionId) {
      code
      lang { name verboseName }
      runtimeDisplay
      memoryDisplay
    }
  }
`;

/**
 * Get the current LeetCode username from the page's global state or DOM.
 * @returns {string|null}
 */
function getLeetCodeUsername() {
    // Try global userslug injected in page scripts
    try {
        if (window.__NEXT_DATA__) {
            const props = window.__NEXT_DATA__?.props?.pageProps;
            if (props?.userSlug) return props.userSlug;
        }
    } catch (_) { }

    // Try meta tag or LeetCode global
    const metaEl = document.querySelector('meta[name="user-login"]');
    if (metaEl) return metaEl.getAttribute('content');

    // Try from the profile link
    const profileLink = document.querySelector('a[href^="/u/"]');
    if (profileLink) {
        const m = profileLink.getAttribute('href').match(/^\/u\/(.+?)\/?$/);
        if (m) return m[1];
    }

    return null;
}

/**
 * Fetch the most recent accepted submission code for a given problem slug.
 * Uses the LeetCode GraphQL API with the user's existing session.
 *
 * @param {string} problemSlug - e.g. "two-sum"
 * @returns {Promise<{code: string, language: string}|null>}
 */
export async function fetchRecentAcceptedSubmission(problemSlug) {
    try {
        const username = getLeetCodeUsername();
        if (!username) return null;

        // Fetch recent accepted submissions
        const listResponse = await fetch(LEETCODE_GRAPHQL, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
            },
            body: JSON.stringify({
                query: RECENT_AC_QUERY,
                variables: { username, limit: 20 },
            }),
        });

        if (!listResponse.ok) return null;
        const listData = await listResponse.json();
        const submissions = listData?.data?.recentAcSubmissionList || [];

        // Find the most recent submission for this problem
        const match = submissions.find(s => s.titleSlug === problemSlug);
        if (!match) return null;

        // Fetch the actual code using the submission ID
        const detailResponse = await fetch(LEETCODE_GRAPHQL, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
            },
            body: JSON.stringify({
                query: SUBMISSION_DETAIL_QUERY,
                variables: { submissionId: parseInt(match.id, 10) },
            }),
        });

        if (!detailResponse.ok) return null;
        const detailData = await detailResponse.json();
        const details = detailData?.data?.submissionDetails;
        if (!details?.code) return null;

        return {
            code: details.code,
            language: details.lang?.name || match.lang || 'unknown',
        };
    } catch (err) {
        console.warn('[A2SV] LeetCode GraphQL API fetch failed:', err.message);
        return null;
    }
}
