'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { KBarSearchProvider } from 'pliny/search/KBar'
import { SearchProvider as PlinySearchProvider } from 'pliny/search'
import type { SearchConfig } from 'pliny/search'
import type { CoreContent } from 'pliny/utils/contentlayer'
import type { Blog } from 'contentlayer/generated'

type BookshelfSearchDocument = {
  id: string
  type: 'book'
  title: string
  summary: string
  path: string
  tags: string[]
  author: string
  publisher: string
}

type SearchDocument = CoreContent<Blog> | BookshelfSearchDocument

function isBookshelfSearchDocument(document: SearchDocument): document is BookshelfSearchDocument {
  return 'type' in document && document.type === 'book'
}

type SiteSearchProviderProps = {
  children: ReactNode
  searchConfig?: SearchConfig
}

export default function SiteSearchProvider({ children, searchConfig }: SiteSearchProviderProps) {
  const router = useRouter()

  if (!searchConfig) {
    return <>{children}</>
  }

  if (searchConfig.provider !== 'kbar' || !searchConfig.kbarConfig) {
    return <PlinySearchProvider searchConfig={searchConfig}>{children}</PlinySearchProvider>
  }

  return (
    <KBarSearchProvider
      kbarConfig={{
        ...searchConfig.kbarConfig,
        defaultActions: [
          {
            id: 'nav-home',
            name: '首页',
            keywords: 'home',
            shortcut: ['h'],
            section: '导航',
            perform: () => router.push('/'),
          },
          {
            id: 'nav-blog',
            name: '博客',
            keywords: 'blog posts',
            shortcut: ['b'],
            section: '导航',
            perform: () => router.push('/blog'),
          },
          {
            id: 'nav-bookshelf',
            name: '书架',
            keywords: 'books bookshelf reading',
            shortcut: ['s'],
            section: '导航',
            perform: () => router.push('/bookshelf'),
          },
          {
            id: 'nav-projects',
            name: '项目',
            keywords: 'projects work',
            shortcut: ['p'],
            section: '导航',
            perform: () => router.push('/projects'),
          },
          {
            id: 'nav-tags',
            name: '标签',
            keywords: 'tags topics',
            shortcut: ['t'],
            section: '导航',
            perform: () => router.push('/tags'),
          },
          {
            id: 'nav-about',
            name: '关于',
            keywords: 'about profile',
            shortcut: ['a'],
            section: '导航',
            perform: () => router.push('/about'),
          },
          ...(searchConfig.kbarConfig.defaultActions ?? []),
        ],
        onSearchDocumentsLoad(json) {
          return (json as SearchDocument[]).map((document) => {
            const isBook = isBookshelfSearchDocument(document)
            const tags = document.tags ?? []
            const subtitle = isBook
              ? [document.author, document.publisher].filter(Boolean).join(' · ')
              : tags.join(', ')

            return {
              id: isBook ? `book-${document.id}` : document.path,
              name: document.title,
              keywords: [
                document.title,
                document.summary,
                ...tags,
                ...(isBook ? [document.author, document.publisher, '书架', '图书'] : []),
              ]
                .filter(Boolean)
                .join(' '),
              section: isBook ? '书架' : '博客',
              subtitle,
              perform: () => router.push(`/${document.path}`),
            }
          })
        },
      }}
    >
      {children}
    </KBarSearchProvider>
  )
}
