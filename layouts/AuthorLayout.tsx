import { ReactNode } from 'react'
import type { Authors } from 'contentlayer/generated'
import SocialIcon from '@/components/social-icons'
import Image from '@/components/Image'

interface Props {
  children: ReactNode
  content: Omit<Authors, '_id' | '_raw' | 'body'>
}

export default function AuthorLayout({ children, content }: Props) {
  const { name, avatar, occupation, company, email, youtube, github, bilibili, douyin, qq } =
    content

  return (
    <div className="mx-auto w-full">
      {/* Résumé Header */}
      <div className="neo-surface relative overflow-hidden [border-bottom-right-radius:0] [border-bottom-left-radius:0] px-6 py-10 sm:px-10 sm:py-14">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          {avatar && (
            <Image
              src={avatar}
              alt="avatar"
              width={160}
              height={160}
              draggable={false}
              className="h-32 w-32 shrink-0 rounded-full border-4 border-white/30 shadow-lg sm:h-40 sm:w-40"
            />
          )}
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl md:text-5xl dark:text-white">
              {name}
            </h1>
            {occupation && (
              <p className="mt-2 text-lg font-medium text-gray-700 sm:text-xl dark:text-gray-200">
                {occupation}
              </p>
            )}
            {company && <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">{company}</p>}
            <div className="mt-5 flex justify-center gap-4 sm:justify-start">
              <SocialIcon kind="mail" href={`mailto:${email}`} size={6} />
              <SocialIcon kind="github" href={github} size={6} />
              <SocialIcon kind="youtube" href={youtube} size={6} />
              <SocialIcon kind="bilibili" href={bilibili} size={6} />
              <SocialIcon kind="douyin" href={douyin} size={6} />
              <SocialIcon kind="qq" href={qq} size={6} />
            </div>
          </div>
        </div>
      </div>

      {/* Résumé Body */}
      <div className="neo-surface [border-top-left-radius:0] [border-top-right-radius:0] px-6 py-10 sm:px-10 sm:py-12">
        <div className="prose prose-lg dark:prose-invert prose-headings:border-b prose-headings:border-gray-200 prose-headings:pb-2 prose-headings:font-bold prose-headings:tracking-tight dark:prose-headings:border-gray-700 max-w-none">
          {children}
        </div>
      </div>
    </div>
  )
}
