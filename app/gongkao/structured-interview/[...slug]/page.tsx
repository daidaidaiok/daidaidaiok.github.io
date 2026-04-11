import 'css/prism.css'
import 'katex/dist/katex.css'

import { MDXLayoutRenderer } from 'pliny/mdx-components'
import { components } from '@/components/MDXComponents'
import { allStructuredInterviews } from 'contentlayer/generated'
import type { StructuredInterview } from 'contentlayer/generated'
import { genPageMetadata } from '@/app/seo'
import { getCoreStructuredInterviews, sortStructuredInterviews } from '@/lib/structuredInterviews'
import StructuredInterviewLayout from '@/layouts/StructuredInterviewLayout'
import { notFound } from 'next/navigation'

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

  return (
    <StructuredInterviewLayout
      content={coreInterviews[interviewIndex]}
      next={next ? { slug: next.slug, title: next.title } : undefined}
      prev={prev ? { slug: prev.slug, title: prev.title } : undefined}
    >
      <MDXLayoutRenderer code={interview.body.code} components={components} toc={interview.toc} />
    </StructuredInterviewLayout>
  )
}
