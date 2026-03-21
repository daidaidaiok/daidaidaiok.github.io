import Link from '@/components/Link'
import Tag from '@/components/Tag'
import siteMetadata from '@/data/siteMetadata'
import { formatDate } from 'pliny/utils/formatDate'

const FEATURED_DISPLAY = 4
const RECENT_DISPLAY = 6

export default function Home({ posts }) {
  const featuredPosts = posts.slice(0, FEATURED_DISPLAY)
  const recentPosts = posts.slice(0, RECENT_DISPLAY)
  const allTags: string[] = posts.flatMap((post): string[] =>
    (post.tags || []).filter((tag): tag is string => typeof tag === 'string')
  )
  const topTags: string[] = [...new Set<string>(allTags)].slice(0, 12)

  return (
    <div className="pb-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12">
        <section className="neo-surface p-6 md:col-span-6 lg:col-span-5">
          <div className="mb-4 text-sm tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
            About
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            {siteMetadata.author}
          </h1>
          <p className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300">
            {siteMetadata.description}
          </p>
          <div className="mt-5 text-sm font-medium">
            <Link
              href="/about"
              className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition"
            >
              查看关于页 &rarr;
            </Link>
          </div>
        </section>

        <section className="neo-surface p-6 md:col-span-6 lg:col-span-4">
          <div className="mb-4 text-sm tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
            Latest
          </div>
          <ul className="space-y-3">
            {!recentPosts.length && <li className="text-gray-500">没有找到文章。</li>}
            {recentPosts.map((post) => (
              <li
                key={post.slug}
                className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-4 py-3"
              >
                <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(post.date, siteMetadata.locale)}
                </div>
                <Link
                  href={`/blog/${post.id}`}
                  className="hover:text-primary-500 line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="neo-surface p-6 md:col-span-6 lg:col-span-3">
          <div className="mb-4 text-sm tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
            Explore
          </div>
          <div className="flex flex-wrap gap-2">
            {topTags.map((tag) => (
              <Tag key={tag} text={tag} />
            ))}
          </div>
          <div className="mt-5 text-sm font-medium">
            <Link
              href="/tags"
              className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition"
            >
              浏览全部标签 &rarr;
            </Link>
          </div>
        </section>

        <section className="neo-surface p-6 md:col-span-6 lg:col-span-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              精选文章
            </h2>
            <Link
              href="/blog"
              className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 text-sm font-medium transition"
              aria-label="全部文章"
            >
              全部文章 &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {featuredPosts.map((post) => (
              <article
                key={post.slug}
                className="ios-radius bg-neo-item-light dark:bg-neo-item-dark p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(post.date, siteMetadata.locale)}
                </div>
                <h3 className="mt-2 text-lg font-bold tracking-tight">
                  <Link href={`/blog/${post.id}`} className="text-gray-900 dark:text-gray-100">
                    {post.title}
                  </Link>
                </h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {post.summary}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1">
                  {(post.tags || []).slice(0, 3).map((tag) => (
                    <Tag key={tag} text={tag} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
