import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { AppNotification } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { toast } from 'sonner';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ArrowRight,
  Info,
  CreditCard,
  Bot
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();

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

  const getIcon = (type: string) => {
    switch (type) {
      case 'approval_required':
        return <AlertTriangle className="w-4 h-4 text-vyro-warning" />;
      case 'negotiation_update':
        return <Scale className="w-4 h-4 text-vyro-accent" />;
      case 'transaction_completed':
        return <CreditCard className="w-4 h-4 text-vyro-success" />;
      default:
        return <Bell className="w-4 h-4 text-vyro-muted" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-vyro-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-vyro-text">
              Network Notifications & Authorizations
            </h1>
            <Badge variant="accent" size="sm">
              {notifications.filter(n => !n.read && !n.isRead).length} Unread
            </Badge>
          </div>
          <p className="text-xs text-vyro-muted mt-1">
            Real-time agent escalation events requiring human decision sign-off.
          </p>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-vyro-muted">
          Loading notification stream...
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 rounded-[8px] bg-vyro-surface border border-vyro-border text-center space-y-2">
          <Bell className="w-8 h-8 text-vyro-muted mx-auto" />
          <h3 className="text-xs font-semibold text-vyro-text">All caught up</h3>
          <p className="text-[11px] text-vyro-muted">
            No active escalations or pending notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((item) => {
            const isRead = item.read || item.isRead;
            const targetLink = item.linkUrl || item.link;

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-[8px] border transition-all flex items-start justify-between gap-4 ${
                  isRead
                    ? 'bg-vyro-surface/40 border-vyro-border/60 text-vyro-muted'
                    : 'bg-vyro-surface border-vyro-accent/40 text-vyro-text shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded bg-vyro-card border border-vyro-border shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-vyro-text">{item.title}</span>
                      {!isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-vyro-accent shrink-0" />
                      )}
                      <span className="text-[9px] font-mono text-vyro-subtle">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-vyro-muted mt-1 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {targetLink && (
                    <Link
                      to={targetLink}
                      onClick={() => !isRead && markReadMutation.mutate(item.id)}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        rightIcon={<ArrowRight className="w-3 h-3" />}
                        className="text-xs h-7.5"
                      >
                        View
                      </Button>
                    </Link>
                  )}
                  {!isRead && (
                    <button
                      onClick={() => markReadMutation.mutate(item.id)}
                      className="p-1.5 rounded bg-vyro-card hover:bg-vyro-hover text-vyro-subtle hover:text-vyro-text transition-colors text-[10px] font-mono"
                      title="Mark as read"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
