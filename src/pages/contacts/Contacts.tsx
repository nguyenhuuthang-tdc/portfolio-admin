import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Contact, PaginatedResponse } from '@/types/api';
import { PageHeader } from '@/components/ui/PageHeader';
import toast from 'react-hot-toast';
import { Trash2, MailOpen } from 'lucide-react';

export function ContactsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () =>
      api
        .get<PaginatedResponse<Contact>>('/api/v1/admin/contacts?limit=50')
        .then((r) => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/v1/admin/contacts/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/admin/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  const unreadCount = data?.data.filter((c) => !c.isRead).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${data?.pagination.total ?? 0} total${unreadCount > 0 ? ` · ${unreadCount} unread` : ''}`}
      />

      <div className="p-6">
        {isLoading ? (
          <div className="text-sm text-neutral-500">Loading...</div>
        ) : (
          <div className="space-y-3">
            {data?.data.map((contact) => (
              <div
                key={contact.id}
                className={`p-5 rounded-xl border bg-neutral-900 transition-colors ${
                  !contact.isRead
                    ? 'border-violet-800/50'
                    : 'border-neutral-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!contact.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-neutral-200">
                        {contact.name}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {contact.email}
                      </span>
                    </div>
                    {contact.subject && (
                      <p className="text-xs font-medium text-neutral-400 mb-1">
                        {contact.subject}
                      </p>
                    )}
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      {contact.message}
                    </p>
                    <p className="text-xs text-neutral-600 mt-2">
                      {new Date(contact.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!contact.isRead && (
                      <button
                        onClick={() => markReadMutation.mutate(contact.id)}
                        className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
                        title="Mark as read"
                      >
                        <MailOpen size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!confirm('Delete this message?')) return;
                        deleteMutation.mutate(contact.id);
                      }}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {data?.data.length === 0 && (
              <div className="text-center py-12 text-sm text-neutral-500">
                No messages yet.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
