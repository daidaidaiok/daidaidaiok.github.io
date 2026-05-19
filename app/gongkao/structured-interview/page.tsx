import Link from '@/components/Link'
import { genPageMetadata } from '@/app/seo'
import { allStructuredInterviews } from 'contentlayer/generated'
import { getCoreStructuredInterviews } from '@/lib/structuredInterviews'

const pageDateTemplate: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}

export const metadata = genPageMetadata({
  title: '每日结构化面试',
  description: '按天整理的结构化面试真题列表，包含题源、考试信息与参考作答。',
})

export default function StructuredInterviewIndexPage() {
  const interviews = getCoreStructuredInterviews(allStructuredInterviews)
  const latest = interviews[0]

  return (
    <div className="space-y-4 pb-10">
      <section className="neo-surface p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)] lg:items-end">
          <div>
            <div className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
              考公
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              每日结构化面试
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-gray-600 dark:text-gray-300">
              这里收的是你 Obsidian
              题库里同步过来的每日练习题，页面只做列表和沉浸式阅读，不改动原本答题结构。后续继续往同一目录同步，就能自然扩展这一栏。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-5 py-4">
              <div className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                当前题目数
              </div>
              <div className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                {interviews.length}
              </div>
            </div>
            <div className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-5 py-4">
              <div className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                最近更新
              </div>
              <div className="mt-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                {latest
                  ? new Date(latest.date).toLocaleDateString('zh-CN', pageDateTemplate)
                  : '暂无'}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {interviews.map((interview, index) => (
          <article key={interview.slug} className="neo-surface p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.18em] text-gray-500 uppercase dark:text-gray-400">
                  <span>#{String(index + 1).padStart(2, '0')}</span>
                  <span>
                    {new Date(interview.date).toLocaleDateString('zh-CN', pageDateTemplate)}
                  </span>
                  {interview.authenticity ? <span>真实性 {interview.authenticity}</span> : null}
                </div>

                <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  <Link href={`/gongkao/structured-interview/${interview.slug}`}>
                    {interview.title}
                  </Link>
                </h2>

                {interview.questionText ? (
                  <p className="mt-3 line-clamp-2 text-sm leading-7 text-gray-600 dark:text-gray-300">
                    {interview.questionText}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300">
                  {interview.exam_region ? (
                    <span className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-3 py-1.5">
                      {interview.exam_region}
                    </span>
                  ) : null}
                  {interview.exam_date ? (
                    <span className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-3 py-1.5">
                      真题日期{' '}
                      {new Date(interview.exam_date).toLocaleDateString('zh-CN', pageDateTemplate)}
                    </span>
                  ) : null}
                  {interview.exam_type ? (
                    <span className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-3 py-1.5">
                      {interview.exam_type}
                    </span>
                  ) : null}
                </div>

                {interview.tags?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {interview.tags.map((tag) => (
                      <span
                        key={tag}
                        className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-3 py-1 text-xs font-semibold tracking-[0.08em] text-gray-700 dark:text-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="shrink-0">
                <Link
                  href={`/gongkao/structured-interview/${interview.slug}`}
                  className="neo-inset inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-gray-700 transition hover:text-gray-950 dark:text-gray-200 dark:hover:text-white"
                >
                  进入题目
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
