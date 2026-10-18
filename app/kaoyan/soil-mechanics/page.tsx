import { genPageMetadata } from '@/app/seo'

export const metadata = genPageMetadata({
  title: '土力学',
  description: '考研专业课 - 土力学',
})

export default function SoilMechanicsPage() {
  return (
    <div className="space-y-4 pb-10">
      <section className="neo-surface p-6 sm:p-8">
        <div className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
          考研
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
          土力学
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-gray-600 dark:text-gray-300">
          页面建设中...
        </p>
      </section>
    </div>
  )
}
