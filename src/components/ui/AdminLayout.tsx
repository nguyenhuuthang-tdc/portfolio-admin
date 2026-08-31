import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/lib/auth';
import { showApiError } from '@/lib/api-error-toast';
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  User,
  Mail,
  LogOut,
  Tags,
  Settings,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/blogs', label: 'Writings', icon: FileText },
  { to: '/blogs/categories', label: 'Categories', icon: Tags },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/about', label: 'About & Skills', icon: User },
  { to: '/contacts', label: 'Contacts', icon: Mail },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.clear();
      navigate('/login');
    },
    onError: (error) => showApiError(error, 'Logout failed'),
  });

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-neutral-800 flex flex-col bg-neutral-950">
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-neutral-800">
          <span className="font-mono text-sm font-semibold">
            <span className="text-violet-400">winphony</span>
            <span className="text-neutral-500">/admin</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-violet-600/20 text-violet-400 font-medium'
                        : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200'
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-neutral-800">
          <button
            onClick={() => logoutMutation.mutate()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-neutral-500 hover:bg-neutral-800/60 hover:text-neutral-300 transition-all"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-neutral-950">
        <Outlet />
      </main>
    </div>
  );
}
