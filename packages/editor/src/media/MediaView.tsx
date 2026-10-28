import { useMemo, useRef, useState } from 'react'
import {
  IMAGE_ID,
  conceptText,
  imageUsage,
  lookupConcept,
  type ConceptKey,
  type ProjectImage,
} from '@tricc/core'
import { useCanWrite, useMutate, useProjectSnapshot } from '../runtime/context.js'
import { ConfirmDelete, Dialog } from '../components/Dialog.js'
import { draggingFiles, formatBytes, imageFiles, imageUrl, prepareImage, useAddImages } from './images.js'
import { useEditorPreferences } from '../runtime/context.js'
import { Button } from '../components/ui/button.js'
import { Input } from '../components/ui/input.js'

/**
 * The image library (feature/20261012-images.md §5): every picture of the project, what uses
 * it, and add / rename / replace / delete. Files dropped anywhere on the view are added.
 */
export function MediaView({ onOpenConcept }: { onOpenConcept?: (key: ConceptKey) => void }) {
  const project = useProjectSnapshot()
  const canWrite = useCanWrite()
  const addImages = useAddImages()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)
  const [over, setOver] = useState(false)
  const [renaming, setRenaming] = useState<string | undefined>(undefined)
  const [deleting, setDeleting] = useState<string | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)
  const usage = useMemo(() => imageUsage(project), [project])
  const images = useMemo(() => {
    const q = query.trim().toLowerCase()
    return Object.values(project.images ?? {}).filter((i) => !q || i.id.includes(q))
  }, [project.images, query])

  const add = async (files: File[]) => {
    setError(undefined)
    await addImages(files, { onError: setError })
  }

  return (
    <section
      className="tricc-media"
      data-testid="media-view"
      data-over={over ? 'true' : undefined}
      aria-labelledby="media-heading"
      onDragOver={(event) => {
        if (!canWrite || !draggingFiles(event)) return
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false)
      }}
      onDrop={(event) => {
        if (!canWrite || !draggingFiles(event)) return
        event.preventDefault()
        setOver(false)
        void add(imageFiles(event.dataTransfer.files))
      }}
    >
      <header className="tricc-editor__header">
        <h1 id="media-heading">Media</h1>
        <Input size="sm"
          type="search"
          data-testid="media-search"
          aria-label="Find a picture"
          placeholder="Search pictures"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {canWrite && (
          <>
            <Button
              variant="outline"
              size="sm"
              type="button"
              data-testid="media-add"
              onClick={() => fileRef.current?.click()}
            >
              + Pictures
            </Button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              data-testid="media-file"
              onChange={(e) => {
                void add(imageFiles(e.target.files))
                e.target.value = ''
              }}
            />
          </>
        )}
      </header>
      {error && (
        <p role="alert" className="tricc-image-picker__error">
          {error}
        </p>
      )}
      {images.length === 0 ? (
        <p className="tricc-dictionary__empty" data-testid="no-images">
          {query
            ? 'No picture matches.'
            : 'No pictures yet. Use + Pictures, or drop image files here. A text shows a picture once it is inserted with Format….'}
        </p>
      ) : (
        <ul className="tricc-image-grid tricc-media__grid">
          {images.map((image) => (
            <MediaTile
              key={image.id}
              image={image}
              users={usage.get(image.id) ?? []}
              canWrite={canWrite}
              onOpenConcept={onOpenConcept}
              onRename={() => setRenaming(image.id)}
              onDelete={() => setDeleting(image.id)}
              onError={setError}
            />
          ))}
        </ul>
      )}
      {renaming && <RenameImage id={renaming} onClose={() => setRenaming(undefined)} />}
      {deleting && (
        <DeleteImage id={deleting} users={usage.get(deleting) ?? []} onClose={() => setDeleting(undefined)} />
      )}
    </section>
  )
}

