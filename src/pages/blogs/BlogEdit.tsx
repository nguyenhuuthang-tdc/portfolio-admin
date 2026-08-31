import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Blog } from '@/types/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { BlogForm, BlogFormData } from './BlogForm';
import toast from 'react-hot-toast';
import { showApiError } from '@/lib/api-error-toast';

export function BlogEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['blog', id],
    queryFn: () =>
      api
        .get<{ success: boolean; data: Blog }>(`/api/v1/admin/blogs/${id}`)
        .then((r) => r.data.data),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (formData: BlogFormData) =>
      api.put(`/api/v1/admin/blogs/${id}`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      queryClient.invalidateQueries({ queryKey: ['blog', id] });
      toast.success('Writing updated!');
      navigate('/blogs');
    },
    onError: (error) => showApiError(error, 'Update failed'),
  });

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-neutral-500">Loading...</div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <PageHeader title={`Edit: ${data.title}`} backTo="/blogs" />
      <BlogForm
        defaultValues={{
          title: data.title,
          slug: data.slug,
          content: data.content,
          excerpt: data.excerpt ?? undefined,
          status: data.status,
          categoryIds: data.categories.map((c) => c.id),
          thumbnail: data.thumbnail,
        }}
        onSubmit={(formData) => mutation.mutate(formData)}
        isLoading={mutation.isPending}
      />
    </div>
  );
}
