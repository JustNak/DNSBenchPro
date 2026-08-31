function el(id) {
	return typeof document === "undefined" ? null : document.getElementById(id);
}

export const themeToggle = el("theme-toggle");
export const startScreen = el("start-screen");
export const startButton = el("start-button");
export const configureButton = el("configure-button");
export const helpButton = el("help-button");
export const configSummary = el("config-summary");
export const startRoster = el("start-roster");
export const runAgainButton = el("run-again-button");
export const stopTestButton = el("stop-test-button");
export const exportCsvButton = el("export-csv-button");
export const shareResultsButton = el("share-results-button");
export const resultsScreen = el("results-screen");
export const resultsHero = el("results-hero");
export const heroProgress = el("hero-progress");
export const heroRecommendation = el("hero-recommendation");
export const recommendationText = el("recommendation-text");
export const recommendationMeta = el("recommendation-meta");
export const statusText = el("status-text");
export const progressIndicator = el("progress-indicator");
export const progressBarFill = el("progress-bar-fill");
export const progressPhase = el("progress-phase");
export const progressPercent = el("progress-percent");
export const progressLive = el("progress-live");
export const mainGraphContainer = el("main-graph-bars");
export const detailedGraphsContainer = el("detailed-graphs-container");
export const errorSummary = el("error-summary");
export const errorDetails = el("error-details");
export const comparisonContent = el("comparison-content");
export const recommendationSection = el("recommendation-section");

export const durationModal = el("duration-modal");
export const editProvidersModal = el("edit-providers-modal");
export const editDomainsModal = el("edit-domains-modal");
export const helpModal = el("help-modal");
export const configModal = el("config-modal");

export const editProvidersBtn = el("edit-providers-btn");
export const editDomainsBtn = el("edit-domains-btn");
export const providersList = el("providers-list");
export const addProviderBtn = el("add-provider-btn");
export const saveProvidersBtn = el("save-providers-btn");
export const cancelProvidersBtn = el("cancel-providers-btn");
export const domainsTextarea = el("domains-textarea");
export const saveDomainsBtn = el("save-domains-btn");
export const cancelDomainsBtn = el("cancel-domains-btn");
export const cancelDurationBtn = el("cancel-duration-btn");
export const closeHelpBtn = el("close-help-btn");
export const providersError = el("providers-error");
export const domainsError = el("domains-error");
export const resetDefaultsBtn = el("reset-defaults-btn");
export const openProvidersFromConfig = el("open-providers-from-config");
export const openDomainsFromConfig = el("open-domains-from-config");
export const closeConfigBtn = el("close-config-btn");
export const configProvidersCount = el("config-providers-count");
export const configDomainsCount = el("config-domains-count");
