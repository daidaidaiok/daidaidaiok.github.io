interface Book {
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
const DRIVE_HASH_2 = 'hash=e63bbbe4e4e861f0896a37c5d964b7b9&download=1'

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
  {
    id: 'animal-farm',
    title: '动物庄园',
    author: '乔治·奥威尔',
    publisher: '花城出版社',
    cover: '/static/images/books/animal-farm.jpg',
    href: `${DRIVE_BASE}/019d4470-d7aa-7dc2-9235-fc1a4eac0614/%5B%E8%8B%B1%5D%E4%B9%94%E6%B2%BB%C2%B7%E5%A5%A5%E5%A8%81%E5%B0%94%20-%20%E5%8A%A8%E7%89%A9%E5%BA%84%E5%9B%AD%20-%20%E8%8A%B1%E5%9F%8E%E5%87%BA%E7%89%88%E7%A4%BE.pdf?${DRIVE_HASH_2}`,
    description: '一部以动物寓言形式写成的政治讽刺小说，深刻揭示极权主义的本质。',
  },
  {
    id: 'pragmatic-programmer',
    title: '程序员修炼之道：从小工到专家',
    author: 'Andrew Hunt, David Thomas',
    publisher: '电子工业出版社',
    cover: '/static/images/books/pragmatic-programmer.jpg',
    href: `${DRIVE_BASE}/019d4470-fc71-7b6c-bdee-991a098e023c/%5B%E7%BE%8E%5DAndrew%20Hunt%2C%20%5B%E7%BE%8E%5DDavid%20Thomas%20-%20%E7%A8%8B%E5%BA%8F%E5%91%98%E4%BF%AE%E7%82%BC%E4%B9%8B%E9%81%93%EF%BC%9A%E4%BB%8E%E5%B0%8F%E5%B7%A5%E5%88%B0%E4%B8%93%E5%AE%B6%20-%20%E7%94%B5%E5%AD%90%E5%B7%A5%E4%B8%9A%E5%87%BA%E7%89%88%E7%A4%BE.pdf?${DRIVE_HASH_2}`,
    description: '软件开发领域的经典之作，涵盖从个人修养到项目管理的实用智慧。',
  },
  {
    id: 'pragmatic-thinking',
    title: '程序员的思维修炼：开发认知潜能的九堂课',
    author: 'Andy Hunt',
    publisher: '人民邮电出版社',
    cover: '/static/images/books/pragmatic-thinking.jpg',
    href: `${DRIVE_BASE}/019d4471-2ad2-7693-9905-a22fab34b321/%5B%E7%BE%8E%5DAndy%20Hunt%20-%20%E7%A8%8B%E5%BA%8F%E5%91%98%E7%9A%84%E6%80%9D%E7%BB%B4%E4%BF%AE%E7%82%BC%EF%BC%9A%E5%BC%80%E5%8F%91%E8%AE%A4%E7%9F%A5%E6%BD%9C%E8%83%BD%E7%9A%84%E4%B9%9D%E5%A0%82%E8%AF%BE%20-%20%E4%BA%BA%E6%B0%91%E9%82%AE%E7%94%B5%E5%87%BA%E7%89%88%E7%A4%BE.pdf?${DRIVE_HASH_2}`,
    description: '探索程序员如何利用认知科学提升思维能力与创造力。',
  },
  {
    id: 'collective-intelligence',
    title: '集体智慧编程',
    author: 'Toby Segaran',
    publisher: '电子工业出版社',
    cover: '/static/images/books/collective-intelligence.jpg',
    href: `${DRIVE_BASE}/019d4471-6390-7ac8-a9c4-f420547015ee/%5B%E7%BE%8E%5DToby%20Segaran%20-%20%E9%9B%86%E4%BD%93%E6%99%BA%E6%85%A7%E7%BC%96%E7%A8%8B%20-%20%E7%94%B5%E5%AD%90%E5%B7%A5%E4%B8%9A%E5%87%BA%E7%89%88%E7%A4%BE.pdf?${DRIVE_HASH_2}`,
    description: '通过实例讲解如何从用户行为数据中挖掘集体智慧，构建智能应用。',
  },
  {
    id: 'nineteen-eighty-four',
    title: '一九八四',
    author: '乔治·奥威尔',
    publisher: '花城出版社',
    cover: '/static/images/books/nineteen-eighty-four.jpg',
    href: `${DRIVE_BASE}/019d4471-6f4d-7dfb-a32f-acd10f859a74/%5B%E8%8B%B1%5D%E4%B9%94%E6%B2%BB%C2%B7%E5%A5%A5%E5%A8%81%E5%B0%94%20-%20%E4%B8%80%E4%B9%9D%E5%85%AB%E5%9B%9B%20-%20%E8%8A%B1%E5%9F%8E%E5%87%BA%E7%89%88%E7%A4%BE.pdf?${DRIVE_HASH_2}`,
    description: '反乌托邦文学的巅峰之作，对极权社会的深刻预言与警示。',
  },
  {
    id: 'inside-china-economy',
    title: '置身事内：中国政府与经济发展',
    author: '兰小欢',
    publisher: '上海人民出版社',
    cover: '/static/images/books/inside-china-economy.jpg',
    href: `${DRIVE_BASE}/019d4471-92bd-7897-bc26-f7645c856981/%E5%85%B0%E5%B0%8F%E6%AC%A2%20-%20%E7%BD%AE%E8%BA%AB%E4%BA%8B%E5%86%85%EF%BC%9A%E4%B8%AD%E5%9B%BD%E6%94%BF%E5%BA%9C%E4%B8%8E%E7%BB%8F%E6%B5%8E%E5%8F%91%E5%B1%95%20-%20%E4%B8%8A%E6%B5%B7%E4%BA%BA%E6%B0%91%E5%87%BA%E7%89%88%E7%A4%BE.pdf?${DRIVE_HASH_2}`,
    description: '深入解析中国政府在经济发展中的角色与运作机制。',
  },
]

export default bookshelfData
