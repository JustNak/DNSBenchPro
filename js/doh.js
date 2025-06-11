// frontend/js/doh.js

// createDnsQuery is only needed for POST requests.
function createDnsQuery(domain) {
	if (!domain || typeof domain !== "string") {
		throw new Error("Invalid domain");
	}
	const labels = domain.toLowerCase().split(".");
	let qnameLength = 0;
	labels.forEach((label) => {
		if (label.length > 63) throw new Error("Label too long");
		qnameLength += 1 + label.length;
	});
	qnameLength += 1;
	const totalLength = 12 + qnameLength + 4;
	const buffer = new ArrayBuffer(totalLength);
	const view = new DataView(buffer);
	let offset = 0;
	const transactionId = Math.floor(Math.random() * 65536);
	view.setUint16(offset, transactionId, false);
	offset += 2;
	view.setUint16(offset, 0x0100, false);
	offset += 2;
	view.setUint16(offset, 1, false);
	offset += 2;
	view.setUint16(offset, 0, false);
	offset += 2;
	view.setUint16(offset, 0, false);
	offset += 2;
	view.setUint16(offset, 0, false);
	offset += 2;
	labels.forEach((label) => {
		view.setUint8(offset, label.length);
		offset += 1;
		for (let i = 0; i < label.length; i++) {
			view.setUint8(offset, label.charCodeAt(i));
			offset += 1;
		}
	});
	view.setUint8(offset, 0);
	offset += 1;
	view.setUint16(offset, 1, false);
	offset += 2;
	view.setUint16(offset, 1, false);
	return new Uint8Array(buffer);
}

export async function measureDohLatency(provider, domain) {
	const { url, type = "post", allowCors = false } = provider;

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 5000);

	try {
		const startTime = performance.now();
		let fetchPromise;

		// --- FIX: Handle GET and POST methods separately ---
		if (type === "get") {
			const urlWithParams = new URL(url);
			urlWithParams.searchParams.append("name", domain);
			urlWithParams.searchParams.append("type", "A");
			fetchPromise = fetch(urlWithParams, {
				method: "GET",
				headers: { Accept: "application/dns-json" },
				signal: controller.signal,
			});
		} else {
			// Default to POST
			const queryMessage = createDnsQuery(domain);
			const fetchOptions = {
				method: "POST",
				signal: controller.signal,
				mode: allowCors ? "cors" : "no-cors",
				body: queryMessage,
				headers: {},
			};
			if (allowCors) {
				fetchOptions.headers["Content-Type"] = "application/dns-message";
			}
			fetchPromise = fetch(url, fetchOptions);
		}

		const response = await fetchPromise;
		clearTimeout(timeoutId);

		if (allowCors && !response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const endTime = performance.now();
		return endTime - startTime;
	} catch (error) {
		clearTimeout(timeoutId);
		return null;
	}
}
