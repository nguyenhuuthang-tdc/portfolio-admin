import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RichEditor } from '@/components/editor/RichEditor';

const ProjectFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  description: z.string().max(1000).optional(),
  detailContent: z.string().optional(),
  techStack: z.string().optional(),
  githubUrl: z.string().optional(),
  demoUrl: z.string().optional().nullable(),
  thumbnail: z.string().optional().nullable(),
  hasDetail: z.boolean(),
  status: z.enum(['active', 'archived', 'in_progress']),
});

export type ProjectFormRaw = z.infer<typeof ProjectFormSchema>;

export interface ProjectFormData {
  title: string;
  slug?: string;
  description?: string;
  detailContent?: string;
  techStack?: string[];
  githubUrl?: string | null;
  demoUrl?: string | null;
  thumbnail?: string | null;
  hasDetail: boolean;
  status: 'active' | 'archived' | 'in_progress';
}

type ProjectFormProps = {
  defaultValues?: Partial<ProjectFormRaw>;
  onSubmit: (data: ProjectFormData) => void;
  isLoading?: boolean;
};

export function ProjectForm({ defaultValues, onSubmit, isLoading }: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ProjectFormRaw>({
    resolver: zodResolver(ProjectFormSchema),
    defaultValues: {
      status: 'active',
      hasDetail: false,
      ...defaultValues,
    },
  });

  const hasDetail = watch('hasDetail');

  const processSubmit = (raw: ProjectFormRaw) => {
    onSubmit({
      ...raw,
      techStack: raw.techStack
        ? raw.techStack
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      githubUrl: raw.githubUrl || null,
      demoUrl: raw.demoUrl || null,
      thumbnail: raw.thumbnail || null,
    });
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6 p-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Title *
          </label>
          <input
            {...register('title')}
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100"
            placeholder="Project name"
          />
          {errors.title && (
            <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Slug
          </label>
          <input
            {...register('slug')}
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100 font-mono"
            placeholder="project-slug"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1.5">
          Short Description
        </label>
        <textarea
          {...register('description')}
          rows={2}
          className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100 resize-none"
          placeholder="Brief description shown in cards"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1.5">
          Tech Stack (comma-separated)
        </label>
        <input
          {...register('techStack')}
          className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100 font-mono"
          placeholder="React, TypeScript, Node.js, MySQL"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            GitHub URL
          </label>
          <input
            {...register('githubUrl')}
            type="url"
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100"
            placeholder="https://github.com/..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Live Demo URL
          </label>
          <input
            {...register('demoUrl')}
            type="url"
            className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100"
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Status
          </label>
          <select
            {...register('status')}
            className="w-full px-3 py-2 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100"
          >
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="flex items-center gap-3 mt-6">
          <input
            type="checkbox"
            id="hasDetail"
            {...register('hasDetail')}
            className="w-4 h-4 rounded accent-violet-500"
          />
          <label htmlFor="hasDetail" className="text-sm text-neutral-400">
            Has detail page
          </label>
        </div>
      </div>

      {hasDetail && (
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1.5">
            Detail Content
          </label>
          <Controller
            name="detailContent"
            control={control}
            render={({ field }) => (
              <RichEditor
                content={field.value ?? ''}
                onChange={field.onChange}
                placeholder="Detailed project description..."
                uploadModule="projects"
              />
            )}
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {isLoading ? 'Saving...' : 'Save Project'}
        </button>
      </div>
    </form>
  );
}
