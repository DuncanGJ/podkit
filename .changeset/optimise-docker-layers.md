---
"@podkit/docker": patch
---

Optimise Docker image layers by using `COPY --chmod=755` instead of separate `RUN chmod` steps, reducing the total layer count
