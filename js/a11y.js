// Shared modal accessibility helpers.

let previouslyFocused = null;
let activeModal = null;
let trapHandler = null;
let keyHandler = null;

function getFocusable(container) {
	return [
		...container.querySelectorAll(
			'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
		),
	].filter(
		(el) =>
			el.offsetParent !== null ||
			el === document.activeElement ||
			getComputedStyle(el).position === "fixed",
	);
}

function clearListeners() {
	if (trapHandler) document.removeEventListener("keydown", trapHandler);
	if (keyHandler) document.removeEventListener("keydown", keyHandler);
	trapHandler = null;
	keyHandler = null;
}

export function openModal(modal, { initialFocus, retainFocus = false } = {}) {
	if (!modal) return;

	const switching = activeModal && activeModal !== modal;
	const refreshing = activeModal === modal;

	if (switching) {
		closeModal(activeModal);
	}

	if (!refreshing) {
		previouslyFocused = document.activeElement;
	}

	activeModal = modal;
	modal.hidden = false;
	modal.classList.add("visible");
	modal.setAttribute("aria-hidden", "false");

	const focusables = getFocusable(modal);
	const focusTarget =
		initialFocus ||
		modal.querySelector("[data-initial-focus]") ||
		focusables[0] ||
		modal.querySelector(".modal-content");

	if (!retainFocus || !refreshing) {
		requestAnimationFrame(() => {
			if (focusTarget && typeof focusTarget.focus === "function") {
				focusTarget.focus();
			}
		});
	}

	clearListeners();

	trapHandler = (e) => {
		if (e.key !== "Tab" || !activeModal) return;
		const items = getFocusable(activeModal);
		if (items.length === 0) {
			e.preventDefault();
			return;
		}
		const first = items[0];
		const last = items[items.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	};

	keyHandler = (e) => {
		if (e.key === "Escape" && activeModal) {
			e.preventDefault();
			closeModal(activeModal);
		}
	};

	document.addEventListener("keydown", trapHandler);
	document.addEventListener("keydown", keyHandler);
}

export function closeModal(modal) {
	const target = modal || activeModal;
	if (!target) return;

	target.classList.remove("visible");
	target.hidden = true;
	target.setAttribute("aria-hidden", "true");

	if (activeModal === target) {
		clearListeners();
		activeModal = null;

		if (
			previouslyFocused &&
			typeof previouslyFocused.focus === "function"
		) {
			previouslyFocused.focus();
		}
		previouslyFocused = null;
	}
}

export function getActiveModal() {
	return activeModal;
}
