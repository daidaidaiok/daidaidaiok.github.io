interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: 'LLM 能力天梯图',
    description:
      '大模型能力排行天梯，聚合 OpenRouter 与人工精选数据，按梯队分组对比各厂商旗舰模型实力。',
    imgSrc: '/static/images/project-llm-leaderboard.svg',
    href: 'https://blog.hpb300.com/llm-leaderboard/',
  },
  {
    title: '题库智能管理系统',
    description:
      '一款智能化的题库管理平台，支持多种题型管理、试卷生成、在线考试等功能，帮助教育机构高效管理教学资源。',
    imgSrc: '/static/images/project-exam.svg',
    href: 'https://paperx.cloud/',
  },
  {
    title: '中小学教材下载',
    description:
      '汇集小初高、大学各版本教材 PDF 电子版，按出版社封面分类展示，支持一键下载，每日自动同步开源仓库更新。',
    imgSrc: '/static/images/project-textbooks.svg',
    href: '/textbooks/',
  },
  {
    title: '土木工程计算工具',
    description:
      '专业的土木工程在线计算工具，提供结构力学、材料计算、施工参数等多种工程计算功能，助力工程师提高工作效率。',
    imgSrc: '/static/images/project-calc.svg',
    href: 'https://cal.hpb300.com/',
  },
]

export default projectsData
