import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import {
	calculateStats,
	getMedianRanks,
	getRecommendation,
	buildShareSummary,
} from "../js/stats.js";
import {
	DEFAULT_PROVIDERS,
	DEFAULT_DOMAINS,
	getState,
	normalizeProviders,
	estimateTestDuration,
	resetSettings,
	applyPreset,
	loadSettings,
	saveSettings,
} from "../js/config.js";

describe("calculateStats", () => {
	it("returns zeros and count 0 when every result failed", () => {
		assert.deepEqual(
			calculateStats([{ latency: null }, { latency: null }]),
			{
				average: 0,
				median: 0,
				stdDev: 0,
				uncachedAvg: 0,
				cachedAvg: 0,
				reliability: 0,
				dnssec: 0,
				count: 0,
			},
		);
	});

	it("computes mixed cached, uncached, reliability, and dnssec", () => {
		const stats = calculateStats([
			{ latency: 10, isUncached: true, dnssecSupported: true },
			{ latency: 20, isUncached: false, dnssecSupported: false },
			{ latency: null, isUncached: true, dnssecSupported: false },
		]);
		assert.equal(stats.average, 15);
		assert.equal(stats.median, 15);
		assert.equal(stats.stdDev, 5);
		assert.equal(stats.uncachedAvg, 10);
		assert.equal(stats.cachedAvg, 20);
		assert.equal(stats.reliability, (2 / 3) * 100);
		assert.equal(stats.dnssec, 50);
		assert.equal(stats.count, 3);
	});

	it("uses the even-length median average", () => {
		const stats = calculateStats([
			{ latency: 10, isUncached: false },
			{ latency: 20, isUncached: false },
			{ latency: 30, isUncached: false },
			{ latency: 40, isUncached: false },
		]);
		assert.equal(stats.median, 25);
	});

	it("uses the middle value for an odd-length set", () => {
		const stats = calculateStats([
			{ latency: 10, isUncached: false },
			{ latency: 20, isUncached: false },
			{ latency: 30, isUncached: false },
		]);
		assert.equal(stats.median, 20);
	});
});

describe("getMedianRanks", () => {
	it("ranks by median and omits count 0", () => {
		const ranks = getMedianRanks({
			Slow: { count: 1, median: 30 },
			Fast: { count: 1, median: 10 },
			Empty: { count: 0, median: 1 },
		});
		assert.equal(Object.getPrototypeOf(ranks), null);
		assert.deepEqual({ ...ranks }, { Fast: 1, Slow: 2 });
	});
});

describe("getRecommendation", () => {
	it("returns null when no provider has samples", () => {
		assert.equal(getRecommendation({ Empty: { count: 0 } }), null);
	});

	it("names the winner and the median gap when the gap is above 0.5 ms", () => {
		const rec = getRecommendation({
			Cloudflare: {
				count: 1,
				median: 10,
				average: 12,
				reliability: 100,
			},
			Google: { count: 1, median: 20, average: 22, reliability: 100 },
		});
		assert.equal(rec.winnerName, "Cloudflare");
		assert.equal(rec.median, 10);
		assert.equal(rec.average, 12);
		assert.equal(rec.reliability, 100);
		assert.equal(
			rec.html,
			"Based on speed and reliability, <strong>Cloudflare</strong> is the top performer. Typical (median) response <strong>10 ms</strong>, average <strong>12 ms</strong>, reliability <strong>100%</strong>. That is <strong>10 ms</strong> faster (median) than Google.",
		);
	});

	it("omits the gap sentence when the median delta is 0.5 ms or less", () => {
		const rec = getRecommendation({
			A: { count: 1, median: 10, average: 10, reliability: 100 },
			B: { count: 1, median: 10.5, average: 10.5, reliability: 100 },
		});
		assert.equal(
			rec.html,
			"Based on speed and reliability, <strong>A</strong> is the top performer. Typical (median) response <strong>10 ms</strong>, average <strong>10 ms</strong>, reliability <strong>100%</strong>.",
		);
	});

	it("escapes provider names in the recommendation html", () => {
		const rec = getRecommendation({
			"<evil>": { count: 1, median: 5, average: 5, reliability: 100 },
		});
		assert.match(rec.html, /&lt;evil&gt;/);
		assert.doesNotMatch(rec.html, /<evil>/);
	});
});

