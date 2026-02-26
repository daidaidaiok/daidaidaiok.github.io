# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js blog using App Router with Tailwind CSS and Contentlayer for MDX processing. Based on [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog).

## Common Commands

```bash
yarn dev          # Start development server (port 3000)
yarn build        # Build for production (static export to `out/`)
yarn serve        # Start production server
yarn lint         # Run ESLint with auto-fix
```

## Architecture

### Content System (Contentlayer)
- `contentlayer.config.ts` - Defines Blog and Authors document types with MDX plugins
- `data/blog/**/*.mdx` - Blog posts with frontmatter (title, date, tags, draft, layout)
- `data/authors/**/*.mdx` - Author profiles
- Content is processed at build time; `onSuccess` hooks generate `tag-data.json` and search index

### Layout System
- `layouts/PostLayout.tsx` - Default 2-column layout with author info
- `layouts/PostSimple.tsx` - Simplified layout
- `layouts/PostBanner.tsx` - Layout with banner image
- `layouts/ListLayout.tsx` - Blog listing with search
- `layouts/ListLayoutWithTags.tsx` - Blog listing with tag sidebar
- `layouts/AuthorLayout.tsx` - Author profile page layout
- Specify layout in frontmatter: `layout: PostLayout`

### Configuration Files
- `data/siteMetadata.js` - Site info, analytics, comments, search config
- `data/headerNavLinks.ts` - Navigation menu items
- `data/projectsData.ts` - Projects page content
- `next.config.js` - Next.js config with security headers and CSP

## Windows-specific Gotchas

**Preview server requires `cmd` wrapper:**
```json
{
  "runtimeExecutable": "cmd",
  "runtimeArgs": ["/c", "npm", "run", "dev"]
}
```

## Headless UI Hydration Fix

Components using `@headlessui/react` Dialog/Transition can cause hydration mismatches due to portal usage. Wrap conditional rendering with `mounted` state:

```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])

return mounted && <Dialog>...</Dialog>
```

See `components/MobileNav.tsx` for example.

## Content Security Policy

When adding external scripts/images, update the CSP in `next.config.js`. Current allowed domains: `giscus.app`, `analytics.umami.is`, `picsum.photos`.

## MDX Components

Custom components for MDX are defined in `components/MDXComponents.tsx`. These components can be used directly in `.mdx` or `.md` blog posts.

## Post Frontmatter Fields

```yaml
title (required)
date (required)
tags (optional)
lastmod (optional)
draft (optional)      # true hides from production
summary (optional)
images (optional)     # array for OG images
authors (optional)    # references data/authors/*.mdx
layout (optional)     # PostLayout | PostSimple | PostBanner | PostSimple
canonicalUrl (optional)
bibliography (optional)
```

## Author Frontmatter Fields

```yaml
name (required)
avatar (optional)
occupation (optional)
company (optional)
email (optional)
twitter (optional)
bluesky (optional)
linkedin (optional)
github (optional)
layout (optional)     # AuthorLayout
```

## Build Output

Static export configured (`output: 'export'`). Build outputs to `out/` directory. For GitHub Pages, use `BASE_PATH` env var.
