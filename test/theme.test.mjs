import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
	THEME_STORAGE_KEY,
	THEME_COLOR_DARK,
	THEME_COLOR_LIGHT,
	readStoredTheme,
	readSystemTheme,
	resolveTheme,
	paperColor,
	toggleTarget,
	persistTheme,
} from "../js/theme.js";

describe("readStoredTheme", () => {
	it("returns light or dark from storage", () => {
		assert.equal(
			readStoredTheme({ getItem: () => "dark" }),
			"dark",
		);
		assert.equal(
			readStoredTheme({ getItem: () => "light" }),
			"light",
		);
	});

	it("returns null for missing, junk, or unavailable storage", () => {
		assert.equal(readStoredTheme(null), null);
		assert.equal(readStoredTheme({ getItem: () => "sepia" }), null);
		assert.equal(
			readStoredTheme({
				getItem() {
					throw new Error("blocked");
				},
			}),
			null,
		);
	});
});

describe("readSystemTheme", () => {
	it("follows prefers-color-scheme and defaults to light", () => {
		assert.equal(readSystemTheme({ matches: true }), "dark");
		assert.equal(readSystemTheme({ matches: false }), "light");
		assert.equal(readSystemTheme(null), "light");
	});
});

describe("resolveTheme", () => {
	it("prefers a stored explicit theme over system", () => {
		assert.equal(resolveTheme("light", "dark"), "light");
		assert.equal(resolveTheme("dark", "light"), "dark");
	});

	it("follows system when nothing is stored", () => {
		assert.equal(resolveTheme(null, "dark"), "dark");
		assert.equal(resolveTheme(null, "light"), "light");
		assert.equal(resolveTheme("sepia", "dark"), "dark");
	});
});

describe("paperColor and toggleTarget", () => {
	it("maps paper and the opposite theme", () => {
		assert.equal(paperColor("dark"), THEME_COLOR_DARK);
		assert.equal(paperColor("light"), THEME_COLOR_LIGHT);
		assert.equal(toggleTarget("dark"), "light");
		assert.equal(toggleTarget("light"), "dark");
	});
});

describe("persistTheme", () => {
	it("writes the storage key", () => {
		const memory = new Map();
		persistTheme("dark", {
			setItem(key, value) {
				memory.set(key, value);
			},
		});
		assert.equal(memory.get(THEME_STORAGE_KEY), "dark");
	});
});
