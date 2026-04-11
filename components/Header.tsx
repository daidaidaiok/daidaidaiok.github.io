import siteMetadata from '@/data/siteMetadata'
import Logo from '@/data/logo.svg'
import Link from './Link'
import DesktopNav from './DesktopNav'
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
        <DesktopNav />
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
