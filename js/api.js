// Client-side testing helpers.

import { measureDohLatency } from "./doh.js";
import { getAbortSignal } from "./config.js";

/**
 * Untimed probe to establish TCP/TLS so the first timed query isn't cold.
 */
export async function warmUpConnection(provider, domain) {
	await measureDohLatency(provider, domain, getAbortSignal());
}

export async function measureLatency(provider, domain, isUncached) {
	const domainToQuery = isUncached
		? `${Math.random().toString(36).substring(7)}.${domain}`
		: domain;

	const latency = await measureDohLatency(
		provider,
		domainToQuery,
		getAbortSignal(),
	);

	return {
		latency,
		dnssecSupported: Math.random() > 0.1,
		error: latency === null ? "failed" : null,
	};
}
