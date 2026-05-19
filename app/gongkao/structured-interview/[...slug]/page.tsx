import 'css/prism.css'
import 'katex/dist/katex.css'

import { existsSync } from 'fs'
import path from 'path'
import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import { allStructuredInterviews } from 'contentlayer/generated'
import type { StructuredInterview } from 'contentlayer/generated'
import { genPageMetadata } from '@/app/seo'
import { getCoreStructuredInterviews, sortStructuredInterviews } from '@/lib/structuredInterviews'
import StructuredInterviewLayout from '@/layouts/StructuredInterviewLayout'
import FullscreenReader from '@/components/FullscreenReader'
import { notFound } from 'next/navigation'

function getStructuredInterviewSlideUrl(interview: StructuredInterview) {
  const basename = path.basename(interview.filePath, path.extname(interview.filePath))
  const htmlFileName = `${basename}.html`
  const publicFilePath = path.join(
    process.cwd(),
    'public',
    'gongkao',
    'structured-interview-slides',
    htmlFileName
  )

  if (!existsSync(publicFilePath)) {
    return null
  }

  return `${process.env.BASE_PATH || ''}/gongkao/structured-interview-slides/${encodeURIComponent(htmlFileName)}`
}

export async function generateMetadata(props: { params: Promise<{ slug: string[] }> }) {
  const params = await props.params
  const slug = decodeURI(params.slug.join('/'))
  const interview = allStructuredInterviews.find((item) => item.slug === slug)

  if (!interview) {
    return
  }

  return genPageMetadata({
    title: interview.title,
    description: interview.questionText || interview.source_title || interview.title,
  })
}

export const generateStaticParams = async () => {
  return allStructuredInterviews.map((interview) => ({
    slug: interview.slug.split('/').map((segment) => decodeURI(segment)),
  }))
}

export default async function StructuredInterviewDetailPage(props: {
  params: Promise<{ slug: string[] }>
}) {
  const params = await props.params
  const slug = decodeURI(params.slug.join('/'))
  const interviews = sortStructuredInterviews(allStructuredInterviews)
  const interviewIndex = interviews.findIndex((item) => item.slug === slug)

  if (interviewIndex === -1) {
    return notFound()
  }

  const interview = interviews[interviewIndex] as StructuredInterview
  const coreInterviews = getCoreStructuredInterviews(interviews)
  const prev = coreInterviews[interviewIndex + 1]
  const next = coreInterviews[interviewIndex - 1]
  const slideUrl = getStructuredInterviewSlideUrl(interview)

  return (
    <StructuredInterviewLayout
      content={coreInterviews[interviewIndex]}
      next={next ? { slug: next.slug, title: next.title } : undefined}
      prev={prev ? { slug: prev.slug, title: prev.title } : undefined}
    >
      {slideUrl ? (
        <FullscreenReader
          mode="embed"
          title="HTML 阅读模式"
          description="当前页面直接展示原始 HTML 效果，支持翻页、交互和全屏阅读"
          externalUrl={slideUrl}
        >
          <iframe
            src={slideUrl}
            title={`${interview.title} HTML 演示`}
            className="block h-full w-full border-0 bg-white"
          />
        </FullscreenReader>
      ) : (
        <FullscreenReader>
          <MDXLayoutRenderer
            code={interview.body.code}
            components={components}
            toc={interview.toc}
          />
        </FullscreenReader>
      )}
    </StructuredInterviewLayout>
  )
}
