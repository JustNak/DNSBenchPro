import * as dom from "./dom.js";
import { getState, MAX_LATENCY } from "./config.js";
import { buildShareSummary } from "./stats.js";

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

function providerKey(name) {
	return encodeURIComponent(String(name));
}

export function updateConfigSummary() {
	const state = getState();
	const text = `${state.providers.length} providers / ${state.domains.length} sites`;
	if (dom.configSummary) dom.configSummary.textContent = text;
	if (dom.configProvidersCount) {
		dom.configProvidersCount.textContent = String(state.providers.length);
	}
	if (dom.configDomainsCount) {
		dom.configDomainsCount.textContent = String(state.domains.length);
	}
	if (dom.startRoster) {
		dom.startRoster.replaceChildren();
		state.providers.forEach(({ name }) => {
			const item = document.createElement("li");
			item.textContent = name;
			dom.startRoster.appendChild(item);
		});
	}
}

export function setHeroMode(mode) {
	// mode: progress | recommendation | idle
	if (!dom.heroProgress || !dom.heroRecommendation) return;
	dom.heroProgress.hidden = mode !== "progress";
	dom.heroRecommendation.hidden = mode !== "recommendation";
	if (dom.resultsHero) {
		dom.resultsHero.dataset.mode = mode;
	}
}

export function setProgress(progress) {
	const {
		phase = "",
		label = "",
		detail = "",
		overallIndex = 0,
		overallTotal = 1,
	} = progress || {};

	const pct = Math.min(
		100,
		Math.round((overallIndex / Math.max(overallTotal, 1)) * 100),
	);

	if (dom.progressPhase) {
		dom.progressPhase.textContent = phase || "Working";
	}
	if (dom.statusText) {
		dom.statusText.textContent = label;
	}
	if (dom.progressIndicator) {
		dom.progressIndicator.textContent = detail;
	}
	if (dom.progressBarFill) {
		dom.progressBarFill.style.width = `${pct}%`;
		const track = dom.progressBarFill.parentElement;
		if (track && track.getAttribute("role") === "progressbar") {
			track.setAttribute("aria-valuenow", String(pct));
		}
	}
	if (dom.progressPercent) {
		dom.progressPercent.textContent = `${pct}%`;
	}
	if (dom.progressLive) {
		dom.progressLive.textContent = [phase, label, detail]
			.filter(Boolean)
			.join(". ");
	}
}

export function showStatus(text) {
	if (dom.statusText) dom.statusText.textContent = text;
}

export function setRunningControls(isRunning) {
	if (dom.stopTestButton) {
		dom.stopTestButton.hidden = !isRunning;
		dom.stopTestButton.disabled = !isRunning;
	}
	if (dom.runAgainButton) {
		dom.runAgainButton.disabled = isRunning;
	}
	if (dom.editProvidersBtn) dom.editProvidersBtn.disabled = isRunning;
	if (dom.editDomainsBtn) dom.editDomainsBtn.disabled = isRunning;
	if (dom.exportCsvButton) {
		dom.exportCsvButton.disabled = isRunning;
	}
	if (dom.shareResultsButton) {
		dom.shareResultsButton.disabled = isRunning;
	}
}

export function createInitialUI() {
	const state = getState();
	dom.mainGraphContainer.innerHTML = "";
	dom.detailedGraphsContainer.innerHTML = "";
	dom.errorSummary.style.display = "none";
	if (dom.recommendationSection) {
		dom.recommendationSection.style.display = "none";
	}
	dom.exportCsvButton.style.display = "none";
	if (dom.shareResultsButton) dom.shareResultsButton.style.display = "none";
	dom.comparisonContent.innerHTML = `<p class="empty-state">Results will appear here after a full run.</p>`;
	setHeroMode("progress");
	setProgress({
		phase: "Ready",
		label: "Waiting to start…",
		detail: "",
		overallIndex: 0,
		overallTotal: 1,
	});

	state.providers.forEach(({ name }) => {
		const color = state.providerColors[name];
		const safeName = providerKey(name);

		dom.mainGraphContainer.innerHTML += `
            <div class="graph-bar-wrapper" id="wrapper-${safeName}">
                <div class="dns-name">${escapeHtml(name)}</div>
                <div class="bar-container">
                    <div class="bar" id="bar-${safeName}" style="background-color: ${color};"></div>
                </div>
                <div class="latency-value" id="latency-${safeName}">-</div>
            </div>`;

		dom.detailedGraphsContainer.innerHTML += `
            <div class="dns-card" id="card-${safeName}" style="--provider: ${color}">
                <div class="card-header">
                    <div class="card-title-section">
                        <h3 class="card-title">${escapeHtml(name)}</h3>
                    </div>
                    <div class="card-stats" id="stats-${safeName}">Waiting</div>
                </div>
                <div class="detailed-results" id="results-${safeName}">
                    <div class="detailed-row header">
                        <span class="domain-name">Domain</span>
                        <div class="latency-pair">
                            <span class="detailed-latency cached">Cached</span>
                            <span class="detailed-latency uncached">Uncached</span>
                        </div>
                    </div>
                </div>
            </div>`;
	});
}

