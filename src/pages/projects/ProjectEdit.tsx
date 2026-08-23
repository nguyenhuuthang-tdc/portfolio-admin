import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { Project } from '@/types/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProjectForm, ProjectFormData } from './ProjectForm';
import toast from 'react-hot-toast';

export function ProjectEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () =>
      api
        .get<{ success: boolean; data: Project }>(`/api/projects/${id}`)
        .then((r) => r.data.data),
    enabled: !!id,
  });

  const mutation = useMutation({
    mutationFn: (formData: ProjectFormData) =>
      api.put(`/api/projects/${id}`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated!');
      navigate('/projects');
    },
    onError: () => toast.error('Update failed'),
  });

  if (isLoading) return <div className="p-6 text-sm text-neutral-500">Loading...</div>;
  if (!data) return null;

  return (
    <div>
      <PageHeader title={`Edit: ${data.title}`} backTo="/projects" />
      <ProjectForm
        defaultValues={{
          title: data.title,
          slug: data.slug,
          description: data.description ?? undefined,
          detailContent: data.detailContent ?? undefined,
          techStack: data.techStack?.join(', ') ?? undefined,
          githubUrl: data.githubUrl ?? undefined,
          demoUrl: data.demoUrl ?? undefined,
          hasDetail: data.hasDetail,
          status: data.status,
        }}
        onSubmit={(formData) => mutation.mutate(formData)}
        isLoading={mutation.isPending}
      />
    </div>
  );
}
