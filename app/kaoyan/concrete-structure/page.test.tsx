import { describe, expect, it } from 'vitest'
import { metadata } from './page'

describe('concrete structure page metadata', () => {
  it('uses the corrected concrete-construction description', () => {
    expect(metadata.description).toBe('考研专业课 - 混凝土结构设计原理')
  })
})
