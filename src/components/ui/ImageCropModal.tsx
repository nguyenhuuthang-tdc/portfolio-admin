import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

type AspectPreset = { label: string; value: number | undefined };

const PRESETS: AspectPreset[] = [
  { label: 'Free', value: undefined },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  { label: 'OG', value: 1200 / 630 },
];

type ImageCropModalProps = {
  file: File;
  aspect?: number;
  lockAspect?: boolean;
  title?: string;
  onConfirm: (blob: Blob, filename: string) => void;
  onCancel: () => void;
};

function toPixelCrop(crop: Crop, img: HTMLImageElement): PixelCrop {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (crop.unit === 'px') {
    return {
      unit: 'px',
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
    };
  }
  return {
    unit: 'px',
    x: (crop.x / 100) * w,
    y: (crop.y / 100) * h,
    width: (crop.width / 100) * w,
    height: (crop.height / 100) * h,
  };
}

function cropToBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelW = crop.width * scaleX;
  const pixelH = crop.height * scaleY;
  canvas.width = Math.max(1, Math.round(pixelW));
  canvas.height = Math.max(1, Math.round(pixelH));
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas unsupported'));
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    pixelW,
    pixelH,
    0,
    0,
    canvas.width,
    canvas.height
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Crop failed'))),
      'image/webp',
      0.9
    );
  });
}

export function ImageCropModal({
  file,
  aspect: initialAspect,
  lockAspect = false,
  title = 'Crop image',
  onConfirm,
  onCancel,
}: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completed, setCompleted] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(initialAspect);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const applyAspect = (next: number | undefined, width: number, height: number) => {
    setAspect(next);
    if (next) {
      const c = centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, next, width, height),
        width,
        height
      );
      setCrop(c);
    } else {
      setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
    }
  };

  const onImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    applyAspect(initialAspect, width, height);
  };

  const handleConfirm = async () => {
    const image = imgRef.current;
    if (!image) return;
    setBusy(true);
    try {
      const px =
        completed ??
        (crop ? toPixelCrop(crop, image) : { unit: 'px', x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight });
      const blob = await cropToBlob(image, px);
      const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
      onConfirm(blob, name);
    } finally {
      setBusy(false);
    }
  };

  const handleOriginal = async () => {
    setBusy(true);
    try {
      onConfirm(file, file.name);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-3xl rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            ×
          </button>
        </div>

        <div className="p-4 max-h-[70vh] overflow-auto flex justify-center bg-neutral-950">
          {src && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompleted(c)}
              aspect={aspect}
              className="max-w-full"
            >
              <img
                ref={imgRef}
                src={src}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-[60vh] max-w-full"
              />
            </ReactCrop>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-neutral-800">
          {!lockAspect && (
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    const img = imgRef.current;
                    if (!img) return;
                    applyAspect(p.value, img.width, img.height);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                    aspect === p.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          {lockAspect && <span className="text-[11px] text-neutral-500">Aspect locked to thumbnail (≈ 1.91:1)</span>}

          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={handleOriginal}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            >
              Use original
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-lg text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg text-xs bg-violet-600 hover:bg-violet-700 text-white font-medium disabled:opacity-60"
            >
              {busy ? 'Cropping…' : 'Apply crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
