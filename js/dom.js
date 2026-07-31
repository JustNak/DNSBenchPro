// Centralizes DOM element selections.

export const startScreen = document.getElementById("start-screen");
export const startButton = document.getElementById("start-button");
export const configureButton = document.getElementById("configure-button");
export const helpButton = document.getElementById("help-button");
export const configSummary = document.getElementById("config-summary");
export const runAgainButton = document.getElementById("run-again-button");
export const stopTestButton = document.getElementById("stop-test-button");
export const exportCsvButton = document.getElementById("export-csv-button");
export const shareResultsButton = document.getElementById(
	"share-results-button",
);
export const resultsScreen = document.getElementById("results-screen");
export const resultsHero = document.getElementById("results-hero");
export const heroProgress = document.getElementById("hero-progress");
export const heroRecommendation = document.getElementById(
	"hero-recommendation",
);
export const recommendationText = document.getElementById(
	"recommendation-text",
);
export const recommendationMeta = document.getElementById(
	"recommendation-meta",
);
export const statusText = document.getElementById("status-text");
export const progressIndicator = document.getElementById("progress-indicator");
export const progressBarFill = document.getElementById("progress-bar-fill");
export const progressPhase = document.getElementById("progress-phase");
export const progressPercent = document.getElementById("progress-percent");
export const progressLive = document.getElementById("progress-live");
export const mainGraphContainer = document.getElementById("main-graph-bars");
export const detailedGraphsContainer = document.getElementById(
	"detailed-graphs-container",
);
export const errorSummary = document.getElementById("error-summary");
export const errorDetails = document.getElementById("error-details");
export const comparisonContent = document.getElementById("comparison-content");
export const recommendationSection = document.getElementById(
	"recommendation-section",
);

// Modals
export const durationModal = document.getElementById("duration-modal");
export const editProvidersModal = document.getElementById(
	"edit-providers-modal",
);
export const editDomainsModal = document.getElementById("edit-domains-modal");
export const helpModal = document.getElementById("help-modal");
export const configModal = document.getElementById("config-modal");

// Modal controls
export const editProvidersBtn = document.getElementById("edit-providers-btn");
export const editDomainsBtn = document.getElementById("edit-domains-btn");
export const providersList = document.getElementById("providers-list");
export const addProviderBtn = document.getElementById("add-provider-btn");
export const saveProvidersBtn = document.getElementById("save-providers-btn");
export const cancelProvidersBtn = document.getElementById(
	"cancel-providers-btn",
);
export const domainsTextarea = document.getElementById("domains-textarea");
export const saveDomainsBtn = document.getElementById("save-domains-btn");
export const cancelDomainsBtn = document.getElementById("cancel-domains-btn");
export const cancelDurationBtn = document.getElementById("cancel-duration-btn");
export const closeHelpBtn = document.getElementById("close-help-btn");
export const providersError = document.getElementById("providers-error");
export const domainsError = document.getElementById("domains-error");
export const durationEstimates = document.querySelectorAll("[data-estimate]");
export const presetButtons = document.querySelectorAll("[data-preset]");
export const resetDefaultsBtn = document.getElementById("reset-defaults-btn");
export const openProvidersFromConfig = document.getElementById(
	"open-providers-from-config",
);
export const openDomainsFromConfig = document.getElementById(
	"open-domains-from-config",
);
export const closeConfigBtn = document.getElementById("close-config-btn");
export const configProvidersCount = document.getElementById(
	"config-providers-count",
);
export const configDomainsCount = document.getElementById(
	"config-domains-count",
);
