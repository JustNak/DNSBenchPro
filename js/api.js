// frontend/js/api.js
// Handles client-side testing logic.

import { measureDohLatency } from "./doh.js";

/**
 * Sends a single, untimed query to a provider.
 * The purpose is to establish a TCP/TLS connection so that the first
 * "real" test isn't slowed down by initial connection overhead.
 * The result of this query is intentionally ignored.
 */
export async function warmUpConnection(provider, domain) {
	// This sends a query just to establish a connection.
	// It does not affect the 'queriedDomains' set used in the main test.
	await measureDohLatency(provider, domain);
}

export async function measureLatency(provider, domain, isUncached) {
	const domainToQuery = isUncached
		? `${Math.random().toString(36).substring(7)}.${domain}`
		: domain;

	// Pass the entire provider object, not just the URL
	const latency = await measureDohLatency(provider, domainToQuery);

	return {
		latency: latency,
		dnssecSupported: Math.random() > 0.1, // Still simulating this for UI
		error: latency === null ? "failed" : null,
	};
}
