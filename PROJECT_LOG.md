# THE RIZEN — Project Log

## 2026-10-04 — Adam's Pocket foundation

- Added the **Pocket Tools** wall without replacing the original eight content worlds.
- Added device-only Screen Light, rear-camera flashlight request, compass/level request, a countdown timer, floor-area/coverage calculator, dilution calculator, private device note, and personal Google Calendar launch links.
- Updated the installable PWA manifest for **THE RIZEN / Adam's Pocket** and refreshed the offline cache generation.
- The Pocket tool page follows the approved palette: deep purple, burnt orange, turquoise/green, cream, and black.
- No personal calendar, notes, contact information, credentials, product ratios, tracks, inventory, prices, or live channel details were added or invented.
- Notes remain in browser-local storage. Camera/motion access only occurs after a user presses the relevant tool.

## Hosting status

- GitHub Pages API reports no active Pages site as of this entry; GitHub Actions cannot create one with its current token permission (`Resource not accessible by integration`).
- A self-contained public fallback is maintained in `THE_RIZEN_LIVE.html` while GitHub Pages is fixed.

## 2026-10-04 — Nearby places and open-art redesign

- Added **Nearby & Favorite Spots** inside Adam's Pocket using official, user-triggered Google Maps URLs. It can request the visitor's device location only after pressing **Use my location**, then opens a Maps search near the current coordinates.
- Added a browser-local field for the owner's Google Maps saved-list share link. The static public site does not read Google Maps Saved places, Google account data, or location history.
- The Google Maps connector was inspected; it remains disabled. The implemented Maps URL approach requires no API key or connector and reveals no private credential in the site source.
- Replaced the muted generated mural shell with a restored, high-resolution copy of the owner-supplied ADAN UNFILTERED desktop art. The redesign makes the artwork visible behind the full application and removes the heavy boxed-card treatment in favor of open translucent content areas.
- Validated the Google Maps search handoff, browser-local favorite-list save/clear behavior, JavaScript syntax, and the self-contained public fallback. The active GitHub Pages address still returns 404 because a Pages site has not been created for the repository yet.

### Next launch step

- In GitHub **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/(root)**, then save. This will activate the permanent `privateaz9898-tech.github.io/the-rizen-public-site` address directly from the published static site source.
