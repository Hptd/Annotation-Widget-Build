# Annotation Widget

A browser-based annotation tool that lets users create, edit, and manage annotations — element-bound or position-based — directly on any web page. Everything lives inside a Shadow DOM, so styles never leak.

## Features

- **Element annotations** — click any element to pin a note to it; tracks element visibility and position across scroll/resize
- **Position annotations** — click empty space (body/html) to drop a free-positioned note
- **Drag to rebind** — drag a marker onto a different element to reassign it
- **Inline editor** — click a marker to edit text, color, and type inline
- **Panel view** — browse and navigate all annotations in a list panel
- **Visibility toggle** — show/hide all markers at once
- **Read-only mode** — automatically enabled on non-localhost origins; polls `/api/annotations` every 10s for changes
- **Export** — download all annotations as JSON
- **Keyboard shortcut** — `Ctrl+Shift+A` toggles annotation mode
- **Shadow DOM isolation** — no CSS conflicts with the host page

## Quick Start

```bash
# Build the widget
node build.cjs
# Output: ../public/annotation-widget.js
```

Then include it on any page:

```html
<script src="/public/annotation-widget.js"></script>
```

The widget auto-initializes on `DOMContentLoaded`. No config needed.

## API

The widget exposes `window.__AnnotationWidget` for programmatic control:

```js
// Enter/exit annotation mode
__AnnotationWidget.enter()
__AnnotationWidget.exit()
__AnnotationWidget.toggle()

// Visibility
__AnnotationWidget.showAll()
__AnnotationWidget.hideAll()
__AnnotationWidget.toggleVisibility()

// Panel
__AnnotationWidget.openPanel()

// Data
__AnnotationWidget.getAnnotations()  // → Array

// Cleanup
__AnnotationWidget.destroy()
```

## Server Endpoints (read-only mode)

When not running on `localhost`, the widget polls these endpoints:

| Method | Path               | Description              |
|--------|--------------------|--------------------------|
| `GET`  | `/api/annotations` | Fetch all annotations     |
| `POST` | `/api/annotations` | Save all annotations      |

## Project Structure

```
src/
├── index.js          # Entry point — wires renderers to engine, boots widget
├── engine.js         # Core logic: CRUD, annotation mode, visibility, navigation
├── styles.js         # All CSS (injected into Shadow DOM)
├── persistence.js    # localStorage read/write + JSON import/export
├── observer.js       # MutationObserver + IntersectionObserver for element tracking
├── drag.js           # Drag-to-rebind marker interactions
├── selector.js       # CSS selector + XPath generation/resolution
├── utils/
│   ├── dom.js        # DOM helpers (viewport math, path extraction)
│   ├── event-bus.js  # Internal pub/sub
│   ├── throttler.js  # Debounce utility
│   ├── uuid.js       # ID generation
│   └── xpath.js      # XPath builder and resolver
└── renderers/
    ├── marker-renderer.js    # Annotation badge rendering
    ├── editor-renderer.js    # Inline editing popup
    ├── tooltip-renderer.js   # Hover preview
    ├── toolbar-renderer.js   # Floating toolbar (pin/list/eye buttons)
    └── panel-renderer.js     # Annotation list panel
```

## Build

Uses [esbuild](https://esbuild.github.io/) to bundle all modules into a single minified IIFE file targeting ES2020.

```bash
npm install esbuild   # one-time
node build.cjs
```

## License

MIT
