import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useCanWrite, useProjectSnapshot } from '../runtime/context.js'
import { draggingFiles, imageFiles, imageUrl, useAddImages } from './images.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'

/**
 * Choose a picture from the image library, or add new ones (file button, or drop on the
 * dialog). Picking resolves with the image id. Escape closes this dialog only, not the
 * editor it was opened from.
 */
export function ImagePicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const addImages = useAddImages()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [over, setOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    searchRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const images = useMemo(() => {
    const q = query.trim().toLowerCase()
    return Object.values(project.images ?? {}).filter((i) => !q || i.id.includes(q))
  }, [project.images, query])

  const add = async (files: File[]) => {
    setError(undefined)
    const ids = await addImages(files, { onError: setError })
    // One new picture is what the author meant to insert.
    if (ids.length === 1) onPick(ids[0]!)
  }

  return createPortal(
    <div
      className="tricc-library-modal tricc-image-picker-modal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="tricc-library-modal__card tricc-library-modal__card--wide tricc-image-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-picker-title"
        data-testid="image-picker"
        data-over={over ? 'true' : undefined}
        onMouseDown={(event) => event.stopPropagation()}
        onDragOver={(event) => {
          if (!canWrite || !draggingFiles(event)) return
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          if (!canWrite || !draggingFiles(event)) return
          event.preventDefault()
          setOver(false)
          void add(imageFiles(event.dataTransfer.files))
        }}
      >
        <div className="tricc-library-modal__header">
          <h2 id="image-picker-title">Insert a picture</h2>
          <Button
            variant="outline"
            size="sm"
            type="button"
            data-testid="image-picker-cancel"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
        <div className="tricc-image-picker__bar">
          <Input
            ref={searchRef}
            type="search"
            placeholder="Search pictures"
            aria-label="Search pictures"
            data-testid="image-picker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {canWrite && (
            <>
              <Button
                variant="outline"
                size="sm"
                type="button"
                data-testid="image-picker-add"
                onClick={() => fileRef.current?.click()}
              >
                Add new…
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                multiple
                hidden
                data-testid="image-picker-file"
                onChange={(e) => {
                  void add(imageFiles(e.target.files))
                  e.target.value = ''
                }}
              />
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="tricc-image-picker__error">
            {error}
          </p>
        )}
        {images.length === 0 ? (
          <p className="tricc-image-picker__empty" data-testid="image-picker-empty">
            {project.images ? 'No picture matches.' : 'The library has no pictures yet. Add one, or drop files here.'}
          </p>
        ) : (
          <ul className="tricc-image-grid">
            {images.map((image) => (
              <li key={image.id}>
                <button
                  type="button"
                  className="tricc-image-tile"
                  data-testid={`image-pick-${image.id}`}
                  title={image.id}
                  onClick={() => onPick(image.id)}
                >
                  <img src={imageUrl(image)} alt="" />
                  <span>{image.id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body,
  )
}
