import Link from '@/components/Link'
import toolsData from '@/data/toolsData'
import { genPageMetadata } from 'app/seo'

export const metadata = genPageMetadata({
  title: '工具',
  description: '集中整理我正在使用的工具入口，方便快速访问。',
})

export default function ToolsPage() {
  return (
    <div className="container py-8">
      <div className="space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">工具</h1>
          <p className="max-w-2xl text-sm leading-7 text-gray-600 dark:text-gray-300">
            这里集中放一些我正在使用的工具入口，作为一个简单直接的快速导航页。
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {toolsData.map((tool) => (
            <div key={tool.name} className="neo-surface flex h-full flex-col justify-between p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl leading-8 font-bold tracking-tight">{tool.name}</h2>
                  <span className="bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300 rounded-full px-3 py-1 text-xs font-medium">
                    {tool.category}
                  </span>
                </div>
                <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {tool.description}
                </p>
                <p className="text-sm break-all text-gray-500 dark:text-gray-400">{tool.href}</p>
              </div>

              <div className="mt-6">
                <Link
                  href={tool.href}
                  className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 text-sm leading-6 font-medium"
                >
                  打开工具 &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
