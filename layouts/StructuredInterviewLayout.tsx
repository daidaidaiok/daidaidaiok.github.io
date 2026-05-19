import { ReactNode } from 'react'
import siteMetadata from '@/data/siteMetadata'
import Link from '@/components/Link'
import type { CoreStructuredInterview } from '@/lib/structuredInterviews'

const metadataDateTemplate: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}

interface StructuredInterviewLayoutProps {
  content: CoreStructuredInterview
  children: ReactNode
  next?: Pick<CoreStructuredInterview, 'slug' | 'title'>
  prev?: Pick<CoreStructuredInterview, 'slug' | 'title'>
}

const editUrl = (path: string) => `${siteMetadata.siteRepo}/blob/main/data/${path}`

export default function StructuredInterviewLayout({
  content,
  children,
  next,
  prev,
}: StructuredInterviewLayoutProps) {
  const {
    title,
    date,
    tags,
    filePath,
    questionText,
    exam_date,
    exam_region,
    exam_type,
    source_title,
    source_site,
    source_url,
    authenticity,
  } = content

  const infoItems = [
    {
      label: '练习日期',
      value: new Date(date).toLocaleDateString('zh-CN', metadataDateTemplate),
    },
    exam_date
      ? {
          label: '真题日期',
          value: new Date(exam_date).toLocaleDateString('zh-CN', metadataDateTemplate),
        }
      : null,
    exam_region ? { label: '地区 / 系统', value: exam_region } : null,
    exam_type ? { label: '考试类型', value: exam_type } : null,
    authenticity ? { label: '真实性评级', value: authenticity } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <article className="space-y-4 pb-10">
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="neo-surface p-6">
            <div className="text-xs font-semibold tracking-[0.24em] text-gray-500 uppercase dark:text-gray-400">
              考公 / 每日结构化面试
            </div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
              {title}
            </h1>
            {questionText ? (
              <p className="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-300">
                {questionText}
              </p>
            ) : null}

            <dl className="mt-6 space-y-4">
              {infoItems.map((item) => (
                <div key={item.label}>
                  <dt className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-gray-800 dark:text-gray-200">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>

            {tags?.length ? (
              <div className="mt-6">
                <div className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                  标签
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="ios-radius bg-neo-item-light dark:bg-neo-item-dark px-3 py-1 text-xs font-semibold tracking-[0.08em] text-gray-700 dark:text-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
              {source_url ? (
                <Link
                  href={source_url}
                  className="neo-inset inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-gray-700 transition hover:text-gray-950 dark:text-gray-200 dark:hover:text-white"
                >
                  查看原始题源
                </Link>
              ) : null}
              <Link
                href={editUrl(filePath)}
                className="neo-inset inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-gray-700 transition hover:text-gray-950 dark:text-gray-200 dark:hover:text-white"
              >
                查看仓库文件
              </Link>
              <Link
                href="/gongkao/structured-interview"
                className="text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 text-sm font-semibold transition"
              >
                &larr; 返回每日结构化面试
              </Link>
            </div>
          </div>

          {(source_title || source_site) && (
            <div className="neo-surface p-6">
              <div className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                来源说明
              </div>
              <div className="mt-3 text-sm leading-7 text-gray-700 dark:text-gray-300">
                {source_title ? <div>{source_title}</div> : null}
                {source_site ? <div className="mt-1">{source_site}</div> : null}
              </div>
            </div>
          )}
        </aside>

        <div className="space-y-4">
          {children}

          {(prev || next) && (
            <div className="grid gap-4 md:grid-cols-2">
              {prev ? (
                <Link
                  href={`/gongkao/structured-interview/${prev.slug}`}
                  className="neo-surface block p-5 transition hover:-translate-y-0.5"
                >
                  <div className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                    上一题
                  </div>
                  <div className="mt-2 text-base leading-7 font-semibold text-gray-900 dark:text-gray-100">
                    {prev.title}
                  </div>
                </Link>
              ) : (
                <div className="neo-surface hidden p-5 md:block" />
              )}

              {next ? (
                <Link
                  href={`/gongkao/structured-interview/${next.slug}`}
                  className="neo-surface block p-5 transition hover:-translate-y-0.5"
                >
                  <div className="text-xs font-semibold tracking-[0.2em] text-gray-500 uppercase dark:text-gray-400">
                    下一题
                  </div>
                  <div className="mt-2 text-base leading-7 font-semibold text-gray-900 dark:text-gray-100">
                    {next.title}
                  </div>
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
