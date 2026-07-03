## 2024-07-03 - [Sequential API Fetches]
**Learning:** In `src/app/api/course-trees/[ids]/route.ts`, the backend was performing sequential fetches inside a loop to internal endpoints, resulting in an O(N) response time bottleneck.
**Action:** When making multiple network requests that do not depend on each other, use `Promise.all` to fetch concurrently and reduce network latency to O(1) in time.
