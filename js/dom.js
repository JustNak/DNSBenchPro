// frontend/js/dom.js
// Centralizes all DOM element selections for easy access and maintenance.

export const startScreen = document.getElementById("start-screen");
export const startButton = document.getElementById("start-button");
export const runAgainButton = document.getElementById("run-again-button");
export const exportCsvButton = document.getElementById("export-csv-button");
export const resultsScreen = document.getElementById("results-screen");
export const statusText = document.getElementById("status-text");
export const progressIndicator = document.getElementById("progress-indicator");
export const mainGraphContainer = document.getElementById("main-graph-bars");
export const detailedGraphsContainer = document.getElementById(
	"detailed-graphs-container",
);
export const errorSummary = document.getElementById("error-summary");
export const errorDetails = document.getElementById("error-details");
export const connectionStatus = document.getElementById("connection-status");
export const comparisonContent = document.getElementById("comparison-content");
export const recommendationSection = document.getElementById(
	"recommendation-section",
);
export const recommendationText = document.getElementById(
	"recommendation-text",
);

// Modals
export const durationModal = document.getElementById("duration-modal");
export const editProvidersModal = document.getElementById(
	"edit-providers-modal",
);
export const editDomainsModal = document.getElementById("edit-domains-modal");

// Modal Controls
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