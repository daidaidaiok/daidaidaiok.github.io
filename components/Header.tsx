import siteMetadata from '@/data/siteMetadata'
import headerNavLinks from '@/data/headerNavLinks'
import Logo from '@/data/logo.svg'
import Link from './Link'
import MobileNav from './MobileNav'
import SearchButton from './SearchButton'

const Header = () => {
  let headerClass =
    'neo-surface mb-5 mt-6 flex w-full items-center justify-between px-5 py-4 backdrop-blur-md'
  if (siteMetadata.stickyNav) {
    headerClass += ' sticky top-4 z-50'
  }

  return (
    <header className={headerClass}>
      <Link href="/" aria-label={siteMetadata.headerTitle}>
        <div className="flex items-center justify-between">
          <div className="mr-3 h-8 w-8">
            <Logo />
          </div>
          {typeof siteMetadata.headerTitle === 'string' ? (
            <div className="hidden text-lg font-semibold sm:block">{siteMetadata.headerTitle}</div>
          ) : (
            siteMetadata.headerTitle
          )}
        </div>
      </Link>
      <div className="flex items-center gap-2 leading-5 sm:gap-3">
        <div className="neo-inset no-scrollbar hidden max-w-40 items-center gap-x-1 overflow-x-auto p-1 sm:flex md:max-w-72 lg:max-w-96">
          {headerNavLinks
            .filter((link) => link.href !== '/')
            .map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="dark:hover:bg-neo-hover-dark rounded-full px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-white hover:text-black dark:text-gray-200 dark:hover:text-white"
              >
                {link.title}
              </Link>
            ))}
        </div>
        <div className="neo-inset p-2">
          <SearchButton />
        </div>
        <div className="neo-inset p-2 sm:p-1">
          <MobileNav />
        </div>
      </div>
    </header>
  )
}

export default Header
