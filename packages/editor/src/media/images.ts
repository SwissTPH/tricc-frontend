import { useCallback } from 'react'
import {
  IMAGE_TYPES,
  imageIdFrom,
  type ImageContentType,
  type ProjectImage,
} from '@tricc/core'
import { useEditorPreferences, useMutate, useProjectSnapshot } from '../runtime/context.js'

/**
 * Image library helpers (feature/20261012-images.md §4, §5).
 *
 * Pictures are added through `useAddImages`: each file is checked, made smaller when it is
 * wider than the author's preference, and stored under an id taken from its file name.
 */

export class ImageFileError extends Error {}

/** The image files a drag carries, or a file input selected. Anything else is left out. */
export function imageFiles(list: FileList | File[] | null | undefined): File[] {
  return [...(list ?? [])].filter((f) => f.type in IMAGE_TYPES)
}

/** Whether a drag carries files: only then does a drop target show itself. */
export function draggingFiles(event: { dataTransfer: DataTransfer | null }): boolean {
  return [...(event.dataTransfer?.types ?? [])].includes('Files')
}

/**
 * The bytes to store for a picked file. A raster wider than `maxWidth` is scaled down in its own
 * format (JPEG and WebP at quality 0.9), its EXIF rotation applied. SVG and GIF (possibly
 * animated) are kept as they are; nothing is made larger, and a result bigger than the original
 * keeps the original.
 */
export async function prepareImage(
  file: Blob,
  maxWidth: number,
): Promise<{ contentType: ImageContentType; data: Uint8Array }> {
  const contentType = file.type as ImageContentType
  if (!(contentType in IMAGE_TYPES)) {
    throw new ImageFileError('Only PNG, JPEG, GIF, WebP and SVG pictures can be added.')
  }
  const original = await blobBytes(file)
  if (contentType === 'image/svg+xml' || contentType === 'image/gif') return { contentType, data: original }
  const smaller = await scaleDown(file, contentType, maxWidth)
  if (!smaller || smaller.length >= original.length) return { contentType, data: original }
  return { contentType, data: smaller }
}

/** The bytes of a file. `FileReader` where `Blob.arrayBuffer` is missing (older engines, jsdom). */
function blobBytes(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer().then((b) => new Uint8Array(b))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

async function scaleDown(file: Blob, type: string, maxWidth: number): Promise<Uint8Array | undefined> {
  if (typeof createImageBitmap !== 'function') return undefined
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return undefined
  }
  try {
    if (bitmap.width <= maxWidth) return undefined
    const width = maxWidth
    const height = Math.max(1, Math.round((bitmap.height * maxWidth) / bitmap.width))
    const quality = type === 'image/png' ? undefined : 0.9
    let blob: Blob | null = null
    if (typeof OffscreenCanvas === 'function') {
      const canvas = new OffscreenCanvas(width, height)
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
      blob = await canvas.convertToBlob({ type, quality })
    } else if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
    }
    // A browser that cannot encode this type returns PNG: keep the original then.
    if (!blob || blob.type !== type) return undefined
    return await blobBytes(blob)
  } finally {
    bitmap.close()
  }
}

/**
 * Add picture files to the library. Resolves to the ids they were stored under, in order;
 * a file that cannot be used is reported through `onError` and skipped.
 */
export function useAddImages(): (
  files: File[],
  opts?: { name?: string; onError?: (message: string) => void },
) => Promise<string[]> {
  const mutate = useMutate()
  const { imageMaxWidth } = useEditorPreferences()
  return useCallback(
    async (files, opts = {}) => {
      const ids: string[] = []
      for (const file of files) {
        let prepared
        try {
          prepared = await prepareImage(file, imageMaxWidth)
        } catch (error) {
          opts.onError?.(error instanceof Error ? error.message : String(error))
          continue
        }
        const image: ProjectImage = { id: imageIdFrom(opts.name ?? file.name), ...prepared }
        let id = image.id
        mutate((tx) => {
          id = tx.addImage(image, { unique: true })
        })
        ids.push(id)
      }
      return ids
    },
    [mutate, imageMaxWidth],
  )
}

const urls = new WeakMap<Uint8Array, string>()

/** A URL showing an image's bytes. One per byte array, kept while the bytes live. */
export function imageUrl(image: ProjectImage): string {
  let url = urls.get(image.data)
  if (!url) {
    url =
      typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(new Blob([image.data.slice().buffer as ArrayBuffer], { type: image.contentType }))
        : `data:${image.contentType};base64,${btoa(String.fromCharCode(...image.data))}`
    urls.set(image.data, url)
  }
  return url
}

/** The URL of a library image by id, or undefined when the library has no such image. */
export function useImageUrl(id: string | undefined): string | undefined {
  const project = useProjectSnapshot()
  const image = id ? project.images?.[id] : undefined
  return image ? imageUrl(image) : undefined
}

/** File size for people: "84 KB". */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
