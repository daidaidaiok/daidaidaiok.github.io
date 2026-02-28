import { ReactNode } from 'react'
import type { Authors } from 'contentlayer/generated'
import SocialIcon from '@/components/social-icons'
import Image from '@/components/Image'

interface Props {
  children: ReactNode
  content: Omit<Authors, '_id' | '_raw' | 'body'>
}

export default function AuthorLayout({ children, content }: Props) {
  const { name, avatar, occupation, company, email, twitter, bluesky, linkedin, github } = content

  return (
    <div className="mx-auto max-w-4xl">
      {/* Résumé Header */}
      <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-primary-600 to-primary-800 px-6 py-10 dark:from-primary-800 dark:to-gray-900 sm:px-10 sm:py-14">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {avatar && (
            <Image
              src={avatar}
              alt="avatar"
              width={160}
              height={160}
              className="h-32 w-32 shrink-0 rounded-full border-4 border-white/30 shadow-lg sm:h-40 sm:w-40"
            />
          )}
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
              {name}
            </h1>
            {occupation && (
              <p className="mt-2 text-lg font-medium text-primary-100 sm:text-xl">{occupation}</p>
            )}
            {company && <p className="mt-1 text-sm text-primary-200">{company}</p>}
            <div className="mt-5 flex justify-center gap-4 sm:justify-start [&_a]:text-primary-100 [&_svg]:fill-white/80 [&_svg]:hover:fill-white">
              <SocialIcon kind="mail" href={`mailto:${email}`} size={6} />
              <SocialIcon kind="github" href={github} size={6} />
              <SocialIcon kind="linkedin" href={linkedin} size={6} />
              <SocialIcon kind="x" href={twitter} size={6} />
              <SocialIcon kind="bluesky" href={bluesky} size={6} />
            </div>
          </div>
        </div>
      </div>

      {/* Résumé Body */}
      <div className="rounded-b-2xl border border-t-0 border-gray-200 bg-white px-6 py-10 shadow-sm dark:border-gray-700 dark:bg-gray-800/50 sm:px-10 sm:py-12">
        <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:border-b prose-headings:border-gray-200 prose-headings:pb-2 prose-headings:font-bold prose-headings:tracking-tight dark:prose-headings:border-gray-700">
          {children}
        </div>
      </div>
    </div>
  )
}
