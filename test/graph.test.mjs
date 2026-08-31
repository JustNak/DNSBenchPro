import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	GRAPH_SCALE_FLOOR_MS,
	scaleMs,
	createSeries,
	deriveMetrics,
	recordSample,
	markDone,
	tickPositions,
} from "../js/graph.js";

const samples = [
	{ latency: 40, isUncached: true, domain: "a.com" },
	{ latency: 20, isUncached: false, domain: "a.com" },
	{ latency: 30, isUncached: false, domain: "b.com" },
	{ latency: null, isUncached: true, domain: "b.com" },
];

describe("scaleMs", () => {
	it("keeps the 150 ms floor at or below 150", () => {
		assert.equal(scaleMs(149), 150);
		assert.equal(scaleMs(150), 150);
		assert.equal(scaleMs(null), GRAPH_SCALE_FLOOR_MS);
		assert.equal(scaleMs(Number.NaN), GRAPH_SCALE_FLOOR_MS);
	});

	it("steps up in 50 ms increments past the floor", () => {
		assert.equal(scaleMs(151), 200);
		assert.equal(scaleMs(200), 200);
		assert.equal(scaleMs(201), 250);
	});
});

describe("deriveMetrics", () => {
	it("splits cached and uncached averages and ignores failures", () => {
		const metrics = deriveMetrics(samples);
		assert.equal(metrics.runningAvg, 30);
		assert.equal(metrics.cachedAvg, 25);
		assert.equal(metrics.uncachedAvg, 40);
		assert.equal(metrics.min, 20);
		assert.equal(metrics.max, 40);
		assert.equal(metrics.last, 30);
		assert.equal(metrics.median, 30);
		assert.equal(metrics.reliability, 75);
	});

	it("returns nulls when every sample failed", () => {
		const metrics = deriveMetrics([{ latency: null, isUncached: true }]);
		assert.equal(metrics.runningAvg, null);
		assert.equal(metrics.cachedAvg, null);
		assert.equal(metrics.uncachedAvg, null);
		assert.equal(metrics.reliability, 0);
	});
});

describe("recordSample and markDone", () => {
	it("appends a sample and marks running, then done", () => {
		const idle = createSeries("Cloudflare");
		const running = recordSample(idle, {
			latency: 12,
			isUncached: true,
			domain: "a.com",
		});
		assert.equal(running.status, "running");
		assert.equal(running.samples.length, 1);
		assert.equal(running.uncachedAvg, 12);
		assert.equal(idle.samples.length, 0);

		const done = markDone(running);
		assert.equal(done.status, "done");
		assert.equal(done.median, 12);
	});
});

describe("tickPositions", () => {
	it("places successful samples on the scale and drops failures", () => {
		assert.deepEqual(tickPositions(samples, 200), [20, 10, 15]);
	});
});