export function displayDetailedBreakdown(providerName, breakdownData) {
	const safeProviderName = providerKey(providerName);
	const container = document.getElementById(`results-${safeProviderName}`);
	if (!container) return;

	for (const domain of getState().domains) {
		const stats = breakdownData[domain];
		if (!stats) continue;

		const row = document.createElement("div");
		row.className = "detailed-row";

		const cachedAvgHtml =
			stats.cachedAvg !== null
				? `<span class="detailed-latency cached">${stats.cachedAvg.toFixed(
						0,
				  )}</span>`
				: `<span class="detailed-latency na">n/a</span>`;

		const uncachedAvgHtml =
			stats.uncachedAvg !== null
				? `<span class="detailed-latency uncached">${stats.uncachedAvg.toFixed(
						0,
				  )}</span>`
				: `<span class="detailed-latency na">n/a</span>`;

		row.innerHTML = `
            <strong class="domain-name">${escapeHtml(domain)}</strong>
            <div class="latency-pair">
                ${cachedAvgHtml}
                ${uncachedAvgHtml}
            </div>
        `;
		container.appendChild(row);
	}
}

export function updateMainGraph(name, latency) {
	const safeName = providerKey(name);
	const bar = document.getElementById(`bar-${safeName}`);
	const latencyEl = document.getElementById(`latency-${safeName}`);
	if (bar && latencyEl) {
		const width = Math.min(100, (latency / MAX_LATENCY) * 100);
		bar.style.width = `${width}%`;
		latencyEl.textContent = `${latency.toFixed(0)} ms`;
	}
}

export function updateCardStats(name, allStats) {
	const safeName = providerKey(name);
	const statsEl = document.getElementById(`stats-${safeName}`);
	if (statsEl && allStats.count > 0) {
		statsEl.innerHTML = `Median: <strong>${allStats.median.toFixed(
			0,
		)}ms</strong> · Avg: <strong>${allStats.average.toFixed(0)}ms</strong>`;
	}
}

export function showCard(name) {
	const safeName = providerKey(name);
	const card = document.getElementById(`card-${safeName}`);
	if (card) card.classList.add("visible");
}

export function createComparisonTable(allProviderStats, medianRanks) {
	const state = getState();
	if (Object.keys(allProviderStats).length === 0) return;

	const tableData = Object.entries(allProviderStats)
		.filter(([, stats]) => stats.count > 0)
		.map(([name, stats]) => ({
			name,
			medianRank: medianRanks[name] || 99,
			...stats,
		}));

	let currentSortKey = "median";
	let isSortAscending = true;

	const headers = [
		{ key: "medianRank", label: "Rank", sortable: true },
		{ key: "name", label: "Provider", sortable: true },
		{ key: "median", label: "Median", sortable: true },
		{ key: "average", label: "Avg Latency", sortable: true },
		{ key: "cachedAvg", label: "Cached Avg", sortable: true },
		{ key: "uncachedAvg", label: "Uncached Avg", sortable: true },
		{ key: "stdDev", label: "Std Deviation", sortable: true },
		{ key: "reliability", label: "Reliability", sortable: true },
	];

	function handleHeaderClick(e) {
		const newSortKey = e.currentTarget.dataset.sortKey;
		if (!newSortKey) return;

		if (newSortKey === currentSortKey) {
			isSortAscending = !isSortAscending;
		} else {
			currentSortKey = newSortKey;
			isSortAscending = newSortKey === "name" ? true : true;
			if (
				["median", "average", "cachedAvg", "uncachedAvg", "stdDev", "medianRank"].includes(
					newSortKey,
				)
			) {
				isSortAscending = true;
			}
		}
		renderTable();
	}

	function attachHeaderListeners() {
		document
			.querySelectorAll(".comparison-table th[data-sort-key]")
			.forEach((th) => {
				th.addEventListener("click", handleHeaderClick);
				th.addEventListener("keydown", (e) => {
					if (e.key !== "Enter" && e.key !== " ") return;
					e.preventDefault();
					handleHeaderClick(e);
				});
			});
	}

	function renderTable() {
		tableData.sort((a, b) => {
			const valA = a[currentSortKey];
			const valB = b[currentSortKey];
			if (typeof valA === "string") {
				return isSortAscending
					? valA.localeCompare(valB)
					: valB.localeCompare(valA);
			}
			if (valA < valB) return isSortAscending ? -1 : 1;
			if (valA > valB) return isSortAscending ? 1 : -1;
			return 0;
		});

		let tableHTML = `<table class="comparison-table"><thead><tr>`;

		headers.forEach((header) => {
			const isSorted = header.key === currentSortKey;
			const sortIndicator = isSorted
				? `<span class="sort-indicator" aria-hidden="true">${
						isSortAscending ? "▲" : "▼"
				  }</span>`
				: "";
			const sortedClass = isSorted ? "sorted" : "";
			const ariaSort = isSorted
				? isSortAscending
					? 'aria-sort="ascending"'
					: 'aria-sort="descending"'
				: 'aria-sort="none"';
			const sortableAttr = header.sortable
				? `data-sort-key="${header.key}" tabindex="0" role="columnheader" ${ariaSort}`
				: "";
			tableHTML += `<th class="${sortedClass}" ${sortableAttr}>${header.label}${sortIndicator}</th>`;
		});

		tableHTML += `</tr></thead><tbody>`;

		tableData.forEach((stats) => {
			const rank = stats.medianRank;
			const rankClass = rank <= 3 ? `rank-${rank}` : "";
			tableHTML += `
                <tr style="border-left: 4px solid ${
					state.providerColors[stats.name]
				};">
                    <td><span class="rank-badge ${rankClass}">#${rank}</span></td>
                    <td class="provider-cell">${escapeHtml(stats.name)}</td>
                    <td class="emphasis">${stats.median.toFixed(1)} ms</td>
                    <td>${stats.average.toFixed(1)} ms</td>
                    <td class="cached-cell">${stats.cachedAvg.toFixed(1)} ms</td>
                    <td class="uncached-cell">${stats.uncachedAvg.toFixed(
						1,
					)} ms</td>
                    <td>&plusmn;${stats.stdDev.toFixed(1)} ms</td>
                    <td>${stats.reliability.toFixed(1)}%</td>
                </tr>`;
		});

		tableHTML += "</tbody></table>";
		dom.comparisonContent.innerHTML = tableHTML;
		attachHeaderListeners();
	}

	renderTable();
}

