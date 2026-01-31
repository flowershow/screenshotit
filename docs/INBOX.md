- [ ] register screenshotit.app
- [ ] Show loading indicator while capturing screenshot
  - **Idea**: When a screenshot isn't cached and needs to be captured (can take 5-30s), show a spinner or "Capturing..." message instead of the browser just hanging
  - **My take**: Tricky because the URL returns an image. Options:
    1. Return an HTML page with spinner that redirects to image when ready (breaks image embeds)
    2. Return a "please wait" placeholder image that auto-refreshes (still breaks embeds)
    3. Do nothing - browser shows loading, image appears when ready (current behavior)
  - For direct browser access, option 1 could work. For embeds (the main use case), you can't really show a spinner - the embed just waits for the image. Probably not worth the complexity. The cached path is fast; only first request is slow.
