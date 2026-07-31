// Manages application state, default settings, and persistence.

export const MAX_LATENCY = 150; // For graph scaling

export const DEFAULT_PROVIDERS = [
	{
		name: "Cloudflare",
		url: "https://1.1.1.1/dns-query",
		type: "post",
		allowCors: true,
	},
	{
		name: "Google",
		url: "https://dns.google/dns-query",
		type: "post",
		allowCors: false,
	},
	{
		name: "Quad9",
		url: "https://dns.quad9.net/dns-query",
		type: "post",
		allowCors: false,
	},
	{
		name: "OpenDNS",
		url: "https://doh.opendns.com/dns-query",
		type: "post",
		allowCors: false,
	},
	{
		name: "AdGuard DNS",
		url: "https://dns.adguard-dns.com/dns-query",
		type: "post",
		allowCors: false,
	},
	{
		name: "ControlD",
		url: "https://freedns.controld.com/p2",
		type: "post",
		allowCors: false,
	},
];

export const DEFAULT_DOMAINS = [
	"google.com",
	"youtube.com",
	"facebook.com",
	"reddit.com",
	"instagram.com",
	"x.com",
];

export const PRESETS = {
	default: {
		label: "Default",
		description: "Popular public resolvers and common sites",
		providers: DEFAULT_PROVIDERS,
		domains: DEFAULT_DOMAINS,
	},
	privacy: {
		label: "Privacy-focused",
		description: "Resolvers known for privacy and blocking",
		providers: [
			{
				name: "Quad9",
				url: "https://dns.quad9.net/dns-query",
				type: "post",
				allowCors: false,
			},
			{
				name: "AdGuard DNS",
				url: "https://dns.adguard-dns.com/dns-query",
				type: "post",
				allowCors: false,
			},
			{
				name: "ControlD",
				url: "https://freedns.controld.com/p2",
				type: "post",
				allowCors: false,
			},
			{
				name: "Cloudflare",
				url: "https://1.1.1.1/dns-query",
				type: "post",
				allowCors: true,
			},
		],
		domains: ["google.com", "wikipedia.org", "reddit.com", "github.com"],
	},
	minimal: {
		label: "Minimal",
		description: "Faster run with fewer providers and sites",
		providers: [
			{
				name: "Cloudflare",
				url: "https://1.1.1.1/dns-query",
				type: "post",
				allowCors: true,
			},
			{
				name: "Google",
				url: "https://dns.google/dns-query",
				type: "post",
				allowCors: false,
			},
			{
				name: "Quad9",
				url: "https://dns.quad9.net/dns-query",
				type: "post",
				allowCors: false,
			},
		],
		domains: ["google.com", "youtube.com", "cloudflare.com"],
	},
};

const state = {
	providers: DEFAULT_PROVIDERS.map((p) => ({ ...p })),
	domains: [...DEFAULT_DOMAINS],
	providerColors: Object.create(null),
	isTestRunning: false,
	allProviderStats: Object.create(null),
	queriedDomains: new Set(),
	runPhase: "idle", // idle | warmup | measure | complete | cancelled
	medianRanks: Object.create(null),
	lastQueryCount: null,
	abortController: null,
};

export function getState() {
	return state;
}

function cloneProviders(providers) {
	return providers.map((p) => ({ ...p }));
}

function makeUniqueProviderName(name, usedNames) {
	let candidate = name;
	let suffix = 2;

	while (usedNames.has(candidate.toLowerCase())) {
		candidate = `${name} (${suffix})`;
		suffix++;
	}

	usedNames.add(candidate.toLowerCase());
	return candidate;
}

function knownProviderMeta(url) {
	const match = DEFAULT_PROVIDERS.find((p) => p.url === url);
	if (match) {
		return { type: match.type, allowCors: match.allowCors };
	}
	for (const preset of Object.values(PRESETS)) {
		const found = preset.providers.find((p) => p.url === url);
		if (found) {
			return { type: found.type, allowCors: found.allowCors };
		}
	}
	return { type: "post", allowCors: false };
}

