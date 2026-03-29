import bookshelfData from '@/data/bookshelfData'
import Image from '@/components/Image'
import Link from '@/components/Link'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: '书架' })

export default function Bookshelf() {
  return (
    <div className="container py-8">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {bookshelfData.map((book) => (
          <div key={book.title} className="neo-surface overflow-hidden">
            <Link href={book.href} aria-label={`下载 ${book.title}`}>
              <div className="flex justify-center bg-gray-100 p-6 dark:bg-gray-800">
                <Image
                  alt={book.title}
                  src={book.cover}
                  className="h-64 w-auto object-contain shadow-lg"
                  width={200}
                  height={280}
                />
              </div>
            </Link>
            <div className="p-6">
              <h2 className="mb-2 text-lg leading-7 font-bold tracking-tight">
                <Link href={book.href} aria-label={`下载 ${book.title}`}>
                  {book.title}
                </Link>
              </h2>
              <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                {book.author} / {book.publisher}
              </p>
              {book.description && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{book.description}</p>
              )}
              <Link
                href={book.href}
                className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 mt-4 inline-block text-sm leading-6 font-medium"
                aria-label={`下载 ${book.title}`}
              >
                下载阅读 &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
