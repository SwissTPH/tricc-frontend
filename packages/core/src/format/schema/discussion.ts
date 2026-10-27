import { z } from 'zod'
import { COMMENT_COLORS } from '../../model/types.js'

const personSchema = z.object({ id: z.string().min(1), name: z.string() })

/** More specific shapes first: a plain object would otherwise swallow `node` and keep only `activity`. */
export const discussionAboutSchema = z.union([
  z.literal('project'),
  z.object({ activity: z.string().min(1), node: z.string().min(1) }).strict(),
  z.object({ activity: z.string().min(1), edge: z.string().min(1) }).strict(),
  z.object({ activity: z.string().min(1), group: z.string().min(1) }).strict(),
  z.object({ activity: z.string().min(1), comment: z.string().min(1) }).strict(),
  z.object({ intervention: z.string().min(1) }).strict(),
  z.object({ system: z.string().min(1), concept: z.string().min(1) }).strict(),
  z.object({ image: z.string().min(1) }).strict(),
  z.object({ activity: z.string().min(1) }).strict(),
])

const commentSchema = z.object({
  id: z.string().min(1),
  author: personSchema,
  at: z.string(),
  text: z.string().optional(),
  edited: z.string().optional(),
  deleted: z.boolean().optional(),
})

const eventSchema = z.object({
  at: z.string(),
  by: personSchema,
  status: z.enum(['open', 'pending', 'resolved', 'wont_change']).optional(),
  labels: z.array(z.string()).optional(),
  assignee: personSchema.nullable().optional(),
})

export const discussionFileSchema = z.object({
  id: z.string().min(1),
  about: discussionAboutSchema,
  label: z.string(),
  status: z.enum(['open', 'pending', 'resolved', 'wont_change']),
  labels: z.array(z.string()).default([]),
  assignee: personSchema.optional(),
  comments: z.array(commentSchema).default([]),
  events: z.array(eventSchema).default([]),
  resolution: z
    .object({
      by: personSchema,
      at: z.string(),
      note: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
})

export const discussionLabelsFileSchema = z.object({
  labels: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string(),
      color: z.enum(COMMENT_COLORS),
    }),
  ),
})
