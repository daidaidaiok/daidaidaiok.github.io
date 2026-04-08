interface ToolLink {
  name: string
  description: string
  href: string
  category: string
}

const toolsData: ToolLink[] = [
  {
    name: 'Teldrive',
    description: '个人网盘入口，用于统一管理、访问和分享常用文件。',
    href: 'https://drive.hpb300.com/',
    category: '网盘',
  },
  {
    name: 'OpenList',
    description: '统一的文件列表入口，便于浏览、整理和分发各类存储内容。',
    href: 'https://openlist.hpb300.com/',
    category: '网盘',
  },
  {
    name: 'ChangeDetection',
    description: '网页变更监控面板，用来跟踪页面更新并及时查看变化记录。',
    href: 'https://check.hpb300.com/',
    category: '监控',
  },
  {
    name: 'Crawl4AI',
    description: '网页抓取与自动化采集工具，用于结构化获取站点内容和页面数据。',
    href: 'https://crawl4ai.hpb300.com/',
    category: '采集',
  },
  {
    name: 'n8n',
    description: '自动化工作流平台，用于串联服务、处理任务和搭建日常流程。',
    href: 'https://n8n.hpb300.com/',
    category: '自动化',
  },
]

export default toolsData
