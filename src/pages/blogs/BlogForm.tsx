import { useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BlogCategory } from '@/types/api';
import { RichEditor } from '@/components/editor/RichEditor';
import { ImageCropModal } from '@/components/ui/ImageCropModal';
import toast from 'react-hot-toast';

const BlogFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1, 'Content is required'),
  status: z.enum(['draft', 'published']),
  categoryIds: z.array(z.number()).optional(),
  thumbnail: z.string().optional().nullable(),
});

export type BlogFormData = z.infer<typeof BlogFormSchema>;

type BlogFormProps = {
  defaultValues?: Partial<BlogFormData>;
  onSubmit: (data: BlogFormData) => void;
  isLoading?: boolean;
};

export function BlogForm({ defaultValues, onSubmit, isLoading }: BlogFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BlogFormData>({
    resolver: zodResolver(BlogFormSchema),
    defaultValues: {
      status: 'draft',
      categoryIds: [],
      ...defaultValues,
    },
  });

  const selectedCategoryIds = watch('categoryIds') ?? [];
  const thumbnail = watch('thumbnail');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () =>
      api
        .get<{ success: boolean; data: BlogCategory[] }>('/api/blogs/categories')
        .then((r) => r.data.data),
  });

  const toggleCategory = (id: number) => {
    const current = selectedCategoryIds;
    setValue(
      'categoryIds',
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id]
    );
  };

  const handleThumbnailUpload = async (blob: Blob, filename: string) => {
    setThumbnailUploading(true);
    setCropFile(null);
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('module', 'blog');
    formData.append('format', 'webp');
    formData.append('width', '1200');
    formData.append('height', '630');
    try {
      const res = await api.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = `${import.meta.env.VITE_API_URL}${res.data.data.url}`;
      setValue('thumbnail', url);
      toast.success('Thumbnail uploaded');
    } catch {
      toast.error('Thumbnail upload failed');
    } finally {
      setThumbnailUploading(false);
    }
  };

  const removeThumbnail = async () => {
    if (!thumbnail) return;
    try {
      const publicPath = thumbnail.replace(import.meta.env.VITE_API_URL, '');
      await api.delete('/api/upload/delete', { data: { url: publicPath } });
    } catch {
      // non-critical — remove from form regardless
    }
    setValue('thumbnail', null);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
      {/* Title */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1.5">
          Title *
        </label>
        <input
          {...register('title')}
          className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-neutral-100"
          placeholder="Writing title"
        />
        {errors.title && (
          <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
        )}
      </div>

      {/* Slug */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1.5">
          Slug (auto-generated if empty)
        </label>
        <input
          {...register('slug')}
          className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-neutral-100 font-mono"
          placeholder="writing-url-slug"
        />
      </div>

      {/* Thumbnail — compact card, not full-row */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1.5">
          Thumbnail
        </label>
        {thumbnail ? (
          <div className="w-full max-w-sm aspect-video rounded-xl overflow-hidden border border-neutral-700 bg-neutral-800 relative group">
            <img
              src={thumbnail}
              alt="Thumbnail preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg text-xs font-medium transition-colors"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={removeThumbnail}
                className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => thumbnailInputRef.current?.click()}
            disabled={thumbnailUploading}
            className="w-full max-w-sm aspect-video rounded-xl border-2 border-dashed border-neutral-700 hover:border-violet-500 bg-neutral-800/50 hover:bg-neutral-800 transition-colors flex flex-col items-center justify-center gap-2 text-neutral-500 hover:text-neutral-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {thumbnailUploading ? (
              <>
                <svg className="animate-spin w-6 h-6 text-violet-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs">Uploading...</span>
              </>
            ) : (
              <>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span className="text-xs font-medium">Click to crop & upload</span>
                <span className="text-[11px] text-neutral-600">1200×630 recommended, max 10MB</span>
              </>
            )}
          </button>
        )}
        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setCropFile(file);
            e.target.value = '';
          }}
        />
        {cropFile && (
          <ImageCropModal
            file={cropFile}
            aspect={1200 / 630}
            lockAspect
            title="Crop thumbnail"
            onConfirm={handleThumbnailUpload}
            onCancel={() => setCropFile(null)}
          />
        )}
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1.5">
          Excerpt
        </label>
        <textarea
          {...register('excerpt')}
          rows={2}
          className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-neutral-100 resize-none"
          placeholder="Short summary (shown in listings)"
        />
      </div>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                style={
                  selectedCategoryIds.includes(cat.id)
                    ? { backgroundColor: cat.color, borderColor: cat.color, color: '#fff' }
                    : { borderColor: '#404040', color: '#9ca3af' }
                }
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1.5">
          Status
        </label>
        <select
          {...register('status')}
          className="px-3 py-2 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {/* Content */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1.5">
          Content *
        </label>
        <Controller
          name="content"
          control={control}
          render={({ field }) => (
            <RichEditor
              content={field.value}
              onChange={field.onChange}
              placeholder="Write your content here..."
              uploadModule="blog"
            />
          )}
        />
        {errors.content && (
          <p className="text-xs text-red-400 mt-1">{errors.content.message}</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
        <button
          type="button"
          onClick={() => setValue('status', 'draft')}
          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors"
        >
          Save Draft
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Writing'}
        </button>
      </div>
    </form>
  );
}
