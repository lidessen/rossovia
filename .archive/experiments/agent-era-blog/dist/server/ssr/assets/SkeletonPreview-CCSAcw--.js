import { a as require_react, o as __toESM, t as require_jsx_runtime } from "../index.js";
//#region node_modules/react-loading-skeleton/dist/index.js
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
/**
* @internal
*/
var SkeletonThemeContext = import_react.createContext({});
var defaultEnableAnimation = true;
function styleOptionsToCssProperties({ baseColor, highlightColor, width, height, borderRadius, circle, direction, duration, enableAnimation = defaultEnableAnimation, customHighlightBackground }) {
	const style = {};
	if (direction === "rtl") style["--animation-direction"] = "reverse";
	if (typeof duration === "number") style["--animation-duration"] = `${duration}s`;
	if (!enableAnimation) style["--pseudo-element-display"] = "none";
	if (typeof width === "string" || typeof width === "number") style.width = width;
	if (typeof height === "string" || typeof height === "number") style.height = height;
	if (typeof borderRadius === "string" || typeof borderRadius === "number") style.borderRadius = borderRadius;
	if (circle) style.borderRadius = "50%";
	if (typeof baseColor !== "undefined") style["--base-color"] = baseColor;
	if (typeof highlightColor !== "undefined") style["--highlight-color"] = highlightColor;
	if (typeof customHighlightBackground === "string") style["--custom-highlight-background"] = customHighlightBackground;
	return style;
}
function Skeleton({ count = 1, wrapper: Wrapper, className: customClassName, containerClassName, containerTestId, circle = false, style: styleProp, ...originalPropsStyleOptions }) {
	var _a, _b, _c;
	const contextStyleOptions = import_react.useContext(SkeletonThemeContext);
	const propsStyleOptions = { ...originalPropsStyleOptions };
	for (const [key, value] of Object.entries(originalPropsStyleOptions)) if (typeof value === "undefined") delete propsStyleOptions[key];
	const styleOptions = {
		...contextStyleOptions,
		...propsStyleOptions,
		circle
	};
	const style = {
		...styleProp,
		...styleOptionsToCssProperties(styleOptions)
	};
	let className = "react-loading-skeleton";
	if (customClassName) className += ` ${customClassName}`;
	const inline = (_a = styleOptions.inline) !== null && _a !== void 0 ? _a : false;
	const elements = [];
	const countCeil = Math.ceil(count);
	for (let i = 0; i < countCeil; i++) {
		let thisStyle = style;
		if (countCeil > count && i === countCeil - 1) {
			const width = (_b = thisStyle.width) !== null && _b !== void 0 ? _b : "100%";
			const fractionalPart = count % 1;
			const fractionalWidth = typeof width === "number" ? width * fractionalPart : `calc(${width} * ${fractionalPart})`;
			thisStyle = {
				...thisStyle,
				width: fractionalWidth
			};
		}
		const skeletonSpan = import_react.createElement("span", {
			className,
			style: thisStyle,
			key: i
		}, "‌");
		if (inline) elements.push(skeletonSpan);
		else elements.push(import_react.createElement(import_react.Fragment, { key: i }, skeletonSpan, import_react.createElement("br", null)));
	}
	return import_react.createElement("span", {
		className: containerClassName,
		"data-testid": containerTestId,
		"aria-live": "polite",
		"aria-busy": (_c = styleOptions.enableAnimation) !== null && _c !== void 0 ? _c : defaultEnableAnimation
	}, Wrapper ? elements.map((el, i) => import_react.createElement(Wrapper, { key: i }, el)) : elements);
}
function SkeletonTheme({ children, ...styleOptions }) {
	return import_react.createElement(SkeletonThemeContext.Provider, { value: styleOptions }, children);
}
//#endregion
//#region app/_sites-preview/SkeletonPreview.tsx
var import_jsx_runtime = require_jsx_runtime();
var sidebarWidths = [
	74,
	58,
	82,
	66,
	71,
	54
];
var articleWidths = [
	100,
	97,
	94,
	98,
	86
];
function SkeletonPreview() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SkeletonTheme, {
		baseColor: "#eceae7",
		highlightColor: "#f9f8f6",
		duration: 2.8,
		borderRadius: "0.5rem",
		inline: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "sites-skeleton-preview",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "sites-skeleton-header",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "sites-skeleton-brand",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
								circle: true,
								width: 34,
								height: 34
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
								width: 112,
								height: 14
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "sites-skeleton-search",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
								width: "100%",
								height: 36,
								borderRadius: 10,
								containerClassName: "sites-skeleton-search-placeholder"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "sites-skeleton-actions",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
								circle: true,
								width: 34,
								height: 34
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
								width: 94,
								height: 34,
								borderRadius: 8
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "sites-skeleton-shell",
					"aria-hidden": "true",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
							className: "sites-skeleton-sidebar",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
									width: 66,
									height: 10,
									containerClassName: "sites-skeleton-sidebar-heading"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "sites-skeleton-sidebar-list",
									children: sidebarWidths.map((width, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sites-skeleton-sidebar-row",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											width: 18,
											height: 18,
											borderRadius: 5
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											width: `${width}%`,
											height: 10
										})]
									}, `${width}-${index}`))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
									width: 92,
									height: 10,
									containerClassName: "sites-skeleton-sidebar-heading sites-skeleton-sidebar-heading-secondary"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "sites-skeleton-sidebar-list",
									children: sidebarWidths.slice(0, 3).map((width, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "sites-skeleton-sidebar-row",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											width: 18,
											height: 18,
											borderRadius: 5
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											width: `${width - 12}%`,
											height: 10
										})]
									}, `secondary-${width}-${index}`))
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
							className: "sites-skeleton-article",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sites-skeleton-article-heading",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											width: 118,
											height: 10
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											width: "82%",
											height: 28
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											width: "58%",
											height: 28
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
									containerClassName: "sites-skeleton-article-media",
									height: "100%",
									borderRadius: 14
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "sites-skeleton-article-meta",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											circle: true,
											width: 32,
											height: 32
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "sites-skeleton-article-author",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
												width: 116,
												height: 10
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
												width: 82,
												height: 8
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
											width: 76,
											height: 10,
											containerClassName: "sites-skeleton-article-date"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "sites-skeleton-article-copy",
									children: articleWidths.map((width, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
										width: `${width}%`,
										height: 10
									}, `${width}-${index}`))
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
							className: "sites-skeleton-rail",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "sites-skeleton-rail-card",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
										circle: true,
										width: 48,
										height: 48
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
										width: "62%",
										height: 13
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
										width: "92%",
										height: 9
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
										width: "74%",
										height: 9
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
										width: 104,
										height: 34,
										borderRadius: 8
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "sites-skeleton-rail-card sites-skeleton-rail-card-compact",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
										width: "54%",
										height: 13
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
										height: 72,
										borderRadius: 10
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
										width: "78%",
										height: 48,
										borderRadius: 10
									})
								]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "sites-skeleton-status",
					role: "status",
					"aria-live": "polite",
					"aria-atomic": "true",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "sites-skeleton-status-kicker",
							children: "Building your site"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { children: "Your site is taking shape" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Your first version will appear here automatically when it’s ready." })
					]
				})
			]
		})
	});
}
//#endregion
export { SkeletonPreview };
