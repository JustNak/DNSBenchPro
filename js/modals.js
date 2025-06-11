// frontend/js/modals.js
// Manages the logic and event handling for all modals.

import * as dom from "./dom.js";
import { getState, saveSettings, generateProviderColors } from "./config.js";

function openModal(modal) {
	modal.classList.add("visible");
}

function closeModal(modal) {
	modal.classList.remove("visible");
}

function openEditProviders() {
	const state = getState();
	dom.providersList.innerHTML = "";
	state.providers.forEach((provider, index) => {
		const div = document.createElement("div");
		div.className = "provider-item";
		// --- FIX: Replaced simple inputs with a structured, labeled layout ---
		div.innerHTML = `
            <div class="provider-inputs">
                <div class="form-group">
                    <label for="provider-name-${index}">Provider Name</label>
                    <input id="provider-name-${index}" type="text" placeholder="e.g., Cloudflare" value="${
			provider.name
		}" data-index="${index}" data-field="name">
                </div>
                <div class="form-group">
                    <label for="provider-url-${index}">DoH URL</label>
                    <input id="provider-url-${index}" type="text" placeholder="https://..." value="${
			provider.url
		}" data-index="${index}" data-field="url">
                </div>
            </div>
            <button class="remove-provider-btn" data-index="${index}" title="Remove Provider">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;
		dom.providersList.appendChild(div);
	});
	openModal(dom.editProvidersModal);
}

function openEditDomains() {
	const state = getState();
	dom.domainsTextarea.value = state.domains.join("\n");
	openModal(dom.editDomainsModal);
}

function saveProviders() {
	const state = getState();
	const newProviders = [];
	// This selector still works with the new structure
	const items = document.querySelectorAll(".provider-item input");
	const providerData = {};

	items.forEach((item) => {
		const index = item.dataset.index;
		if (!providerData[index]) providerData[index] = {};
		providerData[index][item.dataset.field] = item.value.trim();
	});

	for (const index in providerData) {
		const { name, url } = providerData[index];
		if (name && url) {
			newProviders.push({ name, url });
		}
	}

	if (newProviders.length > 0) {
		state.providers = newProviders;
		saveSettings();
		generateProviderColors();
		closeModal(dom.editProvidersModal);
	}
}

function saveDomains() {
	const state = getState();
	const domains = dom.domainsTextarea.value
		.split("\n")
		.map((d) => d.trim())
		.filter((d) => d.length > 0);
	if (domains.length > 0) {
		state.domains = domains;
		saveSettings();
		closeModal(dom.editDomainsModal);
	}
}

export function initModals(startTestCallback) {
	// General modal close behavior
	[dom.durationModal, dom.editProvidersModal, dom.editDomainsModal].forEach(
		(modal) => {
			modal.addEventListener("click", (e) => {
				if (e.target === modal) closeModal(modal);
			});
		},
	);

	// Duration modal
	dom.durationModal.addEventListener("click", (e) => {
		const button = e.target.closest(".duration-btn");
		if (button) {
			closeModal(dom.durationModal);
			const queries = parseInt(button.dataset.queries, 10);
			startTestCallback(queries);
		}
	});

	// Edit Providers modal
	dom.editProvidersBtn.addEventListener("click", openEditProviders);
	dom.providersList.addEventListener("click", (e) => {
		// --- FIX: Use .closest() for a more robust click target ---
		const removeButton = e.target.closest(".remove-provider-btn");
		if (removeButton) {
			const state = getState();
			const index = parseInt(removeButton.dataset.index, 10);
			state.providers.splice(index, 1);
			openEditProviders(); // Refresh list
		}
	});
	dom.addProviderBtn.addEventListener("click", () => {
		getState().providers.push({ name: "", url: "" });
		openEditProviders();
	});
	dom.saveProvidersBtn.addEventListener("click", saveProviders);
	dom.cancelProvidersBtn.addEventListener("click", () =>
		closeModal(dom.editProvidersModal),
	);

	// Edit Domains modal
	dom.editDomainsBtn.addEventListener("click", openEditDomains);
	dom.saveDomainsBtn.addEventListener("click", saveDomains);
	dom.cancelDomainsBtn.addEventListener("click", () =>
		closeModal(dom.editDomainsModal),
	);

	// Main start button
	dom.startButton.addEventListener("click", () => {
		if (!dom.startButton.disabled) openModal(dom.durationModal);
	});
}