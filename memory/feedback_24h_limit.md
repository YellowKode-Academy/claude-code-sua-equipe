---
name: feedback_24h_limit
description: Any 429, exhausted quota or CAPTCHA from a third-party service = stop the automation for 24 h
metadata:
  type: feedback
---

Hit a limit, the automation stops for 24 hours. No retry, no switching routes, no workaround.

**Why:** an automatic retry on a paid call that returned `"error": null` repeated the charge on every attempt, and the monthly bill quadrupled. In another case, a large file copy made the provider suspend the whole machine.

**How to apply:** in scripts and flows, treat 429 as the end of the round. A paid call has no pure retry: read the full response and decide. After touching a paid call, check on the next run that exactly 1 charge came out per call.
