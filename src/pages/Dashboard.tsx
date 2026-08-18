import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { PaginatedResponse, Blog, Project, Contact } from '@/types/api';
import { FileText, FolderKanban, Mail, Eye } from 'lucide-react';

export function DashboardPage() {
  const { data: blogsData } = useQuery({
    queryKey: ['blogs', 'all'],
    queryFn: () =>
      api
        .get<PaginatedResponse<Blog>>('/api/blogs?status=all&limit=1')
        .then((r) => r.data),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () =>
      api
        .get<{ success: boolean; data: Project[] }>('/api/projects?all=true')
        .then((r) => r.data),
  });

  const { data: contactsData } = useQuery({
    queryKey: ['contacts', 'recent'],
    queryFn: () =>
      api
        .get<PaginatedResponse<Contact>>('/api/contact?limit=5')
        .then((r) => r.data),
  });

  const stats = [
    {
      label: 'Total Writings',
      value: blogsData?.pagination.total ?? '—',
      icon: FileText,
      to: '/blogs',
      color: 'text-violet-400',
    },
    {
      label: 'Projects',
      value: projectsData?.data.length ?? '—',
      icon: FolderKanban,
      to: '/projects',
      color: 'text-blue-400',
    },
    {
      label: 'Messages',
      value: contactsData?.pagination.total ?? '—',
      icon: Mail,
      to: '/contacts',
      color: 'text-green-400',
    },
    {
      label: 'Total Views',
      value:
        blogsData?.data.reduce((s, b) => s + (b.viewCount || 0), 0) ?? '—',
      icon: Eye,
      to: '/blogs',
      color: 'text-orange-400',
    },
  ];

  return (
    <div>
      <div className="px-6 py-5 border-b border-neutral-800">
        <h1 className="text-lg font-semibold text-neutral-100">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Welcome back. Here&apos;s an overview of your portfolio.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, to, color }) => (
            <Link
              key={label}
              to={to}
              className="p-5 rounded-xl border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors"
            >
              <div className={`${color} mb-3`}>
                <Icon size={20} />
              </div>
              <div className="text-2xl font-bold text-neutral-100 mb-1">
                {String(value)}
              </div>
              <div className="text-xs text-neutral-500">{label}</div>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-medium text-neutral-400 mb-3">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/blogs/create"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + New Writing
            </Link>
            <Link
              to="/projects/create"
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-sm font-medium transition-colors"
            >
              + New Project
            </Link>
            <a
              href="http://localhost:3000"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded-lg text-sm transition-colors"
            >
              View Portfolio →
            </a>
          </div>
        </div>

        {/* Recent contacts */}
        {contactsData && contactsData.data.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-neutral-400 mb-3">
              Recent Messages
            </h2>
            <div className="space-y-2">
              {contactsData.data.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between p-4 rounded-xl border border-neutral-800 bg-neutral-900"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-200">
                        {c.name}
                      </span>
                      {!c.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-xs">
                      {c.message}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-600 shrink-0 ml-4">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
