import { measureDohLatency } from "./doh.js";
import { getAbortSignal } from "./config.js";

export async function warmUpConnections(provider, domains) {
	await Promise.all(
		domains.map((domain) =>
			measureDohLatency(provider, domain, getAbortSignal()),
		),
	);
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

export function measureLatencyBatch(provider, domains, isUncached) {
	return Promise.all(
		domains.map((domain) => measureLatency(provider, domain, isUncached)),
	);
}
