export interface HeaderNavChildLink {
  href: string
  title: string
  description?: string
}

export interface HeaderNavLink {
  href?: string
  title: string
  items?: HeaderNavChildLink[]
}

const headerNavLinks: HeaderNavLink[] = [
  { href: '/', title: '首页' },
  { href: '/blog', title: '博客' },
  {
    title: '考公',
    items: [
      {
        href: '/gongkao/structured-interview',
        title: '每日结构化面试',
        description: '按天整理的结构化面试真题与参考作答',
      },
    ],
  },
  { href: '/tags', title: '标签' },
  { href: '/projects', title: '项目' },
  { href: '/about', title: '关于' },
]

export default headerNavLinks