export function displayRecommendation(recommendation, incomplete = false) {
	if (!recommendation) {
		setHeroMode("progress");
		return;
	}

	dom.recommendationText.innerHTML = incomplete
		? `<strong>Incomplete run.</strong> ${recommendation.html}`
		: recommendation.html;

	if (dom.recommendationMeta) {
		dom.recommendationMeta.replaceChildren();
		const facts = [
			["Resolver", recommendation.winnerName],
			["Median", `${recommendation.median.toFixed(0)} ms`],
			["Reliability", `${recommendation.reliability.toFixed(0)}%`],
		];
		facts.forEach(([label, value]) => {
			const fact = document.createElement("div");
			fact.className = "rec-fact";
			const term = document.createElement("dt");
			term.textContent = label;
			const detail = document.createElement("dd");
			detail.textContent = value;
			fact.append(term, detail);
			dom.recommendationMeta.appendChild(fact);
		});
	}

	setHeroMode("recommendation");
	if (dom.recommendationSection) {
		dom.recommendationSection.style.display = "none";
	}
}

export function showIncompleteState(message) {
	setHeroMode("recommendation");
	dom.recommendationText.innerHTML = message;
	if (dom.recommendationMeta) dom.recommendationMeta.innerHTML = "";
}

export function exportToCSV(allProviderStats) {
	const escapeCsvCell = (value) => {
		let text = String(value);
		if (/^[=+\-@]/.test(text)) text = `'${text}`;
		return `"${text.replace(/"/g, '""')}"`;
	};
	const headers = [
		"Provider",
		"Avg Latency",
		"Median Latency",
		"Std Deviation",
		"Uncached Avg",
		"Cached Avg",
		"Reliability",
		"DNSSEC Support",
	].map(escapeCsvCell);
	const rows = Object.entries(allProviderStats).map(([name, stats]) =>
		[
			name,
			stats.average.toFixed(2),
			stats.median.toFixed(2),
			stats.stdDev.toFixed(2),
			stats.uncachedAvg.toFixed(2),
			stats.cachedAvg.toFixed(2),
			stats.reliability.toFixed(2),
			stats.dnssec.toFixed(2),
		]
			.map(escapeCsvCell)
			.join(","),
	);

	const csv = [headers.join(","), ...rows].join("\n");
	const link = document.createElement("a");
	link.setAttribute(
		"href",
		"data:text/csv;charset=utf-8," + encodeURIComponent(csv),
	);
	link.setAttribute("download", "dns_benchmark_results.csv");
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

export async function shareResults() {
	const state = getState();
	const text = buildShareSummary(
		state.allProviderStats,
		state.medianRanks,
		state.lastQueryCount || "?",
	);

	try {
		if (navigator.share) {
			await navigator.share({
				title: "DNS Bench Pro results",
				text,
			});
			return;
		}
	} catch (err) {
		if (err && err.name === "AbortError") return;
	}

	try {
		await navigator.clipboard.writeText(text);
		showStatus("Results copied to clipboard.");
	} catch {
		showStatus("Unable to share automatically. Use Export to CSV instead.");
	}
}

export function refreshDurationEstimates(estimateFn) {
	document.querySelectorAll(".duration-btn").forEach((btn) => {
		const queries = parseInt(btn.dataset.queries, 10);
		const slot = btn.querySelector("[data-estimate]");
		if (slot && estimateFn) {
			slot.textContent = estimateFn(queries);
		}
	});
}
