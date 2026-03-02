export const BACKEND_URLS = [
	// 'https://companion-u9zk.onrender.com',
	// 'https://a2sv-companion-backend.onrender.com',
	'https://a2sv-companion.onrender.com',
];

export const BACKEND_URL = BACKEND_URLS[0];
let activeBackendUrl = BACKEND_URL;

function getCandidateBackends() {
	const ordered = [activeBackendUrl, ...BACKEND_URLS];
	return [...new Set(ordered.filter(Boolean))];
}

export async function fetchFromBackend(path, options = {}) {
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	let lastError = null;

	for (const base of getCandidateBackends()) {
		try {
			const response = await fetch(`${base}${normalizedPath}`, options);
			activeBackendUrl = base;
			return { response, baseUrl: base };
		} catch (err) {
			lastError = err;
		}
	}

	throw new Error(lastError?.message || 'Unable to reach backend');
}
