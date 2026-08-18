import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authService } from '@/lib/auth';
import { AdminLayout } from '@/components/ui/AdminLayout';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { BlogListPage } from '@/pages/blogs/BlogList';
import { BlogCreatePage } from '@/pages/blogs/BlogCreate';
import { BlogEditPage } from '@/pages/blogs/BlogEdit';
import { BlogCategoriesPage } from '@/pages/blogs/BlogCategories';
import { ProjectListPage } from '@/pages/projects/ProjectList';
import { ProjectCreatePage } from '@/pages/projects/ProjectCreate';
import { ProjectEditPage } from '@/pages/projects/ProjectEdit';
import { AboutPage } from '@/pages/about/About';
import { ContactsPage } from '@/pages/contacts/Contacts';
import { SettingsPage } from '@/pages/settings/Settings';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: authService.me,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isError || !data) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="blogs" element={<BlogListPage />} />
          <Route path="blogs/create" element={<BlogCreatePage />} />
          <Route path="blogs/:id/edit" element={<BlogEditPage />} />
          <Route path="blogs/categories" element={<BlogCategoriesPage />} />
          <Route path="projects" element={<ProjectListPage />} />
          <Route path="projects/create" element={<ProjectCreatePage />} />
          <Route path="projects/:id/edit" element={<ProjectEditPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
