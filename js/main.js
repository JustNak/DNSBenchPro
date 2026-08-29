// Application entry point and test orchestrator.

import * as dom from "./dom.js";
import * as ui from "./ui.js";
import * as api from "./api.js";
import * as stats from "./stats.js";
import { initModals, openDurationModal } from "./modals.js";
import {
	getState,
	loadSettings,
	generateProviderColors,
	createAbortController,
	abortActiveRequests,
} from "./config.js";

function progressTotals(queryCount) {
	const state = getState();
	const warmUps = state.providers.length * state.domains.length;
	const measures = state.providers.length * state.domains.length * queryCount;
	return { warmUps, measures, overall: warmUps + measures };
}

async function runTestForProvider(provider, queriesPerUrl, progressOffset, totals) {
	const state = getState();
	const domains = [...state.domains];
	const allResults = [];
	let runningTotalLatency = 0;
	let successfulQueryCount = 0;

	const totalQueries = queriesPerUrl * domains.length;
	let currentQueryIndex = 0;
	const providerIndex =
		state.providers.findIndex((p) => p.name === provider.name) + 1;

	ui.showStatus(`Testing ${provider.name}…`);

	for (let round = 0; round < queriesPerUrl; round++) {
		if (!state.isTestRunning) break;

		const isUncached = round === 0;
		const roundStartIndex = round * domains.length;
		ui.setProgress({
			phase: "Measuring",
			label: `${provider.name} (${providerIndex}/${state.providers.length})`,
			detail: `Round ${round + 1}/${queriesPerUrl} · ${domains.length} sites in parallel`,
			overallIndex: progressOffset + roundStartIndex,
			overallTotal: totals.overall,
		});

		const results = await api.measureLatencyBatch(
			provider,
			domains,
			isUncached,
		);

		results.forEach((result, index) => {
			const domain = domains[index];
			currentQueryIndex++;
			allResults.push({ ...result, isUncached, domain });

			const overallIndex = progressOffset + currentQueryIndex;
			const resultDetail =
				result.latency !== null
					? `${result.latency.toFixed(0)} ms`
					: "failed";

			if (result.latency !== null) {
				successfulQueryCount++;
				runningTotalLatency += result.latency;
				const runningAverage =
					runningTotalLatency / successfulQueryCount;
				ui.updateMainGraph(provider.name, runningAverage);
			}

			ui.setProgress({
				phase: "Measuring",
				label: `${provider.name} (${providerIndex}/${state.providers.length})`,
				detail: `Query ${currentQueryIndex}/${totalQueries}, ${domain}, ${resultDetail}`,
				overallIndex,
				overallTotal: totals.overall,
			});
		});
	}

	if (allResults.length === 0) return;

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
}

async function warmUpAllProviders(totals) {
	const state = getState();
	const domains = [...state.domains];
	state.runPhase = "warmup";
	ui.setProgress({
		phase: "Warm-up",
		label: "Priming DNS connections…",
		detail: "So the first measurements aren’t slowed by cold starts.",
		overallIndex: 0,
		overallTotal: totals.overall,
	});

	let warmUpCount = 0;

	for (const provider of state.providers) {
		if (!getState().isTestRunning) return;

		ui.setProgress({
			phase: "Warm-up",
			label: "Priming DNS connections…",
			detail: `${provider.name} · ${domains.length} sites in parallel`,
			overallIndex: warmUpCount,
			overallTotal: totals.overall,
		});

		await api.warmUpConnections(provider, domains);
		warmUpCount += domains.length;

		ui.setProgress({
			phase: "Warm-up",
			label: "Priming DNS connections…",
			detail: `${provider.name} · ready (${warmUpCount}/${totals.warmUps})`,
			overallIndex: warmUpCount,
			overallTotal: totals.overall,
		});
	}
}

function stopTest() {
	const state = getState();
	if (!state.isTestRunning) return;
	state.isTestRunning = false;
	state.runPhase = "cancelled";
	abortActiveRequests();
	ui.showStatus("Stopping…");
}

