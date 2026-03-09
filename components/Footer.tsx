import Link from './Link'
import siteMetadata from '@/data/siteMetadata'
import SocialIcon from '@/components/social-icons'

const placeholderLinks = new Set([
  'mailto:address@yoursite.com',
  'https://github.com',
  'https://facebook.com',
  'https://youtube.com',
  'https://www.linkedin.com',
  'https://twitter.com/x',
  'https://bsky.app/',
  'https://www.instagram.com',
  'https://www.threads.net',
  'https://medium.com',
  'https://space.bilibili.com',
  'https://www.douyin.com',
  'https://wpa.qq.com',
])

const socialLinks = [
  { kind: 'mail', href: `mailto:${siteMetadata.email}` },
  { kind: 'github', href: siteMetadata.github },
  { kind: 'youtube', href: siteMetadata.youtube },
  { kind: 'bilibili', href: siteMetadata.bilibili },
  { kind: 'douyin', href: siteMetadata.douyin },
  { kind: 'qq', href: siteMetadata.qq },
] as const

const validSocialLinks = socialLinks.filter(({ href }) => {
  if (!href) return false
  return !placeholderLinks.has(href)
})

export default function Footer() {
  return (
    <footer>
      <div className="neo-surface mt-6 mb-6 flex flex-col items-center px-6 py-6">
        <div className="mb-3 flex space-x-4">
          {validSocialLinks.map(({ kind, href }) => (
            <SocialIcon key={kind} kind={kind} href={href} size={6} />
          ))}
        </div>
        <div className="mb-2 flex space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <div>{siteMetadata.author}</div>
          <div>{` • `}</div>
          <div>{`© ${new Date().getFullYear()}`}</div>
          <div>{` • `}</div>
          <Link href="/">{siteMetadata.title}</Link>
        </div>
      </div>
    </footer>
  )
}
