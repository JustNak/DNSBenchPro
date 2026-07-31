// Modal logic: profiles, config, providers, domains, help.

import * as dom from "./dom.js";
import * as ui from "./ui.js";
import { openModal, closeModal } from "./a11y.js";
import {
	getState,
	saveSettings,
	generateProviderColors,
	normalizeProviders,
	applyPreset,
	resetSettings,
	estimateTestDuration,
	PRESETS,
} from "./config.js";

let providerDraft = null;

function isValidHttpsUrl(value) {
	try {
		const url = new URL(value);
		return url.protocol === "https:";
	} catch {
		return false;
	}
}

function isValidDomain(value) {
	const domain = value.trim();
	if (domain.length < 1 || domain.length > 253) return false;

	const labels = domain.split(".");
	return (
		labels.length >= 2 &&
		labels.every(
			(label) =>
				label.length >= 1 &&
				label.length <= 63 &&
				/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
		)
	);
}

function openEditProviders() {
	const state = getState();
	providerDraft = state.providers.map((provider) => ({ ...provider }));
	renderEditProviders();
}

function syncProviderDraftFromInputs() {
	if (!providerDraft) return;

	const valuesByIndex = {};
	document.querySelectorAll(".provider-item input").forEach((item) => {
		const index = Number(item.dataset.index);
		if (!valuesByIndex[index]) valuesByIndex[index] = {};
		valuesByIndex[index][item.dataset.field] = item.value;
	});

	providerDraft = providerDraft.map((provider, index) => ({
		...provider,
		...(valuesByIndex[index] || {}),
	}));
}

function renderEditProviders() {
	dom.providersList.innerHTML = "";
	if (dom.providersError) {
		dom.providersError.hidden = true;
		dom.providersError.textContent = "";
	}

	(providerDraft || []).forEach((provider, index) => {
		const div = document.createElement("div");
		div.className = "provider-item";
		div.innerHTML = `
            <div class="provider-inputs">
                <div class="form-group">
                    <label for="provider-name-${index}">Provider Name</label>
                    <input id="provider-name-${index}" type="text" placeholder="e.g., Cloudflare" value="${escapeAttr(
						provider.name,
					)}" data-index="${index}" data-field="name">
                </div>
                <div class="form-group">
                    <label for="provider-url-${index}">DoH URL</label>
                    <input id="provider-url-${index}" type="url" placeholder="https://..." value="${escapeAttr(
						provider.url,
					)}" data-index="${index}" data-field="url">
                </div>
            </div>
            <button type="button" class="remove-provider-btn" data-index="${index}" title="Remove Provider" aria-label="Remove provider">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            </button>
        `;
		dom.providersList.appendChild(div);
	});
	openModal(dom.editProvidersModal);
}

