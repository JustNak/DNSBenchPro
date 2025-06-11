// frontend/js/config.js
// Manages application state, default settings, and persistence.

// API_BASE is no longer needed.
export const MAX_LATENCY = 150; // For graph scaling

// Default state, can be overridden by localStorage
const state = {
	// Updated provider list with DNS.SB removed
	providers: [
		{
			name: "Cloudflare",
			url: "https://1.1.1.1/dns-query",
			type: "post",
			allowCors: true, // Cloudflare supports CORS
		},
		{
			name: "Google",
			url: "https://dns.google/dns-query",
			type: "post",
			allowCors: false, // Google does not
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
	],
	// Updated default list of websites to test
	domains: [
		"google.com",
		"youtube.com",
		"facebook.com",
		"reddit.com",
		"instagram.com",
		"x.com", // Updated from twitter.com
	],
	providerColors: {},
	isTestRunning: false,
	allProviderStats: {},
	queriedDomains: new Set(),
};

export function getState() {
	return state;
}

// This function saves the user's custom lists to their browser's localStorage.
export function saveSettings() {
	localStorage.setItem("dnsBenchProviders", JSON.stringify(state.providers));
	localStorage.setItem("dnsBenchDomains", JSON.stringify(state.domains));
}

// This function loads the user's custom lists when they revisit the page.
// If no custom lists are found, it uses the default lists defined above.
export function loadSettings() {
	const savedProviders = localStorage.getItem("dnsBenchProviders");
	const savedDomains = localStorage.getItem("dnsBenchDomains");
	if (savedProviders) {
		state.providers = JSON.parse(savedProviders);
	}
	if (savedDomains) {
		state.domains = JSON.parse(savedDomains);
	}
}

export function generateProviderColors() {
	const predefinedColors = [
		"#ff6b6b",
		"#4ecdc4",
		"#45b7d1",
		"#96ceb4",
		"#feca57",
		"#ff9ff3",
		"#54a0ff",
		"#5f27cd",
		"#f368e0",
		"#ff9f43",
	];
	state.providers.forEach(({ name }, index) => {
		state.providerColors[name] =
			predefinedColors[index % predefinedColors.length];
	});
}
