# Bug Report - LiveSub Desktop (Electron)

**Date**: 2026-03-05
**Reviewer**: qa-agent

---

## Bug #1

**Severity**: Low
**Location**: `src/renderer/index.html:8`
**Category**: Code Defect
**Problem**: The Content-Security-Policy meta tag uses `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` which does not include a `connect-src` directive. In production (when loading from `file://`), the Web Speech API relies on connecting to Google's speech recognition servers (`wss://www.google.com`). While Electron may not enforce CSP meta tags as strictly as a regular browser, this could cause issues on certain platforms or future Electron versions. Additionally, if CSP is enforced, the `default-src 'self'` would block WebSocket connections needed by Web Speech API.
**Fix**: Not blocking; Electron typically does not enforce CSP meta tags for main frame `file://` loads. However, for robustness, consider removing the CSP meta tag entirely (Electron apps should use `session.defaultSession.webRequest` for CSP if needed) or adding `connect-src 'self' wss://www.google.com https://www.google.com`.
**Status**: Not fixed (low risk, informational)

---

## Bug #2

**Severity**: Low
**Location**: `src/main/store.ts:24`
**Category**: Code Defect
**Problem**: The `schema` variable is typed as `Record<string, unknown>` and then cast to `any` when passed to `new Store<AppConfig>({ schema: schema as any })`. This bypasses type safety. The electron-store library expects a specific JSON Schema format, and the `as any` cast hides potential mismatches.
**Fix**: Use the proper `Schema<AppConfig>` type from electron-store instead of `Record<string, unknown>` with `as any`. This is a minor type safety improvement, not a runtime bug.
**Status**: Not fixed (cosmetic, no runtime impact)

---

## Bug #3

**Severity**: Low
**Location**: `src/main/translator.ts:42`
**Category**: Security Concern
**Problem**: Google API key is passed as a URL query parameter (`?key=...`). While this is the standard Google API usage pattern, the key could appear in server logs or network inspection. This is inherent to Google's API design and not a bug per se, but worth noting.
**Fix**: No action needed. This is how Google Cloud Translation API v2 works. The key is not exposed to the renderer process, which is the important security boundary.
**Status**: Accepted (by design)

---

No critical or high-severity bugs were found. The codebase is well-structured and follows security best practices for Electron applications.
