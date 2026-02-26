# AGENTS.md - Project Documentation for AI Coding Agents

## Project Overview

This is a **personal blog** named "HPB300" (版本: 2.4.0), based on the [tailwind-nextjs-starter-blog](https://github.com/timlrx/tailwind-nextjs-starter-blog) template. It's a static site generator built with modern web technologies, designed for content creators who want a fast, customizable, and feature-rich blogging platform.

The blog is primarily in **Chinese (zh-cn)** and is configured to deploy to GitHub Pages at `https://daidaidaiok.github.io`.

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js](https://nextjs.org/) 15.5.12 (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) 5.9.3 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 4.1.18 |
| Content Management | [Contentlayer2](https://github.com/timlrx/contentlayer2) 0.5.8 |
| UI Components | [@headlessui/react](https://headlessui.com/), [pliny](https://github.com/timlrx/pliny) |
| Icons | Heroicons (via SVG) |
| Font | Space Grotesk (Google Fonts) |
| Package Manager | Yarn 3.6.1 |

## Key Features

- **Static Site Export**: Configured for static hosting (GitHub Pages compatible)
- **MDX Support**: Write blog posts with JSX components in Markdown
- **Contentlayer Integration**: Type-safe content processing with auto-generated types
- **Dark/Light Theme**: Automatic system preference detection with manual toggle
- **Tag System**: Organize posts with tags; each tag has its own page
- **Search**: Command palette search using kbar
- **Comments**: Giscus integration (GitHub Discussions-based)
- **Newsletter**: Buttondown integration for email subscriptions
- **Analytics**: Umami analytics support
- **Math Rendering**: KaTeX for mathematical expressions
- **Code Highlighting**: Syntax highlighting with line numbers
- **RSS Feed**: Auto-generated RSS feeds for blog and tags
- **SEO Optimized**: Meta tags, Open Graph, structured data

## Project Structure

```
.
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Homepage
│   ├── Main.tsx           # Home page content component
│   ├── blog/              # Blog listing and post pages
│   ├── tags/              # Tag pages
│   ├── projects/          # Projects page
│   ├── about/             # About page
│   ├── api/newsletter/    # Newsletter API route
│   ├── theme-providers.tsx # Theme context provider
│   ├── seo.tsx            # SEO utilities
│   ├── sitemap.ts         # Dynamic sitemap
│   └── robots.ts          # robots.txt generation
├── components/            # React components
│   ├── Header.tsx         # Site header with navigation
│   ├── Footer.tsx         # Site footer
│   ├── LayoutWrapper.tsx  # Layout wrapper
│   ├── Link.tsx           # Custom link component
│   ├── Image.tsx          # Optimized image component
│   ├── Tag.tsx            # Tag badge component
│   ├── Card.tsx           # Card component
│   ├── Comments.tsx       # Comments integration
│   ├── MDXComponents.tsx  # Custom MDX components
│   ├── SearchButton.tsx   # Search trigger button
│   ├── ThemeSwitch.tsx    # Dark/light theme toggle
│   ├── MobileNav.tsx      # Mobile navigation
│   ├── PageTitle.tsx      # Page title component
│   ├── ScrollTopAndComment.tsx # Scroll to top button
│   ├── SectionContainer.tsx    # Content container
│   ├── TableWrapper.tsx   # Table wrapper for MDX
│   └── social-icons/      # Social media icons
├── layouts/               # Page layout templates
│   ├── PostLayout.tsx     # Default blog post layout (2-column)
│   ├── PostSimple.tsx     # Simplified post layout
│   ├── PostBanner.tsx     # Post layout with banner image
│   ├── ListLayout.tsx     # Blog list with search
│   ├── ListLayoutWithTags.tsx # Blog list with tag sidebar
│   └── AuthorLayout.tsx   # Author page layout
├── data/                  # Content and configuration
│   ├── blog/              # Blog posts (MDX files)
│   ├── authors/           # Author profiles (MDX files)
│   ├── siteMetadata.js    # Site configuration
│   ├── headerNavLinks.ts  # Navigation links
│   ├── projectsData.ts    # Projects showcase data
│   ├── logo.svg           # Site logo
│   └── references-data.bib # Bibliography for citations
├── css/                   # Stylesheets
│   ├── tailwind.css       # Tailwind CSS with theme config
│   └── prism.css          # Code syntax highlighting styles
├── scripts/               # Build scripts
│   ├── postbuild.mjs      # Post-build script entry
│   └── rss.mjs            # RSS feed generator
├── faq/                   # Documentation
│   ├── custom-mdx-component.md
│   ├── customize-kbar-search.md
│   └── deploy-with-docker.md
├── contentlayer.config.ts # Contentlayer configuration
├── next.config.js         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── .github/workflows/     # CI/CD workflows
    └── nextjs.yml         # GitHub Pages deployment
```

## Build and Development Commands

```bash
# Install dependencies
yarn install

# Development server (localhost:3000)
yarn dev
# or
yarn start

# Production build (static export)
yarn build

# Serve production build locally
yarn serve

# Lint with auto-fix
yarn lint

# Bundle analysis
yarn analyze
```

**Note for Windows users**: If you encounter issues with `INIT_CWD`, run:
```powershell
$env:PWD = $(Get-Location).Path
```

## Content Management

### Blog Posts

Blog posts are stored in `data/blog/` as MDX files. Each post requires frontmatter:

```yaml
---
title: 'Post Title'           # Required
date: '2024-01-01'            # Required
tags: ['tag1', 'tag2']        # Optional
lastmod: '2024-01-02'         # Optional
draft: false                  # Optional (set true to hide in production)
summary: 'Brief description'  # Optional
images: ['/static/images/...'] # Optional
authors: ['default']          # Optional (references data/authors/)
layout: 'PostLayout'          # Optional (PostLayout, PostSimple, PostBanner)
canonicalUrl: 'https://...'   # Optional
bibliography: 'references-data.bib' # Optional
---
```

### Authors

Author profiles are in `data/authors/` as MDX files:

```yaml
---
name: Author Name
avatar: /static/images/avatar.png
occupation: Job Title
company: Company Name
email: email@example.com
twitter: https://twitter.com/...
linkedin: https://linkedin.com/...
github: https://github.com/...
---
```

### Projects

Edit `data/projectsData.ts` to add project showcases:

```typescript
{
  title: 'Project Name',
  description: 'Project description...',
  imgSrc: '/static/images/project.png',
  href: 'https://project-url.com',
}
```

## Configuration Files

### Site Metadata (`data/siteMetadata.js`)

Core site configuration including:
- Site title, author, description
- Social media links
- Analytics configuration (Umami)
- Comments configuration (Giscus)
- Newsletter provider (Buttondown)
- Search provider (kbar)

### Contentlayer (`contentlayer.config.ts`)

Defines content types and MDX processing:
- **Blog**: Posts with computed fields (reading time, slug, TOC)
- **Authors**: Profile information
- **MDX Plugins**: remark-gfm, remark-math, rehype-katex, rehype-prism-plus, etc.

### Next.js (`next.config.js`)

Key configurations:
- `output: 'export'` - Static site generation
- Security headers (CSP, HSTS, etc.)
- SVG support via @svgr/webpack
- Contentlayer integration

## Code Style Guidelines

### ESLint Configuration (`eslint.config.mjs`)

- TypeScript recommended rules
- React hooks rules
- JSX accessibility (jsx-a11y)
- Prettier integration
- Next.js core web vitals

### Prettier Configuration (`prettier.config.js`)

```javascript
{
  semi: false,           // No semicolons
  singleQuote: true,     // Single quotes
  printWidth: 100,       // Line width
  tabWidth: 2,           // 2 spaces indentation
  useTabs: false,        // Spaces instead of tabs
  trailingComma: 'es5',  // Trailing commas where valid
}
```

## Testing Strategy

This project currently **does not include automated tests**. Testing is primarily manual:

1. **Development testing**: Use `yarn dev` to test locally
2. **Build verification**: Run `yarn build` to ensure static export succeeds
3. **Visual regression**: Manual browser testing

## Git Hooks (Husky)

Pre-commit hooks run:
- `lint-staged`: ESLint --fix and Prettier --write on staged files

## Deployment

### GitHub Pages (Configured)

The project includes `.github/workflows/nextjs.yml` for automatic deployment:
- Triggers on push to `main` branch
- Builds static site to `out/` directory
- Deploys to GitHub Pages

**Required GitHub Settings**:
- Go to `Settings > Pages > Build and deployment > Source`
- Select "GitHub Actions"

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Giscus Comments (required for comments)
NEXT_PUBLIC_GISCUS_REPO=owner/repo
NEXT_PUBLIC_GISCUS_REPOSITORY_ID=...
NEXT_PUBLIC_GISCUS_CATEGORY=...
NEXT_PUBLIC_GISCUS_CATEGORY_ID=...

# Umami Analytics (optional)
NEXT_UMAMI_ID=your-umami-website-id

# Newsletter (optional - based on provider)
BUTTONDOWN_API_KEY=...
```

## Security Considerations

### Content Security Policy

Configured in `next.config.js`:
- Default: 'self'
- Scripts: 'self', 'unsafe-eval', 'unsafe-inline', giscus.app, analytics.umami.is
- Styles: 'self', 'unsafe-inline'
- Images: * (all sources)
- Frame: giscus.app

**Important**: When adding new external services (analytics, comments, etc.), update the CSP accordingly.

### Security Headers

Pre-configured headers include:
- Content-Security-Policy
- Referrer-Policy: strict-origin-when-cross-origin
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)
- Permissions-Policy

## Common Tasks

### Adding a New Page

1. Create `app/new-page/page.tsx`
2. Import `genPageMetadata` from `@/app/seo` for SEO
3. Add navigation link to `data/headerNavLinks.ts` if needed

### Customizing Theme Colors

Edit `css/tailwind.css`:
- Primary colors: `--color-primary-50` through `--color-primary-950`
- Gray colors: `--color-gray-50` through `--color-gray-950`

### Adding Custom MDX Components

Edit `components/MDXComponents.tsx`:
```typescript
import MyComponent from './MyComponent'

export const components = {
  // ... existing components
  MyComponent,
}
```

Then use in MDX:
```mdx
<MyComponent prop="value" />
```

### Static Export for Custom Domain

For deployment with base path:
```bash
EXPORT=1 UNOPTIMIZED=1 BASE_PATH=/myblog yarn build
```

## Troubleshooting

### Contentlayer Issues

If Contentlayer types are not generated:
```bash
rm -rf .contentlayer
yarn build
```

### Windows Build Issues

If `INIT_CWD` is not recognized:
```powershell
$env:PWD = $(Get-Location).Path
$env:INIT_CWD = $(Get-Location).Path
```

### Image Optimization in Static Export

Static export requires `unoptimized: true` or custom loader. The build script handles this via `UNOPTIMIZED=1` environment variable.

## Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Contentlayer Documentation](https://contentlayer.dev/docs)
- [MDX Documentation](https://mdxjs.com/docs/)
- [Pliny Documentation](https://github.com/timlrx/pliny)
- [Template Repository](https://github.com/timlrx/tailwind-nextjs-starter-blog)
