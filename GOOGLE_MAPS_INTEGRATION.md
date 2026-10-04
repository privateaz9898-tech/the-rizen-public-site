# Google Maps Integration — THE RIZEN / Adam's Pocket

## Selected approach

THE RIZEN uses the browser's location permission only after the owner presses **Use my location**. The coordinate remains in the active browser session and is used solely to create a user-triggered Google Maps URL. It is not sent to THE RIZEN, GitHub, or an application server.

The Favorite Spots field accepts a Google Maps shared-list URL and saves it only in the current browser's local storage. This public static site does not read a person's private Google Maps Saved places, Google account data, or map history.

## Official source

- [Google Maps URLs — Get Started](https://developers.google.com/maps/documentation/urls/get-started): Google documents universal cross-platform Maps URLs for opening searches, directions, navigation, and map views.

## URL pattern used

```text
https://www.google.com/maps/search/?api=1&query=<URL-encoded search or coordinate query>
```

## Current boundary

The Google Maps connector was inspected but remains disabled. The Maps URL fallback does not need an API key, does not consume Google Maps Platform data, and does not expose a private API key in the static website.
