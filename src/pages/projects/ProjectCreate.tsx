import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProjectForm, ProjectFormData } from './ProjectForm';
import toast from 'react-hot-toast';

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: ProjectFormData) => api.post('/api/v1/admin/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created!');
      navigate('/projects');
    },
    onError: () => toast.error('Failed to create project'),
  });

  return (
    <div>
      <PageHeader title="New Project" backTo="/projects" />
      <ProjectForm
        onSubmit={(data) => mutation.mutate(data)}
        isLoading={mutation.isPending}
      />
    </div>
  );
}
