# Static asset policy

- Keep new or modified PNG, JPG, and JPEG assets at or below 500,000 bytes.
- Prefer AVIF or WebP for photographs when the serving component and browser support make them a good fit. Keep PNG for lossless artwork/transparency and SVG for vector illustrations.
- Export only the dimensions the page needs, remove unused metadata when practical, and visually inspect recompressed assets at their rendered size.
- Oversized PNG/JPG/JPEG files need a one-file entry in `scripts/image-budget-exceptions.json` with an exact repository-relative path and a concise reason. Wildcards are rejected; exceptions fail when the file is removed or no longer exceeds the budget.
- The PR check compares changed image paths with the target branch. Renaming or recompressing a file does not exempt it from the budget.
