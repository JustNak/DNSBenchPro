// frontend/js/main.js
// The main application entry point and orchestrator.

import * as dom from "./dom.js";
import * as ui from "./ui.js";
import * as api from "./api.js";
import * as stats from "./stats.js";
import { initModals } from "./modals.js";
import {
	getState,
	loadSettings,
	generateProviderColors,
} from "./config.js";

/**
 * SEQUENTIAL TEST FUNCTION - Tests one provider at a time
 */
async function runTestForProvider(provider, queriesPerUrl) {
	const state = getState();
	const allResults = [];
	let runningTotalLatency = 0;
	let successfulQueryCount = 0;

	const totalQueries = queriesPerUrl * state.domains.length;
	let currentQueryIndex = 0;

	console.log(
		`🎯 Starting test for ${provider.name} with ${queriesPerUrl} queries per URL. Total: ${totalQueries}`,
	);
	ui.showStatus(`Testing ${provider.name}...`);

	for (const domain of state.domains) {
		if (!state.isTestRunning) break;

		for (let i = 0; i < queriesPerUrl; i++) {
			if (!state.isTestRunning) break;

			currentQueryIndex++;
			ui.showProgress(
				`${provider.name}: Query ${currentQueryIndex}/${totalQueries} - ${domain}`,
			);

			const isUncached = i === 0;

			const result = await api.measureLatency(
				provider,
				domain,
				isUncached,
			);
			allResults.push({ ...result, isUncached, domain });

			if (result.latency !== null) {
				successfulQueryCount++;
				runningTotalLatency += result.latency;
				const runningAverage =
					runningTotalLatency / successfulQueryCount;
				ui.updateMainGraph(provider.name, runningAverage);

				ui.showProgress(
					`${provider.name}: Query ${currentQueryIndex}/${totalQueries} - ${domain} (${result.latency.toFixed(
						0,
					)} ms)`,
				);
			} else {
				ui.showProgress(
					`${provider.name}: Query ${currentQueryIndex}/${totalQueries} - ${domain} (Failed)`,
				);
			}

			await new Promise((resolve) => setTimeout(resolve, 100));
		}
	}

	if (!state.isTestRunning) return;

	const allStats = stats.calculateStats(allResults);
	state.allProviderStats[provider.name] = allStats;
	ui.updateCardStats(provider.name, allStats);
	ui.showCard(provider.name);

	const domainBreakdown = {};
	state.domains.forEach((domain) => {
		domainBreakdown[domain] = { cached: [], uncached: [] };
	});

	allResults.forEach((result) => {
		if (result.latency !== null && domainBreakdown[result.domain]) {
			if (result.isUncached) {
				domainBreakdown[result.domain].uncached.push(result.latency);
			} else {
				domainBreakdown[result.domain].cached.push(result.latency);
			}
		}
	});

	const sum = (arr) => arr.reduce((acc, val) => acc + val, 0);
	const finalBreakdown = {};
	for (const domain in domainBreakdown) {
		const uncachedLatencies = domainBreakdown[domain].uncached;
		const cachedLatencies = domainBreakdown[domain].cached;
		finalBreakdown[domain] = {
			uncachedAvg:
				uncachedLatencies.length > 0
					? sum(uncachedLatencies) / uncachedLatencies.length
					: null,
			cachedAvg:
				cachedLatencies.length > 0
					? sum(cachedLatencies) / cachedLatencies.length
					: null,
		};
	}

	ui.displayDetailedBreakdown(provider.name, finalBreakdown);

	console.log(`📊 ${provider.name} completed:`, {
		overallAverage: allStats.average.toFixed(1) + "ms",
		median: allStats.median.toFixed(1) + "ms",
		stdDev: allStats.stdDev.toFixed(1) + "ms",
	});
}

async function warmUpAllProviders() {
	const state = getState();
	console.log("🔥🔥🔥 Starting comprehensive warm-up phase...");
	ui.showStatus("Warming up DNS connections...");

	let warmUpCount = 0;
	const totalWarmUps = state.providers.length * state.domains.length;

	for (const provider of state.providers) {
		for (const domain of state.domains) {
			if (!getState().isTestRunning) return;
			warmUpCount++;
			ui.showProgress(`Warming up: ${warmUpCount} / ${totalWarmUps}`);
			await api.warmUpConnection(provider, domain);
		}
	}
	console.log("✅ Warm-up phase complete.");
}

async function startTest(queryCount) {
	const state = getState();
	if (state.isTestRunning) return;

	console.log(
		"🚀 Starting DNS benchmark with providers:",
		state.providers.map((p) => p.name),
	);
	console.log("🌐 Testing domains:", state.domains);
	console.log("🔢 Queries per URL:", queryCount);

	state.isTestRunning = true;
	dom.startScreen.classList.add("hidden");
	dom.resultsScreen.classList.add("visible");
	dom.runAgainButton.disabled = true;

	state.allProviderStats = {};
	state.queriedDomains.clear();
	ui.createInitialUI();

	try {
		await warmUpAllProviders();

		if (state.isTestRunning) {
			for (let i = 0; i < state.providers.length; i++) {
				if (!state.isTestRunning) break;

				const provider = state.providers[i];
				await runTestForProvider(provider, queryCount);

				if (i < state.providers.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, 500));
				}
			}
		}

		if (state.isTestRunning) {
			console.log("🎉 All tests completed successfully");
			ui.showStatus("Test complete. See comparison table below.");
			ui.showProgress("");
			ui.createComparisonTable(state.allProviderStats);

			const recommendation = stats.getRecommendation(state.allProviderStats);
			ui.displayRecommendation(recommendation);

			dom.exportCsvButton.style.display = "inline-block";
		} else {
			console.log("⏹️ Test was cancelled");
			ui.showStatus("Test cancelled.");
			ui.showProgress("");
		}
	} catch (error) {
		console.error("💥 Error during test execution:", error);
		ui.showStatus("Test failed due to an error. Check console for details.");
		ui.showProgress("");
	}

	dom.runAgainButton.disabled = false;
	state.isTestRunning = false;
}

function initialize() {
	console.log("🎬 Initializing DNSBench Pro");
	loadSettings();
	generateProviderColors();
	dom.startButton.disabled = false;
	initModals(startTest);

	// FIX: Updated "Run Again" button logic
	dom.runAgainButton.addEventListener("click", () => {
		console.log("🔄 Preparing for new test from results screen.");

		// Reset UI elements to their initial state before showing the modal
		ui.createInitialUI();
		dom.recommendationSection.style.display = "none";
		dom.exportCsvButton.style.display = "none";
		dom.comparisonContent.innerHTML = `<p style="text-align: center; color: var(--text-muted);">Run a test to see detailed comparison data</p>`;
		dom.statusText.textContent = "";
		dom.progressIndicator.textContent = "";

		// Open the test selection modal directly
		dom.durationModal.classList.add("visible");
	});

	dom.exportCsvButton.addEventListener("click", () => {
		console.log("📁 Exporting CSV");
		ui.exportToCSV(getState().allProviderStats);
	});

	console.log("✅ DNSBench Pro initialized");
}

document.addEventListener("DOMContentLoaded", initialize);