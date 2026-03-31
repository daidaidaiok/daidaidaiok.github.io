import Image from '@/components/Image'
import Link from '@/components/Link'
import bookshelfData from '@/data/bookshelfData'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: '书架' })

export default function Bookshelf() {
  return (
    <div className="container py-8">
      <section className="neo-surface mb-8 px-6 py-6 sm:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold tracking-[0.32em] text-gray-500 uppercase dark:text-gray-400">
              Bookshelf
            </p>
            <h1 className="text-3xl leading-tight font-black tracking-tight text-gray-900 sm:text-4xl dark:text-gray-50">
              书架
            </h1>
            <p className="mt-3 text-sm leading-6 text-gray-600 sm:text-base dark:text-gray-300">
              收藏、重读和随时回看的书。全站搜索现在会覆盖书名、作者、出版社和简介。
            </p>
          </div>
          <div className="neo-inset inline-flex w-fit items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300">
            共 {bookshelfData.length} 本
          </div>
        </div>
      </section>

      <div className="columns-1 gap-6 sm:columns-2 xl:columns-3 2xl:columns-4">
        {bookshelfData.map((book) => (
          <article
            id={book.id}
            key={book.id}
            className="neo-surface mb-6 scroll-mt-8 break-inside-avoid overflow-hidden"
          >
            <Link href={book.href} className="block bg-gray-100/90 p-6 dark:bg-gray-900/70">
              <div className="flex min-h-72 items-center justify-center">
                <Image
                  alt={book.title}
                  src={book.cover}
                  className="h-auto max-h-80 w-full object-contain drop-shadow-[0_18px_30px_rgba(15,23,42,0.24)] transition-transform duration-300 hover:scale-[1.03]"
                  width={240}
                  height={340}
                />
              </div>
            </Link>

            <div className="flex flex-col gap-4 p-6">
              <div>
                <p className="mb-2 text-xs font-semibold tracking-[0.26em] text-gray-500 uppercase dark:text-gray-400">
                  书架
                </p>
                <h2 className="mb-3 text-xl leading-8 font-bold tracking-tight text-gray-900 dark:text-gray-50">
                  <Link href={book.href}>{book.title}</Link>
                </h2>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {book.author}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{book.publisher}</p>
                {book.description && (
                  <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {book.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-4 border-t border-white/55 pt-4 dark:border-white/10">
                <Link
                  href={`/bookshelf#${book.id}`}
                  className="text-xs font-medium tracking-[0.2em] text-gray-500 uppercase transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  定位
                </Link>
                <Link
                  href={book.href}
                  className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 text-sm leading-6 font-medium"
                >
                  下载阅读 &rarr;
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
