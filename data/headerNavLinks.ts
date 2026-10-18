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
  {
    title: '考研',
    items: [
      {
        href: '/kaoyan/concrete-structure',
        title: '混凝土结构设计原理',
        description: '考研专业课 - 混凝土结构设计原理',
      },
      {
        href: '/kaoyan/soil-mechanics',
        title: '土力学',
        description: '考研专业课 - 土力学',
      },
    ],
  },
  { href: '/tags', title: '标签' },
  { href: '/projects', title: '项目' },
  { href: '/bookshelf', title: '书架' },
  { href: '/about', title: '关于' },
]

export default headerNavLinks
