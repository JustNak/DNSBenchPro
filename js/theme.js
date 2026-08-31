export const THEME_STORAGE_KEY = "dnsBenchTheme";
export const THEME_COLOR_LIGHT = "#e7eaef";
export const THEME_COLOR_DARK = "#101318";

export function readStoredTheme(storage) {
	if (!storage) return null;
	try {
		const value = storage.getItem(THEME_STORAGE_KEY);
		return value === "light" || value === "dark" ? value : null;
	} catch {
		return null;
	}
}

export function readSystemTheme(media) {
	if (!media || typeof media.matches !== "boolean") return "light";
	return media.matches ? "dark" : "light";
}

export function resolveTheme(stored, system) {
	return stored === "light" || stored === "dark" ? stored : system === "dark" ? "dark" : "light";
}

export function paperColor(theme) {
	return theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
}

export function toggleTarget(theme) {
	return theme === "dark" ? "light" : "dark";
}

function storage() {
	try {
		return localStorage;
	} catch {
		return null;
	}
}

function systemMedia() {
	if (typeof matchMedia !== "function") return null;
	return matchMedia("(prefers-color-scheme: dark)");
}

export function applyTheme(theme, doc = typeof document !== "undefined" ? document : null) {
	if (!doc) return;
	const root = doc.documentElement;
	root.dataset.theme = theme;
	root.style.colorScheme = theme;
	const meta = doc.querySelector('meta[name="theme-color"]');
	if (meta) meta.setAttribute("content", paperColor(theme));
}

export function persistTheme(theme, store = storage()) {
	if (!store) return;
	try {
		store.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		return;
	}
}

function syncToggle(button, theme) {
	if (!button) return;
	const next = toggleTarget(theme);
	button.dataset.theme = theme;
	button.setAttribute("aria-label", next === "dark" ? "Use dark theme" : "Use light theme");
	button.textContent = next === "dark" ? "Dark" : "Light";
}

export function init(options = {}) {
	const { onChange } = options;
	const store = storage();
	const media = systemMedia();

	const applyResolved = () => {
		const theme = resolveTheme(readStoredTheme(store), readSystemTheme(media));
		applyTheme(theme);
		syncToggle(document.getElementById("theme-toggle"), theme);
		return theme;
	};

	applyResolved();

	const button = document.getElementById("theme-toggle");
	if (button) {
		button.addEventListener("click", () => {
			const next = toggleTarget(
				resolveTheme(readStoredTheme(store), readSystemTheme(media)),
			);
			persistTheme(next, store);
			applyTheme(next);
			syncToggle(button, next);
			onChange?.(next);
		});
	}

	if (media && typeof media.addEventListener === "function") {
		media.addEventListener("change", () => {
			if (readStoredTheme(store)) return;
			const theme = applyResolved();
			onChange?.(theme);
		});
	}
}