function escapeAttr(value) {
	const entities = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	};

	return String(value || "").replace(/[&<>"']/g, (character) => entities[character]);
}

function openEditDomains() {
	const state = getState();
	dom.domainsTextarea.value = state.domains.join("\n");
	if (dom.domainsError) {
		dom.domainsError.hidden = true;
		dom.domainsError.textContent = "";
	}
	openModal(dom.editDomainsModal);
}

function saveProviders() {
	const items = document.querySelectorAll(".provider-item input");
	const providerData = {};

	items.forEach((item) => {
		const index = item.dataset.index;
		if (!providerData[index]) providerData[index] = {};
		providerData[index][item.dataset.field] = item.value.trim();
	});

	const draft = Object.values(providerData);
	const errors = [];

	if (draft.length === 0) {
		errors.push("Add at least one provider.");
	}

	draft.forEach((p, i) => {
		if (!p.name) errors.push(`Provider ${i + 1}: name is required.`);
		if (!p.url) errors.push(`Provider ${i + 1}: DoH URL is required.`);
		else if (!isValidHttpsUrl(p.url)) {
			errors.push(`Provider ${i + 1}: URL must be https://`);
		}
	});

	const seenNames = new Set();
	draft.forEach((provider) => {
		if (!provider.name) return;
		const key = provider.name.toLowerCase();
		if (seenNames.has(key)) {
			errors.push(`Provider names must be unique: ${provider.name}`);
		}
		seenNames.add(key);
	});

	if (errors.length) {
		if (dom.providersError) {
			dom.providersError.hidden = false;
			dom.providersError.textContent = errors[0];
		}
		return;
	}

	const state = getState();
	const previousByUrl = Object.fromEntries(
		state.providers.map((p) => [p.url, p]),
	);
	const normalized = normalizeProviders(
		draft.map((p) => ({
			...p,
			...(previousByUrl[p.url] || {}),
			name: p.name,
			url: p.url,
		})),
	);

	state.providers = normalized;
	saveSettings();
	generateProviderColors();
	ui.updateConfigSummary();
	providerDraft = null;
	closeModal(dom.editProvidersModal);
}

function saveDomains() {
	const domains = dom.domainsTextarea.value
		.split("\n")
		.map((d) => d.trim())
		.filter((d) => d.length > 0);

	const errors = [];
	if (domains.length === 0) {
		errors.push("Add at least one domain.");
	}
	const invalid = domains.find((d) => !isValidDomain(d));
	if (invalid) {
		errors.push(`Invalid domain: ${invalid}`);
	}

	if (errors.length) {
		if (dom.domainsError) {
			dom.domainsError.hidden = false;
			dom.domainsError.textContent = errors[0];
		}
		return;
	}

	const state = getState();
	state.domains = domains;
	saveSettings();
	ui.updateConfigSummary();
	closeModal(dom.editDomainsModal);
}

function openConfigModal() {
	ui.updateConfigSummary();
	openModal(dom.configModal);
}

function openDurationModal() {
	ui.refreshDurationEstimates(estimateTestDuration);
	openModal(dom.durationModal);
}

function canStart() {
	const state = getState();
	return state.providers.length > 0 && state.domains.length > 0;
}

export function initModals(startTestCallback, stopTestCallback) {
	[
		dom.durationModal,
		dom.editProvidersModal,
		dom.editDomainsModal,
		dom.helpModal,
		dom.configModal,
	].forEach((modal) => {
		if (!modal) return;
		modal.hidden = true;
		modal.inert = true;
		modal.setAttribute("aria-hidden", "true");
		modal.addEventListener("click", (e) => {
			if (e.target === modal) closeModal(modal);
		});
	});

	dom.durationModal.addEventListener("click", (e) => {
		const button = e.target.closest(".duration-btn");
		if (button) {
			closeModal(dom.durationModal);
			const queries = parseInt(button.dataset.queries, 10);
			startTestCallback(queries);
		}
	});

	if (dom.cancelDurationBtn) {
		dom.cancelDurationBtn.addEventListener("click", () =>
			closeModal(dom.durationModal),
		);
	}

	if (dom.editProvidersBtn) {
		dom.editProvidersBtn.addEventListener("click", openEditProviders);
	}
	if (dom.openProvidersFromConfig) {
		dom.openProvidersFromConfig.addEventListener("click", () => {
			closeModal(dom.configModal);
			openEditProviders();
		});
	}

	dom.providersList.addEventListener("click", (e) => {
		const removeButton = e.target.closest(".remove-provider-btn");
		if (removeButton) {
			syncProviderDraftFromInputs();
			const index = parseInt(removeButton.dataset.index, 10);
			providerDraft.splice(index, 1);
			renderEditProviders();
		}
	});

	dom.addProviderBtn.addEventListener("click", () => {
		syncProviderDraftFromInputs();
		providerDraft.push({
			name: "",
			url: "",
			type: "post",
			allowCors: false,
		});
		renderEditProviders();
	});

	dom.saveProvidersBtn.addEventListener("click", saveProviders);
	dom.cancelProvidersBtn.addEventListener("click", () => {
		providerDraft = null;
		closeModal(dom.editProvidersModal);
	});

	if (dom.editDomainsBtn) {
		dom.editDomainsBtn.addEventListener("click", openEditDomains);
	}
	if (dom.openDomainsFromConfig) {
		dom.openDomainsFromConfig.addEventListener("click", () => {
			closeModal(dom.configModal);
			openEditDomains();
		});
	}

	dom.saveDomainsBtn.addEventListener("click", saveDomains);
	dom.cancelDomainsBtn.addEventListener("click", () =>
		closeModal(dom.editDomainsModal),
	);

	if (dom.configureButton) {
		dom.configureButton.addEventListener("click", openConfigModal);
	}
	if (dom.closeConfigBtn) {
		dom.closeConfigBtn.addEventListener("click", () =>
			closeModal(dom.configModal),
		);
	}

	if (dom.helpButton) {
		dom.helpButton.addEventListener("click", () => openModal(dom.helpModal));
	}
	if (dom.closeHelpBtn) {
		dom.closeHelpBtn.addEventListener("click", () =>
			closeModal(dom.helpModal),
		);
	}

	document.querySelectorAll("[data-preset]").forEach((btn) => {
		btn.addEventListener("click", () => {
			const id = btn.dataset.preset;
			if (applyPreset(id)) {
				ui.updateConfigSummary();
				const preset = PRESETS[id];
				if (dom.configSummary) {
					showToast(`Applied ${preset.label} preset`);
				}
			}
		});
	});

	if (dom.resetDefaultsBtn) {
		dom.resetDefaultsBtn.addEventListener("click", () => {
			resetSettings();
			ui.updateConfigSummary();
			showToast("Reset to defaults");
		});
	}

	dom.startButton.addEventListener("click", () => {
		if (dom.startButton.disabled) return;
		if (!canStart()) {
			showToast("Add at least one provider and one domain.");
			openConfigModal();
			return;
		}
		openDurationModal();
	});

	if (dom.stopTestButton && stopTestCallback) {
		dom.stopTestButton.addEventListener("click", stopTestCallback);
	}
}

function showToast(message) {
	let toast = document.getElementById("toast");
	if (!toast) {
		toast = document.createElement("div");
		toast.id = "toast";
		toast.className = "toast";
		toast.setAttribute("role", "status");
		document.body.appendChild(toast);
	}
	toast.textContent = message;
	toast.classList.add("visible");
	clearTimeout(showToast._timer);
	showToast._timer = setTimeout(() => {
		toast.classList.remove("visible");
	}, 2200);
}

export { openDurationModal };
