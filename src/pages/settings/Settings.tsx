import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

type TelegramConfig = {
  chatId: string;
  enabled: boolean;
  hasBotToken: boolean;
};

const inputClass =
  'w-full px-3 py-2.5 rounded-lg text-sm bg-neutral-800 border border-neutral-700 focus:border-violet-500 focus:outline-none text-neutral-100';

function PasswordForm() {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.put('/api/v1/auth/password', data),
    onSuccess: () => {
      toast.success('Password updated');
      reset();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Update failed');
    },
  });

  return (
    <form
      onSubmit={handleSubmit((d) => {
        if (d.newPassword !== d.confirmPassword) {
          toast.error('New passwords do not match');
          return;
        }
        mutation.mutate({
          currentPassword: d.currentPassword,
          newPassword: d.newPassword,
        });
      })}
      className="p-5 rounded-xl border border-neutral-800 bg-neutral-900 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-300">Change password</h2>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg text-xs transition-colors"
        >
          <Save size={12} />
          Save
        </button>
      </div>
      <div className="space-y-3 max-w-md">
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Current password"
          {...register('currentPassword', { required: true })}
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="New password (min 8 characters)"
          {...register('newPassword', { required: true, minLength: 8 })}
          className={inputClass}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Confirm new password"
          {...register('confirmPassword', { required: true })}
          className={inputClass}
        />
      </div>
    </form>
  );
}

function TelegramForm() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['telegram-config'],
    queryFn: () =>
      api
        .get<{ success: boolean; data: TelegramConfig }>('/api/v1/admin/settings/telegram')
        .then((r) => r.data.data),
  });

  const { register, handleSubmit, reset } = useForm({
    values: {
      botToken: '',
      chatId: data?.chatId ?? '',
      enabled: data?.enabled ?? false,
    },
  });

  const mutation = useMutation({
    mutationFn: (body: { botToken?: string; chatId: string; enabled: boolean }) =>
      api.put('/api/v1/admin/settings/telegram', body),
    onSuccess: (res) => {
      const cfg = res.data.data as TelegramConfig;
      queryClient.setQueryData(['telegram-config'], cfg);
      reset({ botToken: '', chatId: cfg.chatId, enabled: cfg.enabled });
      toast.success('Telegram settings saved');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Save failed');
    },
  });

  if (isLoading) {
    return (
      <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900 text-sm text-neutral-500">
        Loading Telegram config...
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((d) =>
        mutation.mutate({
          botToken: d.botToken.trim() || undefined,
          chatId: d.chatId.trim(),
          enabled: d.enabled,
        }),
      )}
      className="p-5 rounded-xl border border-neutral-800 bg-neutral-900 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-neutral-300">Telegram</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Contact form notifications. Token is never shown after save.
            {data?.hasBotToken ? ' A token is already stored.' : ''}
          </p>
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-lg text-xs transition-colors"
        >
          <Save size={12} />
          Save
        </button>
      </div>
      <div className="space-y-3 max-w-md">
        <input
          type="password"
          autoComplete="off"
          placeholder={
            data?.hasBotToken ? 'New bot token (leave blank to keep)' : 'Bot token'
          }
          {...register('botToken')}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="Chat ID"
          {...register('chatId')}
          className={inputClass}
        />
        <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
          <input
            type="checkbox"
            {...register('enabled')}
            className="rounded border-neutral-600 bg-neutral-800 text-violet-600 focus:ring-violet-500"
          />
          Enable notifications
        </label>
      </div>
    </form>
  );
}

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="p-6 space-y-6">
        <PasswordForm />
        <TelegramForm />
      </div>
    </div>
  );
}
