import { genPageMetadata } from '@/app/seo'

export const metadata = genPageMetadata({
  title: '混凝土结构设计原理',
  description: '考研专业课 - 混凝凝土结构设计原理',
})

export default function ConcreteStructurePage() {
  return (
    <div className="space-y-4 pb-10">
      <section className="neo-surface p-6 sm:p-8">
        <div className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
          考研
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
          混凝土结构设计原理
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-gray-600 dark:text-gray-300">
          页面建设中...
        </p>
      </section>
    </div>
  )
}
