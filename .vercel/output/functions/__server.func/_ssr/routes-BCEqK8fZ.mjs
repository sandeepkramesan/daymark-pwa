import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as previewPathPrefix } from "./router-P2mPztuS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BCEqK8fZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function asset(path) {
	if (typeof window === "undefined") return path;
	return `${previewPathPrefix(window.location.hostname, window.location.pathname) ?? ""}${path}`;
}
function Home() {
	(0, import_react.useEffect)(() => {
		const host = document.getElementById("daymark-root");
		if (!host) return;
		let cancel = false;
		(async () => {
			try {
				const res = await fetch(asset("/daymark/index.html"));
				if (!res.ok) throw new Error(`Daymark failed to load (${res.status})`);
				const doc = new DOMParser().parseFromString(await res.text(), "text/html");
				if (cancel) return;
				doc.body.querySelectorAll("script").forEach((node) => node.remove());
				host.replaceChildren(...Array.from(doc.body.childNodes));
				await loadScript(asset("/daymark/app.js"));
				if (cancel) return;
				window.daymarkBoot?.();
			} catch (error) {
				if (cancel) return;
				host.textContent = error instanceof Error ? error.message : "Daymark could not be loaded.";
			}
		})();
		return () => {
			cancel = true;
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		id: "daymark-root",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			id: "splash",
			"aria-label": "Daymark",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "splash-logo",
				children: "✓"
			})
		})
	});
}
function loadScript(src) {
	if (window.daymarkBoot) return Promise.resolve();
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = src;
		script.type = "module";
		script.onload = () => resolve();
		script.onerror = () => reject(/* @__PURE__ */ new Error("Daymark could not be loaded."));
		document.body.appendChild(script);
	});
}
//#endregion
export { Home as component };
