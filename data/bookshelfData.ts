export interface Book {
  id: string
  title: string
  author: string
  publisher: string
  cover: string
  href: string
  description?: string
}

const DRIVE_BASE = 'https://drive.hpb300.com/api/files'
const DRIVE_HASH = 'hash=16c128c817b02e11b17771a06562f606&download=1'

const bookshelfData: Book[] = [
  {
    id: 'capital',
    title: '资本论',
    author: '卡尔·马克思',
    publisher: '人民出版社',
    cover: '/static/images/books/capital.jpg',
    href: `${DRIVE_BASE}/019d3906-1867-73ef-a098-57811442f705/%E5%8D%A1%E5%B0%94%C2%B7%E9%A9%AC%E5%85%8B%E6%80%9D%20-%20%E8%B5%84%E6%9C%AC%E8%AE%BA.pdf?${DRIVE_HASH}`,
    description: '政治经济学的巅峰之作，深刻揭示了资本主义生产方式的内在规律。',
  },
  {
    id: 'hidden-rules',
    title: '潜规则：中国历史中的真实游戏',
    author: '吴思',
    publisher: '云南人民出版社',
    cover: '/static/images/books/hidden-rules.jpg',
    href: `${DRIVE_BASE}/019d3907-d928-74cc-a577-160dc7f6ebe2/%E5%90%B4%E6%80%9D%20-%20%E6%BD%9C%E8%A7%84%E5%88%99%EF%BC%9A%E4%B8%AD%E5%9B%BD%E5%8E%86%E5%8F%B2%E4%B8%AD%E7%9A%84%E7%9C%9F%E5%AE%9E%E6%B8%B8%E6%88%8F%20-%20%E4%BA%91%E5%8D%97%E4%BA%BA%E6%B0%91%E5%87%BA%E7%89%88%E7%A4%BE.pdf?${DRIVE_HASH}`,
    description: '透过历史表象，揭示中国社会运行的深层逻辑与真实规则。',
  },
  {
    id: 'quant-trading',
    title: '量化交易：算法、分析、数据、模型和优化',
    author: 'Xin Guo 等',
    publisher: '高等教育出版社',
    cover: '/static/images/books/quant-trading.jpg',
    href: `${DRIVE_BASE}/019d3907-8bb4-7a9f-9441-d7c0d39fe63d/Xin%20Guo%E7%AD%89%20-%20%E9%87%8F%E5%8C%96%E4%BA%A4%E6%98%93%EF%BC%9A%E7%AE%97%E6%B3%95%E3%80%81%E5%88%86%E6%9E%90%E3%80%81%E6%95%B0%E6%8D%AE%E3%80%81%E6%A8%A1%E5%9E%8B%E5%92%8C%E4%BC%98%E5%8C%96%20-%20%E9%AB%98%E7%AD%89%E6%95%99%E8%82%B2%E5%87%BA%E7%89%88%E7%A4%BE.pdf?${DRIVE_HASH}`,
    description: '系统介绍量化交易的核心方法，涵盖算法、统计模型与策略优化。',
  },
]

export default bookshelfData
