import { CoreContent, coreContent } from 'pliny/utils/contentlayer'
import type { StructuredInterview } from 'contentlayer/generated'

export type CoreStructuredInterview = CoreContent<StructuredInterview>

export function sortStructuredInterviews(interviews: StructuredInterview[]) {
  return [...interviews].sort((a, b) => Number(new Date(b.date)) - Number(new Date(a.date)))
}

export function getCoreStructuredInterviews(
  interviews: StructuredInterview[]
): CoreStructuredInterview[] {
  return sortStructuredInterviews(interviews).map((interview) => coreContent(interview))
}
