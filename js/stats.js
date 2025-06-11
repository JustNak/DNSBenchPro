// frontend/js/stats.js
// Contains pure functions for performing statistical calculations on test data.

export function calculateStats(results) {
	const successful = results.filter((r) => r.latency !== null);
	if (successful.length === 0) {
		return {
			average: 0,
			median: 0, // Add median
			stdDev: 0, // Add stdDev
			uncachedAvg: 0,
			cachedAvg: 0,
			reliability: 0,
			dnssec: 0,
			count: 0,
		};
	}

	const latencies = successful.map((r) => r.latency);
	const uncached = successful
		.filter((r) => r.isUncached)
		.map((r) => r.latency);
	const cached = successful
		.filter((r) => !r.isUncached)
		.map((r) => r.latency);
	const dnssecCount = successful.filter((r) => r.dnssecSupported).length;

	const sum = (arr) => arr.reduce((acc, val) => acc + val, 0);
	const average = sum(latencies) / latencies.length;

	// --- FIX: Calculate Median ---
	const sortedLatencies = [...latencies].sort((a, b) => a - b);
	const mid = Math.floor(sortedLatencies.length / 2);
	const median =
		sortedLatencies.length % 2 !== 0
			? sortedLatencies[mid]
			: (sortedLatencies[mid - 1] + sortedLatencies[mid]) / 2;

	// --- FIX: Calculate Standard Deviation ---
	const stdDev = Math.sqrt(
		latencies
			.map((x) => Math.pow(x - average, 2))
			.reduce((a, b) => a + b) / latencies.length,
	);

	return {
		average: average,
		median: median,
		stdDev: stdDev,
		uncachedAvg: uncached.length > 0 ? sum(uncached) / uncached.length : 0,
		cachedAvg: cached.length > 0 ? sum(cached) / cached.length : 0,
		reliability: (successful.length / results.length) * 100,
		dnssec: (dnssecCount / successful.length) * 100,
		count: results.length,
	};
}

export function getRecommendation(allProviderStats) {
	const contenders = Object.entries(allProviderStats).filter(
		([_, stats]) => stats.count > 0,
	);
	if (contenders.length === 0) return null;

	const scored = contenders
		.map(([name, stats]) => {
			// --- FIX: Use the more stable median for scoring ---
			const latencyScore = stats.median;
			const reliabilityPenalty = (100 - stats.reliability) * 10;
			const score = latencyScore + reliabilityPenalty;
			return { name, score, stats };
		})
		.sort((a, b) => a.score - b.score);

	if (scored.length > 0) {
		const winner = scored[0];
		// --- FIX: Report both average and median in the recommendation ---
		return `Based on a balance of speed and reliability, <strong>${
			winner.name
		}</strong> is the top performer. It showed a typical (median) response time of <strong>${winner.stats.median.toFixed(
			0,
		)} ms</strong> and an average of <strong>${winner.stats.average.toFixed(
			0,
		)} ms</strong>.`;
	}
	return null;
}