export function normalizeProviders(providers) {
	const usedNames = new Set();

	return providers
		.map((p) => {
			const name = (p.name || "").trim();
			const url = (p.url || "").trim();
			if (!name || !url) return null;
			const meta = knownProviderMeta(url);
			return {
				name: makeUniqueProviderName(name, usedNames),
				url,
				type: p.type || meta.type,
				allowCors:
					typeof p.allowCors === "boolean" ? p.allowCors : meta.allowCors,
			};
		})
		.filter(Boolean);
}

export function saveSettings() {
	try {
		localStorage.setItem(
			"dnsBenchProviders",
			JSON.stringify(state.providers),
		);
		localStorage.setItem("dnsBenchDomains", JSON.stringify(state.domains));
	} catch {
		/* ignore storage failures (private mode / unavailable) */
	}
}

export function loadSettings() {
	let savedProviders = null;
	let savedDomains = null;
	try {
		savedProviders = localStorage.getItem("dnsBenchProviders");
		savedDomains = localStorage.getItem("dnsBenchDomains");
	} catch {
		return;
	}
	if (savedProviders) {
		try {
			state.providers = normalizeProviders(JSON.parse(savedProviders));
			if (state.providers.length === 0) {
				state.providers = cloneProviders(DEFAULT_PROVIDERS);
			}
		} catch {
			state.providers = cloneProviders(DEFAULT_PROVIDERS);
		}
	}
	if (savedDomains) {
		try {
			const domains = JSON.parse(savedDomains).filter(
				(d) => typeof d === "string" && d.trim().length > 0,
			);
			if (domains.length > 0) state.domains = domains;
		} catch {
			state.domains = [...DEFAULT_DOMAINS];
		}
	}
}

export function resetSettings() {
	state.providers = cloneProviders(DEFAULT_PROVIDERS);
	state.domains = [...DEFAULT_DOMAINS];
	saveSettings();
	generateProviderColors();
}

export function applyPreset(presetId) {
	const preset = PRESETS[presetId];
	if (!preset) return false;
	state.providers = cloneProviders(preset.providers);
	state.domains = [...preset.domains];
	saveSettings();
	generateProviderColors();
	return true;
}

export function estimateTestDuration(queryCount) {
	const providers = state.providers.length;
	const domains = state.domains.length;
	const warmUps = providers * domains;
	const measures = providers * domains * queryCount;
	// ~120ms per warm-up attempt + ~150ms per measure (incl. delay) + gaps
	const seconds = Math.round((warmUps * 0.12 + measures * 0.18 + providers * 0.5));
	if (seconds < 45) return `~${Math.max(15, seconds)}s`;
	if (seconds < 120) return `~${Math.round(seconds / 15) * 15}s`;
	const minutes = seconds / 60;
	if (minutes < 3) return `~${minutes.toFixed(1)} min`;
	return `~${Math.round(minutes)} min`;
}

export function generateProviderColors() {
	const predefinedColors = [
		"#e86a6a",
		"#3dd6c6",
		"#5aa9e6",
		"#6ecf8e",
		"#e6a756",
		"#c084fc",
		"#54a0ff",
		"#7dd3c0",
		"#f368e0",
		"#ff9f43",
	];
	state.providerColors = Object.create(null);
	state.providers.forEach(({ name }, index) => {
		state.providerColors[name] =
			predefinedColors[index % predefinedColors.length];
	});
}

export function createAbortController() {
	if (state.abortController) {
		try {
			state.abortController.abort();
		} catch {
			/* ignore */
		}
	}
	state.abortController = new AbortController();
	return state.abortController;
}

export function getAbortSignal() {
	return state.abortController ? state.abortController.signal : undefined;
}

export function abortActiveRequests() {
	if (state.abortController) {
		try {
			state.abortController.abort();
		} catch {
			/* ignore */
		}
	}
}
