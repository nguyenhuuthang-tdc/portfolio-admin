import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BlogCategory } from '@/types/api';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Plus, Pencil, Trash2, Check, X, Tags } from 'lucide-react';
import { showApiError } from '@/lib/api-error-toast';

const PRESET_COLORS = [
  '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa',
  '#2563eb', '#3b82f6', '#06b6d4', '#0891b2',
  '#059669', '#10b981', '#16a34a', '#65a30d',
  '#d97706', '#f59e0b', '#dc2626', '#e11d48',
  '#9333ea', '#ec4899', '#64748b', '#475569',
];

type CategoryForm = { name: string; slug: string; color: string; description: string };
const EMPTY_FORM: CategoryForm = { name: '', slug: '', color: '#6d28d9', description: '' };

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
}

export function BlogCategoriesPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<CategoryForm>(EMPTY_FORM);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () =>
      api
        .get<{ success: boolean; data: BlogCategory[] }>('/api/v1/admin/blogs/categories')
        .then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryForm) => api.post('/api/v1/admin/blogs/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      toast.success('Category created');
    },
    onError: (error) => showApiError(error, 'Failed to create category'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryForm }) =>
      api.put(`/api/v1/admin/blogs/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
      setEditId(null);
      toast.success('Category updated');
    },
    onError: (error) => showApiError(error, 'Failed to update category'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/admin/blogs/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
      toast.success('Category deleted');
    },
    onError: (error) => showApiError(error, 'Failed to delete category'),
  });

  const handleCreateNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: slugify(name) }));
  };

  const handleEditNameChange = (name: string) => {
    setEditForm((f) => ({ ...f, name, slug: slugify(name) }));
  };

  const startEdit = (cat: BlogCategory) => {
    setEditId(cat.id);
    setEditForm({ name: cat.name, slug: cat.slug, color: cat.color, description: cat.description ?? '' });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="Categories"
        subtitle="Manage blog categories"
        actions={
          <button
            onClick={() => { setShowCreate(true); setEditId(null); }}
            className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            New Category
          </button>
        }
      />

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-neutral-200 mb-4">New Category</h3>
          <CategoryFormFields
            form={form}
            onNameChange={handleCreateNameChange}
            onFormChange={(field, value) => setForm((f) => ({ ...f, [field]: value }))}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors"
            >
              <X size={13} />Cancel
            </button>
            <button
              type="button"
              disabled={!form.name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Check size={13} />Create
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="space-y-2 mt-4">
          {categories.map((cat) =>
            editId === cat.id ? (
              <div key={cat.id} className="bg-neutral-900 border border-violet-500/40 rounded-2xl p-5">
                <CategoryFormFields
                  form={editForm}
                  onNameChange={handleEditNameChange}
                  onFormChange={(field, value) => setEditForm((f) => ({ ...f, [field]: value }))}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setEditId(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-sm transition-colors"
                  >
                    <X size={13} />Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!editForm.name.trim() || updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: cat.id, data: editForm })}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Check size={13} />Save
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={cat.id}
                className="flex items-center gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-4 group hover:border-neutral-700 transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-neutral-100">{cat.name}</span>
                    <span className="text-xs text-neutral-600 font-mono">{cat.slug}</span>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">{cat.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(cat)}
                    className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete category "${cat.name}"?`)) {
                        deleteMutation.mutate(cat.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-neutral-500 hover:bg-red-600/20 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-600">
          <Tags size={32} className="mb-3 opacity-40" />
          <p className="text-sm">No categories yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 text-violet-400 hover:text-violet-300 text-sm transition-colors"
          >
            Create your first category
          </button>
        </div>
      )}
    </div>
  );
}

function CategoryFormFields({
  form,
  onNameChange,
  onFormChange,
}: {
  form: CategoryForm;
  onNameChange: (name: string) => void;
  onFormChange: (field: keyof CategoryForm, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Name *</label>
          <input
            value={form.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Engineering"
            className="w-full px-3 py-2 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 text-neutral-100"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Slug</label>
          <input
            value={form.slug}
            onChange={(e) => onFormChange('slug', e.target.value)}
            placeholder="auto-generated"
            className="w-full px-3 py-2 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-500 mb-1">Color</label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onFormChange('color', c)}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: form.color === c ? `2px solid ${c}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
          <label className="flex items-center gap-1.5 text-xs text-neutral-500 cursor-pointer">
            <input
              type="color"
              value={form.color}
              onChange={(e) => onFormChange('color', e.target.value)}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
            />
            Custom
          </label>
          <span
            className="px-2.5 py-0.5 rounded-full text-xs text-white font-medium"
            style={{ backgroundColor: form.color }}
          >
            {form.name || 'Preview'}
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-500 mb-1">Description</label>
        <input
          value={form.description}
          onChange={(e) => onFormChange('description', e.target.value)}
          placeholder="Optional short description"
          className="w-full px-3 py-2 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100"
        />
      </div>
    </div>
  );
}
