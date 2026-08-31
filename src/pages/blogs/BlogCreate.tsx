import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { BlogForm, BlogFormData } from './BlogForm';
import toast from 'react-hot-toast';
import { showApiError } from '@/lib/api-error-toast';

export function BlogCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: BlogFormData) => api.post('/api/v1/admin/blogs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      toast.success('Writing created!');
      navigate('/blogs');
    },
    onError: (error) => showApiError(error, 'Failed to create writing'),
  });

  return (
    <div>
      <PageHeader
        title="New Writing"
        backTo="/blogs"
      />
      <BlogForm
        onSubmit={(data) => mutation.mutate(data)}
        isLoading={mutation.isPending}
      />
    </div>
  );
}
