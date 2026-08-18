import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { AboutSection, Skill } from '@/types/api';
import { PageHeader } from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';

function SectionEditor({ section }: { section: AboutSection }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit } = useForm({
    defaultValues: { content: section.content, label: section.label ?? '' },
  });

  const mutation = useMutation({
    mutationFn: (data: { content: string; label: string }) =>
      api.put(`/api/about/sections/${section.key}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['about-sections'] });
      toast.success(`${section.key} saved`);
    },
    onError: () => toast.error('Save failed'),
  });

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      className="p-5 rounded-xl border border-neutral-800 bg-neutral-900 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-300 font-mono">
          {section.key}
        </h3>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg text-xs transition-colors"
        >
          <Save size={12} />
          Save
        </button>
      </div>
      <textarea
        {...register('content')}
        rows={4}
        className="w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100 resize-y"
      />
    </form>
  );
}

function SkillRow({ skill, onDelete }: { skill: Skill; onDelete: (id: number) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-neutral-800 bg-neutral-900">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-neutral-200">{skill.name}</span>
        <span className="text-xs text-neutral-500 font-mono">{skill.category}</span>
        {skill.level && (
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < skill.level! ? 'bg-violet-500' : 'bg-neutral-700'
                }`}
              />
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => onDelete(skill.id)}
        className="p-1.5 rounded hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-colors"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export function AboutPage() {
  const queryClient = useQueryClient();
  const [newSkill, setNewSkill] = useState({
    name: '',
    category: '',
    level: 3,
  });

  const { data: sections } = useQuery({
    queryKey: ['about-sections'],
    queryFn: () =>
      api
        .get<{ success: boolean; data: AboutSection[] }>('/api/about/sections')
        .then((r) => r.data.data),
  });

  const { data: skills } = useQuery({
    queryKey: ['skills', 'admin'],
    queryFn: () =>
      api
        .get<{ success: boolean; data: Skill[] }>('/api/about/skills?admin=true')
        .then((r) => r.data.data),
  });

  const createSkillMutation = useMutation({
    mutationFn: (data: typeof newSkill) =>
      api.post('/api/about/skills', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setNewSkill({ name: '', category: '', level: 3 });
      toast.success('Skill added');
    },
    onError: () => toast.error('Failed to add skill'),
  });

  const deleteSkillMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/about/skills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      toast.success('Skill deleted');
    },
  });

  return (
    <div>
      <PageHeader title="About & Skills" />

      <div className="p-6 space-y-8">
        {/* Content sections */}
        <div>
          <h2 className="text-sm font-medium text-neutral-400 mb-4">
            Content Sections
          </h2>
          <div className="space-y-4">
            {sections?.map((section) => (
              <SectionEditor key={section.id} section={section} />
            ))}
            {(!sections || sections.length === 0) && (
              <p className="text-sm text-neutral-500">
                No sections yet. They will be created automatically via the API.
              </p>
            )}
          </div>
        </div>

        {/* Skills */}
        <div>
          <h2 className="text-sm font-medium text-neutral-400 mb-4">Skills</h2>

          {/* Add skill form */}
          <div className="flex flex-wrap gap-3 mb-4 p-4 rounded-xl border border-neutral-800 bg-neutral-900">
            <input
              value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
              placeholder="Skill name"
              className="flex-1 min-w-32 px-3 py-2 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100"
            />
            <input
              value={newSkill.category}
              onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
              placeholder="Category"
              className="flex-1 min-w-32 px-3 py-2 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100"
            />
            <select
              value={newSkill.level}
              onChange={(e) => setNewSkill({ ...newSkill, level: Number(e.target.value) })}
              className="px-3 py-2 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  Level {n}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                if (!newSkill.name || !newSkill.category) {
                  toast.error('Name and category required');
                  return;
                }
                createSkillMutation.mutate(newSkill);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          <div className="space-y-2">
            {skills?.map((skill) => (
              <SkillRow
                key={skill.id}
                skill={skill}
                onDelete={(id) => deleteSkillMutation.mutate(id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