describe("buildShareSummary", () => {
	it("returns the empty-results line", () => {
		assert.equal(
			buildShareSummary({}, {}, 6),
			"DNS Bench Pro — no completed results.",
		);
	});

	it("lists providers in median-rank order", () => {
		const text = buildShareSummary(
			{
				Slow: {
					count: 1,
					median: 20,
					average: 21,
					reliability: 90,
				},
				Fast: {
					count: 1,
					median: 10,
					average: 11,
					reliability: 100,
				},
			},
			{ Fast: 1, Slow: 2 },
			6,
		);
		const lines = text.split("\n");
		assert.equal(lines[0], "DNS Bench Pro results");
		assert.equal(lines[1], "Profile: 6 queries/url");
		assert.equal(lines[2], `Date: ${new Date().toISOString().slice(0, 10)}`);
		assert.equal(lines[4], "#1 Fast — median 10.0 ms, avg 11.0 ms, reliability 100%");
		assert.equal(lines[5], "#2 Slow — median 20.0 ms, avg 21.0 ms, reliability 90%");
		assert.equal(lines[7], "https://dnsbenchpro.netlify.app");
	});
});

describe("normalizeProviders", () => {
	it("trims fields, drops empties, and fills known-url meta", () => {
		assert.deepEqual(
			normalizeProviders([
				{ name: "  Cloudflare  ", url: "  https://1.1.1.1/dns-query  " },
				{ name: "", url: "https://example.com/dns-query" },
				{ name: "Nope", url: "" },
			]),
			[
				{
					name: "Cloudflare",
					url: "https://1.1.1.1/dns-query",
					type: "post",
					allowCors: true,
				},
			],
		);
	});

	it("suffixes duplicate names and defaults unknown urls", () => {
		assert.deepEqual(
			normalizeProviders([
				{ name: "Custom", url: "https://dns.example/dns-query" },
				{ name: "Custom", url: "https://dns.other/dns-query" },
			]),
			[
				{
					name: "Custom",
					url: "https://dns.example/dns-query",
					type: "post",
					allowCors: false,
				},
				{
					name: "Custom (2)",
					url: "https://dns.other/dns-query",
					type: "post",
					allowCors: false,
				},
			],
		);
	});

	it("keeps explicit type and allowCors", () => {
		assert.deepEqual(
			normalizeProviders([
				{
					name: "X",
					url: "https://dns.example/dns-query",
					type: "get",
					allowCors: true,
				},
			]),
			[
				{
					name: "X",
					url: "https://dns.example/dns-query",
					type: "get",
					allowCors: true,
				},
			],
		);
	});
});

describe("estimateTestDuration", () => {
	it("matches the default six-provider profile labels", () => {
		assert.equal(getState().providers.length, 6);
		assert.equal(estimateTestDuration(3), "~5s");
		assert.equal(estimateTestDuration(6), "~8s");
		assert.equal(estimateTestDuration(18), "~23s");
		assert.equal(estimateTestDuration(36), "~44s");
	});
});

describe("domain breakdown (main.js contract)", () => {
	function breakdownFromMain(allResults, domains) {
		const domainBreakdown = {};
		domains.forEach((domain) => {
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
		return finalBreakdown;
	}

	const results = [
		{ latency: 10, isUncached: true, domain: "a.com" },
		{ latency: 30, isUncached: true, domain: "a.com" },
		{ latency: 20, isUncached: false, domain: "a.com" },
		{ latency: null, isUncached: true, domain: "b.com" },
		{ latency: 40, isUncached: false, domain: "unknown.com" },
	];
	const expected = {
		"a.com": { uncachedAvg: 20, cachedAvg: 20 },
		"b.com": { uncachedAvg: null, cachedAvg: null },
	};

	it("averages per domain and ignores unknown domains and failures", () => {
		assert.deepEqual(breakdownFromMain(results, ["a.com", "b.com"]), expected);
	});
});

describe("settings persistence", () => {
	const memory = new Map();

	beforeEach(() => {
		memory.clear();
		globalThis.localStorage = {
			getItem(key) {
				return memory.has(key) ? memory.get(key) : null;
			},
			setItem(key, value) {
				memory.set(key, String(value));
			},
		};
		resetSettings();
	});

	it("round-trips providers and domains", () => {
		const state = getState();
		state.providers = normalizeProviders([
			{ name: "Only", url: "https://dns.example/dns-query" },
		]);
		state.domains = ["example.com"];
		saveSettings();
		state.providers = DEFAULT_PROVIDERS.map((p) => ({ ...p }));
		state.domains = [...DEFAULT_DOMAINS];
		loadSettings();
		assert.equal(state.providers.length, 1);
		assert.equal(state.providers[0].name, "Only");
		assert.deepEqual(state.domains, ["example.com"]);
	});

	it("applyPreset('minimal') replaces providers and domains", () => {
		assert.equal(applyPreset("minimal"), true);
		const state = getState();
		assert.equal(state.providers.length, 3);
		assert.deepEqual(state.domains, [
			"google.com",
			"youtube.com",
			"cloudflare.com",
		]);
	});

	it("applyPreset returns false for an unknown id", () => {
		assert.equal(applyPreset("nope"), false);
	});
});
