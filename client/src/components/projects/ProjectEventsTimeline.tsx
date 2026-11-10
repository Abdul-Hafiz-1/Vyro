import React from 'react';
import { Clock } from 'lucide-react';
import { Card } from '../common/Card';
import { ProjectEvent } from '../../types';
import { formatDate } from '../../lib/present';

interface ProjectEventsTimelineProps {
  events: ProjectEvent[];
}

export const ProjectEventsTimeline: React.FC<ProjectEventsTimelineProps> = ({ events }) => {
  if (!events || events.length === 0) return null;

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-text-muted" />
        <h3 className="font-display font-semibold text-body text-text-primary">
          Project history
        </h3>
      </div>

      <div className="flex flex-col gap-2.5">
        {events.map((ev) => (
          <div
            key={ev.id}
            className="flex items-start justify-between gap-3 py-2 border-b border-border-subtle/50 last:border-b-0 text-secondary"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-text-primary font-medium leading-snug">
                {ev.summary}
              </span>
              {ev.reason && (
                <span className="text-secondary text-text-muted">
                  {ev.reason}
                </span>
              )}
            </div>
            <span className="text-secondary text-text-muted shrink-0">
              {formatDate(ev.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};
