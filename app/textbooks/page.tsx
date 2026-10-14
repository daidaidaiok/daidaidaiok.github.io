import TextbooksExplorer from '@/components/TextbooksExplorer'
import { genPageMetadata } from '@/app/seo'

export const metadata = genPageMetadata({
  title: '教材下载',
  description:
    '国内小初高、大学各版本教材 PDF 免费下载。数据来自开源仓库 TapXWorld/ChinaTextbook，按出版社（版本）封面分类展示，点击即可下载。',
})

export default function TextbooksPage() {
  const basePath = process.env.BASE_PATH || ''
  return (
    <div className="container py-8">
      <TextbooksExplorer basePath={basePath} />
    </div>
  )
}
