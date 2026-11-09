import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { AppNotification } from '../../types';
import { Button } from '../../components/common/Button';
import { StatusChip } from '../../components/common/StatusChip';
import { EmptyState } from '../../components/common/EmptyState';
import { formatDate } from '../../lib/present';
import {
  Bell,
  Check,
  AlertTriangle,
  Scale,
  CreditCard,
  ChevronRight
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.getNotifications,
    refetchInterval: 8000
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read && !n.isRead) {
      markReadMutation.mutate(n.id);
    }
    const targetLink =
      n.link ||
      n.linkUrl ||
      (n.metadata?.negotiationId ? `/app/deals/${n.metadata.negotiationId}` : undefined) ||
      (n.metadata?.dealId ? `/app/deals/${n.metadata.dealId}` : undefined);
    if (targetLink) {
      navigate(targetLink);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-[28px] text-text-primary tracking-tight">
              Notifications
            </h1>
            <span className="text-secondary px-2.5 py-0.5 rounded-control bg-raised border border-border-subtle text-text-muted">
              {unreadCount} unread
            </span>
          </div>
          <p className="text-secondary text-text-muted">
            Important updates from active negotiations, decision requests, and completed escrow settlements.
          </p>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-16 bg-surface rounded-control border border-border-subtle" />
          <div className="h-16 bg-surface rounded-control border border-border-subtle" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="All caught up"
          description="You have no notifications or pending actions right now."
        />
      ) : (
        <div className="bg-surface border border-border-subtle rounded-surface divide-y divide-border-subtle overflow-hidden">
          {notifications.map((n) => {
            const isUnread = !n.read && !n.isRead;
            return (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-5 flex items-center justify-between gap-4 transition-colors cursor-pointer group ${
                  isUnread ? 'bg-raised/80 hover:bg-raised' : 'hover:bg-raised/50'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      n.type === 'approval_required'
                        ? 'bg-status-needs/20 text-status-needs'
                        : 'bg-raised border border-border-subtle text-text-muted'
                    }`}
                  >
                    {n.type === 'approval_required' ? (
                      <AlertTriangle className="w-4 h-4" strokeWidth={2.5} />
                    ) : (
                      <Bell className="w-4 h-4" strokeWidth={2} />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-body ${
                          isUnread
                            ? 'font-bold text-text-primary'
                            : 'font-medium text-text-primary'
                        } group-hover:text-volt transition-colors truncate`}
                      >
                        {n.title}
                      </span>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-volt shrink-0" />
                      )}
                    </div>
                    <p className="text-secondary text-text-muted mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {n.createdAt && (
                    <span className="text-secondary text-text-muted hidden sm:block">
                      {formatDate(n.createdAt)}
                    </span>
                  )}
                  <ChevronRight
                    className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors"
                    strokeWidth={2}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};