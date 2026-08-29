// Statistical helpers for benchmark results.

function escapeHtml(value) {
	const entities = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	};

	return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

export function calculateStats(results) {
	const successful = results.filter((r) => r.latency !== null);
	if (successful.length === 0) {
		return {
			average: 0,
			median: 0,
			stdDev: 0,
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

	const sortedLatencies = [...latencies].sort((a, b) => a - b);
	const mid = Math.floor(sortedLatencies.length / 2);
	const median =
		sortedLatencies.length % 2 !== 0
			? sortedLatencies[mid]
			: (sortedLatencies[mid - 1] + sortedLatencies[mid]) / 2;

	const stdDev = Math.sqrt(
		latencies
			.map((x) => Math.pow(x - average, 2))
			.reduce((a, b) => a + b, 0) / latencies.length,
	);

	return {
		average,
		median,
		stdDev,
		uncachedAvg: uncached.length > 0 ? sum(uncached) / uncached.length : 0,
		cachedAvg: cached.length > 0 ? sum(cached) / cached.length : 0,
		reliability: (successful.length / results.length) * 100,
		dnssec: (dnssecCount / successful.length) * 100,
		count: results.length,
	};
}

export function getMedianRanks(allProviderStats) {
	const ranked = Object.entries(allProviderStats)
		.filter(([, stats]) => stats.count > 0)
		.sort((a, b) => a[1].median - b[1].median);

	const ranks = Object.create(null);
	ranked.forEach(([name], index) => {
		ranks[name] = index + 1;
	});
	return ranks;
}

export function getRecommendation(allProviderStats) {
	const contenders = Object.entries(allProviderStats).filter(
		([, stats]) => stats.count > 0,
	);
	if (contenders.length === 0) return null;

	const scored = contenders
		.map(([name, stats]) => {
			const latencyScore = stats.median;
			const reliabilityPenalty = (100 - stats.reliability) * 10;
			const score = latencyScore + reliabilityPenalty;
			return { name, score, stats };
		})
		.sort((a, b) => a.score - b.score);

	if (scored.length > 0) {
		const winner = scored[0];
		const runnerUp = scored[1];
		const winnerLabel = escapeHtml(winner.name);
		let delta = "";
		if (runnerUp) {
			const gap = runnerUp.stats.median - winner.stats.median;
			if (gap > 0.5) {
				delta = ` That is <strong>${gap.toFixed(0)} ms</strong> faster (median) than ${escapeHtml(
					runnerUp.name,
				)}.`;
			}
		}
		return {
			html: `Based on speed and reliability, <strong>${
				winnerLabel
			}</strong> is the top performer. Typical (median) response <strong>${winner.stats.median.toFixed(
				0,
			)} ms</strong>, average <strong>${winner.stats.average.toFixed(
				0,
			)} ms</strong>, reliability <strong>${winner.stats.reliability.toFixed(
				0,
			)}%</strong>.${delta}`,
			winnerName: winner.name,
			median: winner.stats.median,
			average: winner.stats.average,
			reliability: winner.stats.reliability,
		};
	}
	return null;
}

export function buildShareSummary(allProviderStats, medianRanks, queryCount) {
	const ranked = Object.entries(allProviderStats)
		.filter(([, stats]) => stats.count > 0)
		.sort(
			(a, b) => (medianRanks[a[0]] || 99) - (medianRanks[b[0]] || 99),
		);

	if (ranked.length === 0) return "DNS Bench Pro: no completed results.";

	const lines = [
		"DNS Bench Pro results",
		`Profile: ${queryCount} queries/url`,
		`Date: ${new Date().toISOString().slice(0, 10)}`,
		"",
	];

	ranked.forEach(([name, stats]) => {
		lines.push(
			`#${medianRanks[name]} ${name}: median ${stats.median.toFixed(
				1,
			)} ms, avg ${stats.average.toFixed(1)} ms, reliability ${stats.reliability.toFixed(
				0,
			)}%`,
		);
	});

	lines.push("", "https://dnsbenchpro.netlify.app");
	return lines.join("\n");
}
