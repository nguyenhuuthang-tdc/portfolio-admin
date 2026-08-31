import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Blog, PaginatedResponse } from '@/types/api';
import { PageHeader } from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { showApiError } from '@/lib/api-error-toast';

export function BlogListPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['blogs', 'admin'],
    queryFn: () =>
      api
        .get<PaginatedResponse<Blog>>('/api/v1/admin/blogs?status=all&limit=50')
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/admin/blogs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      toast.success('Blog deleted');
    },
    onError: (error) => showApiError(error, 'Delete failed'),
  });

  const handleDelete = (blog: Blog) => {
    if (!confirm(`Delete "${blog.title}"?`)) return;
    deleteMutation.mutate(blog.id);
  };

  return (
    <div>
      <PageHeader
        title="Writings"
        subtitle={`${data?.pagination.total ?? 0} total`}
        actions={
          <Link
            to="/blogs/create"
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            New Writing
          </Link>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="text-sm text-neutral-500">Loading...</div>
        ) : (
          <div className="space-y-2">
            {data?.data.map((blog) => (
              <div
                key={blog.id}
                className="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        blog.status === 'published'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-neutral-700 text-neutral-400'
                      }`}
                    >
                      {blog.status}
                    </span>
                    {blog.categories.map((c) => (
                      <span
                        key={c.id}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${c.color}20`,
                          color: c.color,
                        }}
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-sm font-medium text-neutral-200 truncate">
                    {blog.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                    <span>{blog.viewCount.toLocaleString()} views</span>
                    <span>
                      {blog.publishedAt
                        ? new Date(blog.publishedAt).toLocaleDateString()
                        : 'Not published'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <Link
                    to={`/blogs/${blog.id}/edit`}
                    className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(blog)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {data?.data.length === 0 && (
              <div className="text-center py-12 text-sm text-neutral-500">
                No writings yet.{' '}
                <Link to="/blogs/create" className="text-violet-400 hover:underline">
                  Create your first one →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