function MediaTile({
  image,
  users,
  canWrite,
  onOpenConcept,
  onRename,
  onDelete,
  onError,
}: {
  image: ProjectImage
  users: ConceptKey[]
  canWrite: boolean
  onOpenConcept?: (key: ConceptKey) => void
  onRename: () => void
  onDelete: () => void
  onError: (message: string) => void
}) {
  const mutate = useMutate()
  const { imageMaxWidth } = useEditorPreferences()
  const [size, setSize] = useState<string | undefined>(undefined)
  const replaceRef = useRef<HTMLInputElement>(null)

  const replace = async (file: File | undefined) => {
    if (!file) return
    try {
      const prepared = await prepareImage(file, imageMaxWidth)
      mutate((tx) => tx.replaceImage({ id: image.id, ...prepared }))
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <li className="tricc-media__tile" data-testid={`media-image-${image.id}`}>
      <img
        src={imageUrl(image)}
        alt=""
        onLoad={(e) => setSize(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight}`)}
      />
      <strong className="tricc-media__name">{image.id}</strong>
      <span className="tricc-media__meta">
        {size ? `${size} px · ` : ''}
        {formatBytes(image.data.length)}
      </span>
      <span className="tricc-media__users" data-testid={`media-users-${image.id}`}>
        {users.length === 0
          ? 'Not shown by any text'
          : users.map((key) => (
              <button
                key={`${key.system}|${key.code}`}
                type="button"
                className="tricc-chip"
                disabled={!onOpenConcept}
                onClick={() => onOpenConcept?.(key)}
              >
                {key.code}
              </button>
            ))}
      </span>
      {canWrite && (
        <span className="tricc-media__actions">
          <Button
            variant="outline"
            size="sm"
            type="button"
            data-testid={`media-rename-${image.id}`}
            onClick={onRename}
          >
            Rename
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            data-testid={`media-replace-${image.id}`}
            onClick={() => replaceRef.current?.click()}
          >
            Replace
          </Button>
          <Button
            variant="destructive"
            size="sm"
            type="button"
            data-testid={`media-delete-${image.id}`}
            onClick={onDelete}
          >
            Delete
          </Button>
          <input
            ref={replaceRef}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            data-testid={`media-replace-file-${image.id}`}
            onChange={(e) => {
              void replace(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </span>
      )}
    </li>
  )
}

function RenameImage({ id, onClose }: { id: string; onClose: () => void }) {
  const project = useProjectSnapshot()
  const mutate = useMutate()
  const [name, setName] = useState(id)
  const next = name.trim()
  const problem =
    next === id
      ? undefined
      : !IMAGE_ID.test(next)
        ? 'Use lower-case letters, digits, - and _, starting with a letter or digit.'
        : project.images?.[next]
          ? 'Another picture already has this name.'
          : undefined
  const save = () => {
    if (problem) return
    if (next !== id) mutate((tx) => tx.renameImage(id, next))
    onClose()
  }
  return (
    <Dialog testId="media-rename" titleId="media-rename-title" title="Rename picture" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <label htmlFor="media-rename-name">Name</label>
        <Input
          id="media-rename-name"
          data-testid="media-rename-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={problem ? true : undefined}
        />
        <p className="tricc-nav__note">The file is renamed too, and every text showing it follows.</p>
        {problem && <p role="alert">{problem}</p>}
        <div className="tricc-library-modal__actions">
          <Button
            size="sm"
            type="submit"
            data-testid="media-rename-save"
            disabled={Boolean(problem)}
          >
            Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            data-testid="media-rename-cancel"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function DeleteImage({ id, users, onClose }: { id: string; users: ConceptKey[]; onClose: () => void }) {
  const project = useProjectSnapshot()
  const mutate = useMutate()
  const lang = project.languages.default
  return (
    <ConfirmDelete
      testId="media-delete"
      heading={`Delete the picture “${id}”?`}
      onCancel={onClose}
      onConfirm={() => {
        mutate((tx) => tx.removeImage(id))
        onClose()
      }}
    >
      {users.length === 0 ? (
        <p>No text shows it.</p>
      ) : (
        <>
          <p>It is taken out of the texts of:</p>
          <ul>
            {users.map((key) => (
              <li key={`${key.system}|${key.code}`}>
                {key.code}
                {(() => {
                  const display = conceptText(lookupConcept(project, key), 'display', lang, lang)
                  return display ? ` — ${display}` : ''
                })()}
              </li>
            ))}
          </ul>
        </>
      )}
    </ConfirmDelete>
  )
}
