'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Trash2, GripVertical, AlertCircle } from 'lucide-react';
import styles from './ShopImageUploader.module.css';

/**
 * ShopImageUploader — drag/drop + click-to-browse image uploader.
 *
 * Uploads each file to /api/shop/images as soon as it's selected. Returns
 * the resulting URLs to the parent via onChange as an array of
 * { url, sortOrder } so the form can submit them as JSON.
 *
 * Phase 5 simplification: no client-side EXIF strip / resize / NSFW scan.
 * The route handler enforces MIME + size validation.
 *
 * Reorder: drag handle is shown for accessibility but v1 uses simple
 * "move up/down" buttons (drag-drop DnD requires a library — defer).
 */

export interface UploadedImage {
  url: string;
  sortOrder: number;
}

interface Props {
  value: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
  maxImages: number;
  disabled?: boolean;
}

export default function ShopImageUploader({
  value,
  onChange,
  maxImages,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function uploadFile(file: File) {
    if (value.length >= maxImages) {
      setError(`You can attach at most ${maxImages} images.`);
      return;
    }
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/shop/images', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? 'Upload failed.');
        return;
      }
      const next = [...value, { url: json.url, sortOrder: value.length }];
      onChange(next);
    } catch {
      setError('Network error during upload.');
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    // Upload sequentially so the maxImages cap is enforced correctly.
    Array.from(files).reduce<Promise<void>>(
      (acc, file) => acc.then(() => uploadFile(file)),
      Promise.resolve(),
    );
  }

  function removeAt(idx: number) {
    const next = value
      .filter((_, i) => i !== idx)
      .map((img, i) => ({ ...img, sortOrder: i }));
    onChange(next);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next.map((img, i) => ({ ...img, sortOrder: i })));
  }

  const canAddMore = value.length < maxImages && !disabled && !uploading;

  return (
    <div className={styles.wrap}>
      {error && (
        <div role='alert' className={styles.error}>
          <AlertCircle size={14} aria-hidden='true' />
          {error}
        </div>
      )}

      <div className={styles.grid}>
        {value.map((img, i) => (
          <div key={img.url} className={styles.tile}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.url}
              alt={`Listing image ${i + 1}`}
              className={styles.image}
            />
            {i === 0 && <span className={styles.badge}>Cover</span>}
            <div className={styles.tileActions}>
              <button
                type='button'
                className={styles.iconBtn}
                aria-label='Move earlier'
                disabled={i === 0 || disabled}
                onClick={() => move(i, i - 1)}
              >
                <GripVertical size={14} aria-hidden='true' />
              </button>
              <button
                type='button'
                className={`${styles.iconBtn} ${styles.danger}`}
                aria-label='Remove image'
                disabled={disabled}
                onClick={() => removeAt(i)}
              >
                <Trash2 size={14} aria-hidden='true' />
              </button>
            </div>
          </div>
        ))}

        {canAddMore && (
          <button
            type='button'
            className={styles.dropZone}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFiles(e.dataTransfer.files);
            }}
            disabled={disabled}
          >
            <ImagePlus size={22} aria-hidden='true' />
            <span className={styles.dropText}>
              {uploading ? 'Uploading…' : 'Add image'}
            </span>
            <span className={styles.dropHint}>
              JPEG / PNG / WebP · max 4 MB
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type='file'
        accept='image/jpeg,image/png,image/webp'
        multiple
        className={styles.fileInput}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
        disabled={disabled}
      />

      <p className={styles.help}>
        {value.length}/{maxImages} images. First image is the cover shown in
        browse. Drag-and-drop or click the tile.
      </p>
    </div>
  );
}
