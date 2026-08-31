import * as dom from "./dom.js";
import { getState, GRAPH_SCALE_MS } from "./config.js";

export const GRAPH_SCALE_FLOOR_MS = GRAPH_SCALE_MS;
export const GRAPH_SCALE_STEP_MS = 50;

const seriesByName = new Map();

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

export function scaleMs(
	maxLatency,
	floor = GRAPH_SCALE_FLOOR_MS,
	step = GRAPH_SCALE_STEP_MS,
) {
	if (maxLatency == null || !Number.isFinite(maxLatency) || maxLatency <= floor) {
		return floor;
	}
	return Math.ceil(maxLatency / step) * step;
}

export function createSeries(name) {
	return {
		name,
		samples: [],
		runningAvg: null,
		cachedAvg: null,
		uncachedAvg: null,
		min: null,
		max: null,
		last: null,
		median: null,
		reliability: null,
		status: "idle",
	};
}

function average(values) {
	if (values.length === 0) return null;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function medianOf(values) {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	return sorted.length % 2 !== 0
		? sorted[mid]
		: (sorted[mid - 1] + sorted[mid]) / 2;
}

export function deriveMetrics(samples) {
	const successful = samples.filter((sample) => sample.latency !== null);
	const latencies = successful.map((sample) => sample.latency);
	const cached = successful
		.filter((sample) => !sample.isUncached)
		.map((sample) => sample.latency);
	const uncached = successful
		.filter((sample) => sample.isUncached)
		.map((sample) => sample.latency);

	return {
		runningAvg: average(latencies),
		cachedAvg: average(cached),
		uncachedAvg: average(uncached),
		min: latencies.length ? Math.min(...latencies) : null,
		max: latencies.length ? Math.max(...latencies) : null,
		last: latencies.length ? latencies[latencies.length - 1] : null,
		median: medianOf(latencies),
		reliability: samples.length
			? (successful.length / samples.length) * 100
			: null,
	};
}

export function recordSample(series, sample) {
	const samples = [...series.samples, sample];
	return {
		...series,
		samples,
		status: "running",
		...deriveMetrics(samples),
	};
}

export function markDone(series) {
	return {
		...series,
		status: "done",
		...deriveMetrics(series.samples),
	};
}

export function tickPositions(samples, scale) {
	return samples
		.filter((sample) => sample.latency !== null)
		.map((sample) => Math.min(100, (sample.latency / scale) * 100));
}

export function reset() {
	seriesByName.clear();
}

export function getSeries(name) {
	return seriesByName.get(name) ?? null;
}

export function currentScale() {
	let max = 0;
	for (const series of seriesByName.values()) {
		if (series.max != null && series.max > max) max = series.max;
	}
	return scaleMs(max);
}

function providerColor(name) {
	return getState().providerColors[name] || "var(--ink)";
}

function createRow(name) {
	const safe = providerKey(name);
	const wrapper = document.createElement("div");
	wrapper.className = "graph-bar-wrapper";
	wrapper.id = `wrapper-${safe}`;
	wrapper.dataset.status = "idle";
	wrapper.dataset.provider = name;
	wrapper.style.setProperty("--provider", providerColor(name));

	const dnsName = document.createElement("div");
	dnsName.className = "dns-name";
	dnsName.textContent = name;

	const barContainer = document.createElement("div");
	barContainer.className = "bar-container";

	const track = document.createElement("div");
	track.className = "graph-track";
	track.id = `track-${safe}`;
	track.tabIndex = 0;
	track.setAttribute("role", "img");
	track.setAttribute("aria-label", `${name}: waiting`);

	const uncached = document.createElement("div");
	uncached.className = "graph-bar graph-bar-uncached is-empty";
	uncached.id = `uncached-${safe}`;

	const cached = document.createElement("div");
	cached.className = "graph-bar graph-bar-cached is-empty";
	cached.id = `cached-${safe}`;

	const ticks = document.createElement("div");
	ticks.className = "graph-ticks";
	ticks.id = `ticks-${safe}`;

	const median = document.createElement("div");
	median.className = "graph-median";
	median.id = `median-${safe}`;
	median.hidden = true;

	track.append(uncached, cached, ticks, median);

	const popover = document.createElement("div");
	popover.className = "graph-popover";
	popover.id = `tip-${safe}`;
	popover.setAttribute("role", "tooltip");

	barContainer.append(track, popover);

	const latency = document.createElement("div");
	latency.className = "latency-value";
	latency.id = `latency-${safe}`;
	latency.textContent = "—";

	wrapper.append(dnsName, barContainer, latency);
	return wrapper;
}

export function init(providers) {
	reset();
	if (!dom.mainGraphContainer) return;
	dom.mainGraphContainer.replaceChildren();
	providers.forEach(({ name }) => {
		seriesByName.set(name, createSeries(name));
		dom.mainGraphContainer.appendChild(createRow(name));
	});
	renderRuler(currentScale());
}

function pct(value, scale) {
	if (value == null) return 0;
	return Math.min(100, (value / scale) * 100);
}

function formatMs(value) {
	if (value == null) return "n/a";
	return `${value.toFixed(0)} ms`;
}

function describeSeries(series) {
	if (series.runningAvg == null) return `${series.name}: waiting`;
	const parts = [series.name];
	if (series.runningAvg != null) {
		parts.push(`average ${series.runningAvg.toFixed(0)} milliseconds`);
	}
	if (series.median != null) {
		parts.push(`median ${series.median.toFixed(0)}`);
	}
	if (series.cachedAvg != null) {
		parts.push(`cached ${series.cachedAvg.toFixed(0)}`);
	}
	if (series.uncachedAvg != null) {
		parts.push(`uncached ${series.uncachedAvg.toFixed(0)}`);
	}
	return parts.join(", ");
}

function popoverHtml(series) {
	const row = (label, value) =>
		`<div class="graph-popover-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(
			value,
		)}</dd></div>`;
	return `
		<p class="graph-popover-title">${escapeHtml(series.name)}</p>
		<dl>
			${row("Avg", formatMs(series.runningAvg))}
			${row("Median", formatMs(series.median))}
			${row("Cached", formatMs(series.cachedAvg))}
			${row("Uncached", formatMs(series.uncachedAvg))}
			${row("Last", formatMs(series.last))}
			${row(
				"Reliability",
				series.reliability == null ? "n/a" : `${series.reliability.toFixed(0)}%`,
			)}
		</dl>
	`;
}

function renderRuler(scale) {
	const track = document.querySelector(".ms-ruler-track");
	if (!track) return;
	track.replaceChildren();
	for (let value = 0; value <= scale; value += 50) {
		const span = document.createElement("span");
		span.textContent = value === scale ? `${value} ms` : String(value);
		track.appendChild(span);
	}
}

function renderRow(name) {
	const series = seriesByName.get(name);
	if (!series) return;
	const safe = providerKey(name);
	const scale = currentScale();
	const wrapper = document.getElementById(`wrapper-${safe}`);
	const track = document.getElementById(`track-${safe}`);
	const uncached = document.getElementById(`uncached-${safe}`);
	const cached = document.getElementById(`cached-${safe}`);
	const ticks = document.getElementById(`ticks-${safe}`);
	const medianEl = document.getElementById(`median-${safe}`);
	const latencyEl = document.getElementById(`latency-${safe}`);
	const popover = document.getElementById(`tip-${safe}`);
	if (!wrapper || !track) return;

	wrapper.dataset.status = series.status;
	wrapper.style.setProperty("--provider", providerColor(name));

	if (uncached) {
		uncached.style.width = `${pct(series.uncachedAvg, scale)}%`;
		uncached.classList.toggle("is-empty", series.uncachedAvg == null);
	}
	if (cached) {
		cached.style.width = `${pct(series.cachedAvg, scale)}%`;
		cached.classList.toggle("is-empty", series.cachedAvg == null);
	}
	if (ticks) {
		ticks.replaceChildren();
		for (const sample of series.samples) {
			if (sample.latency == null) continue;
			const tick = document.createElement("span");
			tick.className = `graph-tick${sample.isUncached ? " uncached" : " cached"}`;
			tick.style.left = `${pct(sample.latency, scale)}%`;
			ticks.appendChild(tick);
		}
	}
	if (medianEl) {
		if (series.median == null) {
			medianEl.hidden = true;
		} else {
			medianEl.hidden = false;
			medianEl.style.left = `${pct(series.median, scale)}%`;
		}
	}
	if (latencyEl) {
		const shown =
			series.status === "done" && series.median != null
				? series.median
				: series.runningAvg;
		latencyEl.textContent = shown == null ? "—" : `${shown.toFixed(0)} ms`;
	}

	track.setAttribute("aria-label", describeSeries(series));
	if (popover) popover.innerHTML = popoverHtml(series);
}

function renderAll() {
	renderRuler(currentScale());
	for (const name of seriesByName.keys()) {
		renderRow(name);
	}
}

export function applySample(name, sample) {
	const current = seriesByName.get(name) || createSeries(name);
	seriesByName.set(name, recordSample(current, sample));
	renderAll();
}

export function finishProvider(name) {
	const current = seriesByName.get(name);
	if (!current) return;
	seriesByName.set(name, markDone(current));
	renderAll();
}

export function markWinner(name) {
	for (const key of seriesByName.keys()) {
		const wrapper = document.getElementById(`wrapper-${providerKey(key)}`);
		if (wrapper) wrapper.classList.toggle("is-winner", key === name);
	}
}

export function refreshColors() {
	for (const name of seriesByName.keys()) {
		const wrapper = document.getElementById(`wrapper-${providerKey(name)}`);
		if (wrapper) wrapper.style.setProperty("--provider", providerColor(name));
	}
}
