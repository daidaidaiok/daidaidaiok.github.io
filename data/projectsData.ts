interface Project {
  title: string
  description: string
  href?: string
  imgSrc?: string
}

const projectsData: Project[] = [
  {
    title: '题库智能管理系统',
    description: '一款智能化的题库管理平台，支持多种题型管理、试卷生成、在线考试等功能，帮助教育机构高效管理教学资源。',
    imgSrc: '/static/images/google.png',
    href: 'https://exam.hpb300.com/',
  },
  {
    title: '土木工程计算工具',
    description: '专业的土木工程在线计算工具，提供结构力学、材料计算、施工参数等多种工程计算功能，助力工程师提高工作效率。',
    imgSrc: '/static/images/time-machine.jpg',
    href: 'https://cal.hpb300.com/',
  },
  {
    title: '我的网盘',
    description: '个人网盘服务，提供文件存储、分享和管理功能，支持多种文件格式的在线预览，随时随地访问您的文件。',
    imgSrc: '/static/images/google.png',
    href: 'https://openlist.hpb300.com/',
  },
]

export default projectsData
