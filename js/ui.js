// frontend/js/ui.js
// Manages all direct DOM manipulation and UI updates.

import * as dom from "./dom.js";
import { getState, MAX_LATENCY } from "./config.js";

export function createInitialUI() {
	const state = getState();
	dom.mainGraphContainer.innerHTML = "";
	dom.detailedGraphsContainer.innerHTML = "";
	dom.errorSummary.style.display = "none";
	dom.recommendationSection.style.display = "none";
	dom.exportCsvButton.style.display = "none";
	dom.comparisonContent.innerHTML = `<p style="text-align: center; color: var(--text-muted);">Run a test to see detailed comparison data</p>`;

	state.providers.forEach(({ name }) => {
		const color = state.providerColors[name];
		const safeName = name.replace(/\s+/g, "-");

		dom.mainGraphContainer.innerHTML += `
            <div class="graph-bar-wrapper" id="wrapper-${safeName}">
                <div class="dns-name">${name}</div>
                <div class="bar-container">
                    <div class="bar" id="bar-${safeName}" style="background-color: ${color};"></div>
                </div>
                <div class="latency-value" id="latency-${safeName}">- ms</div>
            </div>`;

		dom.detailedGraphsContainer.innerHTML += `
            <div class="dns-card" id="card-${safeName}">
                <div class="card-header">
                    <div class="card-title-section">
                        <span class="card-color-dot" style="background-color: ${color};"></span>
                        <h3 class="card-title">${name}</h3>
                    </div>
                    <div class="card-stats" id="stats-${safeName}">Waiting...</div>
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
	const safeProviderName = providerName.replace(/\s+/g, "-");
	const container = document.getElementById(`results-${safeProviderName}`);
	if (!container) return;

	// Start after the header row
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
				: `<span class="detailed-latency na">-</span>`;

		const uncachedAvgHtml =
			stats.uncachedAvg !== null
				? `<span class="detailed-latency uncached">${stats.uncachedAvg.toFixed(
						0,
				  )}</span>`
				: `<span class="detailed-latency na">-</span>`;

		row.innerHTML = `
            <strong class="domain-name">${domain}</strong>
            <div class="latency-pair">
                ${cachedAvgHtml}
                ${uncachedAvgHtml}
            </div>
        `;
		container.appendChild(row);
	}
}

export function updateMainGraph(name, latency) {
	const safeName = name.replace(/\s+/g, "-");
	const bar = document.getElementById(`bar-${safeName}`);
	const latencyEl = document.getElementById(`latency-${safeName}`);
	if (bar && latencyEl) {
		const width = Math.min(100, (latency / MAX_LATENCY) * 100);
		bar.style.width = `${width}%`;
		latencyEl.textContent = `${latency.toFixed(0)} ms`;
	}
}

export function updateCardStats(name, allStats) {
	const safeName = name.replace(/\s+/g, "-");
	const statsEl = document.getElementById(`stats-${safeName}`);
	if (statsEl && allStats.count > 0) {
		statsEl.innerHTML = `Median: <strong>${allStats.median.toFixed(
			0,
		)}ms</strong> | Avg: <strong>${allStats.average.toFixed(0)}ms</strong>`;
	}
}

export function showCard(name) {
	const safeName = name.replace(/\s+/g, "-");
	const card = document.getElementById(`card-${safeName}`);
	if (card) card.classList.add("visible");
}

// --- FIX: Complete overhaul of the comparison table function ---
export function createComparisonTable(allProviderStats) {
	const state = getState();
	if (Object.keys(allProviderStats).length === 0) return;

	// Convert stats object to an array for easier sorting
	const tableData = Object.entries(allProviderStats)
		.filter(([_, stats]) => stats.count > 0)
		.map(([name, stats]) => ({ name, ...stats }));

	let currentSortKey = "median";
	let isSortAscending = true;

	const headers = [
		{ key: "rank", label: "Rank" },
		{ key: "name", label: "Provider" },
		{ key: "median", label: "Median" },
		{ key: "average", label: "Avg Latency" },
		{ key: "cachedAvg", label: "Cached Avg" },
		{ key: "uncachedAvg", label: "Uncached Avg" },
		{ key: "stdDev", label: "Std Deviation" },
		{ key: "reliability", label: "Reliability" },
	];

	function handleHeaderClick(e) {
		const newSortKey = e.currentTarget.dataset.sortKey;
		if (!newSortKey) return;

		if (newSortKey === currentSortKey) {
			isSortAscending = !isSortAscending;
		} else {
			currentSortKey = newSortKey;
			isSortAscending = true;
		}
		renderTable();
	}

	function attachHeaderListeners() {
		const headerElements = document.querySelectorAll(
			".comparison-table th[data-sort-key]",
		);
		headerElements.forEach((th) => {
			th.addEventListener("click", handleHeaderClick);
		});
	}

	function renderTable() {
		// Sort the data
		tableData.sort((a, b) => {
			const valA = a[currentSortKey];
			const valB = b[currentSortKey];

			if (valA < valB) return isSortAscending ? -1 : 1;
			if (valA > valB) return isSortAscending ? 1 : -1;
			return 0;
		});

		// Build the table HTML
		let tableHTML = `<table class="comparison-table"><thead><tr>`;

		headers.forEach((header) => {
			const isSorted = header.key === currentSortKey;
			const sortIndicator = isSorted
				? `<span class="sort-indicator">${
						isSortAscending ? "▲" : "▼"
				  }</span>`
				: "";
			const sortedClass = isSorted ? "sorted" : "";
			// Only add data-sort-key to sortable columns
			const sortableAttr =
				header.key !== "rank" ? `data-sort-key="${header.key}"` : "";
			tableHTML += `<th class="${sortedClass}" ${sortableAttr}>${header.label}${sortIndicator}</th>`;
		});

		tableHTML += `</tr></thead><tbody>`;

		tableData.forEach((stats, index) => {
			const rank = index + 1;
			const rankClass = rank <= 3 ? `rank-${rank}` : "";
			tableHTML += `
                <tr style="border-left: 4px solid ${
					state.providerColors[stats.name]
				};">
                    <td><span class="rank-badge ${rankClass}">#${rank}</span></td>
                    <td style="font-weight: 600;">${stats.name}</td>
                    <td style="font-weight: 700;">${stats.median.toFixed(
						1,
					)} ms</td>
                    <td>${stats.average.toFixed(1)} ms</td>
                    <td style="color: var(--success-color);">${stats.cachedAvg.toFixed(
						1,
					)} ms</td>
                    <td style="color: var(--warning-color);">${stats.uncachedAvg.toFixed(
						1,
					)} ms</td>
                    <td>&plusmn;${stats.stdDev.toFixed(1)} ms</td>
                    <td>${stats.reliability.toFixed(1)}%</td>
                </tr>`;
		});

		tableHTML += "</tbody></table>";
		dom.comparisonContent.innerHTML = tableHTML;

		// Re-attach listeners since we overwrote the DOM
		attachHeaderListeners();
	}

	// Initial render
	renderTable();
}

export function displayRecommendation(recommendation) {
	if (recommendation) {
		dom.recommendationText.innerHTML = recommendation;
		dom.recommendationSection.style.display = "block";
	}
}

export function showStatus(text) {
	dom.statusText.textContent = text;
}

export function showProgress(text) {
	dom.progressIndicator.textContent = text;
}

export function exportToCSV(allProviderStats) {
	const headers =
		"Provider,Avg Latency,Median Latency,Std Deviation,Uncached Avg,Cached Avg,Reliability,DNSSEC Support";
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
		].join(","),
	);

	const csv = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
	const link = document.createElement("a");
	link.setAttribute("href", encodeURI(csv));
	link.setAttribute("download", "dns_benchmark_results.csv");
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}