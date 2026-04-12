import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import path from 'path'

const sourceDir =
  '/Users/lijunfeng/Library/Mobile Documents/iCloud~md~obsidian/Documents/咖喱gaygay/32 - 结构化面试'
const targetDir = path.join(process.cwd(), 'data', 'gongkao', 'structured-interview')
const sourceSlidesDir = path.join(sourceDir, 'slides')
const targetSlidesDir = path.join(process.cwd(), 'public', 'gongkao', 'structured-interview-slides')

function buildFrontmatterFromFilename(sourceFile) {
  const baseName = sourceFile.replace(/\.md$/, '')
  const parts = baseName.split('_')
  const practiceDate = parts[0]
  const examDate = parts[1]
  const trailingParts = parts.slice(2)
  const questionParts = [trailingParts[trailingParts.length - 1]]
  const regionParts = trailingParts.slice(0, -1)

  if (regionParts.at(-1)?.match(/^第.+题$/)) {
    questionParts.unshift(regionParts.pop())
  }

  const examRegion = regionParts.join(' ')
  const questionTitle = questionParts.join(' ')
  const tags = ['结构化面试', '真题', '考公']

  if (examRegion.includes('国考')) {
    tags.push('国考')
  } else if (examRegion.includes('省考')) {
    tags.push('省考')
  }

  return `---
title: '${examDate} ${examRegion} ${questionTitle}'
date: '${practiceDate}'
tags:
${tags.map((tag) => `  - ${tag}`).join('\n')}
exam_date: '${examDate}'
exam_region: '${examRegion}'
exam_type: '公务员'
authenticity: '中'
---
`
}

function normalizeContent(sourceFile, content) {
  if (content.startsWith('---\n')) {
    return content
  }

  return `${buildFrontmatterFromFilename(sourceFile)}\n${content}`
}

function syncStructuredInterviews() {
  mkdirSync(targetDir, { recursive: true })
  rmSync(targetSlidesDir, { recursive: true, force: true })
  mkdirSync(targetSlidesDir, { recursive: true })

  const sourceFiles = readdirSync(sourceDir)
    .filter((fileName) => fileName.endsWith('.md'))
    .sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'))

  for (const sourceFile of sourceFiles) {
    const sourcePath = path.join(sourceDir, sourceFile)
    const targetPath = path.join(targetDir, sourceFile.replace(/\.md$/, '.mdx'))
    const content = readFileSync(sourcePath, 'utf8')

    writeFileSync(targetPath, normalizeContent(sourceFile, content))

    const sourceSlidePath = path.join(sourceSlidesDir, sourceFile.replace(/\.md$/, '.html'))
    const targetSlidePath = path.join(targetSlidesDir, sourceFile.replace(/\.md$/, '.html'))

    if (existsSync(sourceSlidePath)) {
      copyFileSync(sourceSlidePath, targetSlidePath)
    }
  }

  console.log(`Synced ${sourceFiles.length} structured interview files to ${targetDir}`)
}

syncStructuredInterviews()