async function startTest(queryCount) {
	const state = getState();
	if (state.isTestRunning) return;

	state.isTestRunning = true;
	state.runPhase = "warmup";
	state.lastQueryCount = queryCount;
	state.medianRanks = Object.create(null);
	createAbortController();

	dom.startScreen.classList.add("hidden");
	dom.resultsScreen.classList.add("visible");
	ui.setRunningControls(true);

	state.allProviderStats = Object.create(null);
	state.queriedDomains.clear();
	ui.createInitialUI();
	ui.setHeroMode("progress");

	const totals = progressTotals(queryCount);

	try {
		await warmUpAllProviders(totals);

		if (state.isTestRunning) {
			state.runPhase = "measure";
			let measureOffset = totals.warmUps;

			for (let i = 0; i < state.providers.length; i++) {
				if (!state.isTestRunning) break;

				const provider = state.providers[i];
				await runTestForProvider(
					provider,
					queryCount,
					measureOffset,
					totals,
				);
				measureOffset += state.domains.length * queryCount;
			}
		}

		const completedProviders = Object.keys(state.allProviderStats).length;
		const expectedProviders = state.providers.length;

		if (state.isTestRunning && completedProviders === expectedProviders) {
			state.runPhase = "complete";
			ui.setProgress({
				phase: "Complete",
				label: "Test complete",
				detail: "See recommendation and comparison below.",
				overallIndex: totals.overall,
				overallTotal: totals.overall,
			});

			state.medianRanks = stats.getMedianRanks(state.allProviderStats);
			ui.createComparisonTable(
				state.allProviderStats,
				state.medianRanks,
			);

			const recommendation = stats.getRecommendation(
				state.allProviderStats,
			);
			ui.displayRecommendation(recommendation, false);

			dom.exportCsvButton.style.display = "inline-flex";
			if (dom.shareResultsButton) {
				dom.shareResultsButton.style.display = "inline-flex";
			}
		} else if (state.runPhase === "cancelled" || !state.isTestRunning) {
			state.runPhase = "cancelled";
			ui.setProgress({
				phase: "Stopped",
				label: "Test stopped",
				detail: "Partial results are shown where available.",
				overallIndex: 0,
				overallTotal: 1,
			});

			if (completedProviders > 0) {
				state.medianRanks = stats.getMedianRanks(
					state.allProviderStats,
				);
				ui.createComparisonTable(
					state.allProviderStats,
					state.medianRanks,
				);
				const recommendation = stats.getRecommendation(
					state.allProviderStats,
				);
				if (recommendation) {
					ui.displayRecommendation(recommendation, true);
				} else {
					ui.showIncompleteState(
						"<strong>Test stopped.</strong> Not enough data for a recommendation.",
					);
				}
				dom.exportCsvButton.style.display = "inline-flex";
				if (dom.shareResultsButton) {
					dom.shareResultsButton.style.display = "inline-flex";
				}
			} else {
				ui.showIncompleteState(
					"<strong>Test stopped</strong> before any provider finished.",
				);
			}
		}
	} catch (error) {
		console.error("Error during test execution:", error);
		ui.showStatus("Test failed due to an error. Check the console.");
		ui.setProgress({
			phase: "Error",
			label: "Test failed",
			detail: "See console for details.",
			overallIndex: 0,
			overallTotal: 1,
		});
	}

	ui.setRunningControls(false);
	state.isTestRunning = false;
}

function initialize() {
	loadSettings();
	generateProviderColors();
	ui.updateConfigSummary();
	dom.startButton.disabled = false;
	initModals(startTest, stopTest);

	dom.runAgainButton.addEventListener("click", () => {
		ui.createInitialUI();
		if (dom.recommendationSection) {
			dom.recommendationSection.style.display = "none";
		}
		dom.exportCsvButton.style.display = "none";
		if (dom.shareResultsButton) {
			dom.shareResultsButton.style.display = "none";
		}
		dom.comparisonContent.innerHTML = `<p class="empty-state">Results will appear here after a full run.</p>`;
		ui.setHeroMode("progress");
		ui.setProgress({
			phase: "Ready",
			label: "Choose a test profile to begin.",
			detail: "",
			overallIndex: 0,
			overallTotal: 1,
		});
		openDurationModal();
	});

	dom.exportCsvButton.addEventListener("click", () => {
		ui.exportToCSV(getState().allProviderStats);
	});

	if (dom.shareResultsButton) {
		dom.shareResultsButton.addEventListener("click", () => {
			ui.shareResults();
		});
	}
}

document.addEventListener("DOMContentLoaded", initialize);
