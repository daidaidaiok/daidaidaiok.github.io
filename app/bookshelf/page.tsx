import bookshelfData from '@/data/bookshelfData'
import Image from '@/components/Image'
import Link from '@/components/Link'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({ title: '书架' })

export default function Bookshelf() {
  return (
    <div className="container py-8">
      <div className="space-y-6">
        {bookshelfData.map((book) => (
          <div key={book.id} className="neo-surface flex flex-col overflow-hidden sm:flex-row">
            <Link
              href={book.href}
              className="flex shrink-0 items-center justify-center bg-gray-100 p-6 sm:w-48 dark:bg-gray-800"
            >
              <Image
                alt={book.title}
                src={book.cover}
                className="h-52 object-contain drop-shadow-md transition-transform duration-300 hover:scale-105"
                width={160}
                height={220}
              />
            </Link>
            <div className="flex flex-1 flex-col justify-between p-6">
              <div>
                <h2 className="mb-2 text-xl leading-8 font-bold tracking-tight">
                  <Link href={book.href}>{book.title}</Link>
                </h2>
                <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                  {book.author} &middot; {book.publisher}
                </p>
                {book.description && (
                  <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {book.description}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <Link
                  href={book.href}
                  className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 text-sm leading-6 font-medium"
                >
                  下载阅读 &rarr;
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
