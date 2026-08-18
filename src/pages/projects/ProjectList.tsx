import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { Project } from '@/types/api';
import { PageHeader } from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';
import { Pencil, Trash2, Plus, Globe, GitBranch } from 'lucide-react';

export function ProjectListPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['projects', 'admin'],
    queryFn: () =>
      api
        .get<{ success: boolean; data: Project[] }>('/api/projects?all=true')
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${data?.data.length ?? 0} total`}
        actions={
          <Link
            to="/projects/create"
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            New Project
          </Link>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="text-sm text-neutral-500">Loading...</div>
        ) : (
          <div className="space-y-2">
            {data?.data.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 rounded-xl border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        project.status === 'active'
                          ? 'bg-green-500/10 text-green-400'
                          : project.status === 'in_progress'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-neutral-700 text-neutral-400'
                      }`}
                    >
                      {project.status}
                    </span>
                    {project.demoUrl && (
                      <a
                        href={project.demoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-500 hover:text-green-400 transition-colors"
                      >
                        <Globe size={12} />
                      </a>
                    )}
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-500 hover:text-neutral-300 transition-colors"
                      >
                        <GitBranch size={12} />
                      </a>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-neutral-200">
                    {project.title}
                  </h3>
                  {project.techStack && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {project.techStack.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-xs text-neutral-600 font-mono"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <Link
                    to={`/projects/${project.id}/edit`}
                    className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    onClick={() => {
                      if (!confirm(`Delete "${project.title}"?`)) return;
                      deleteMutation.mutate(project.id);
                    }}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}

            {data?.data.length === 0 && (
              <div className="text-center py-12 text-sm text-neutral-500">
                No projects yet.{' '}
                <Link to="/projects/create" className="text-violet-400 hover:underline">
                  Add your first project →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
