import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useHomeEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connect() {
      try {
        es = new EventSource('/api/v1/events');

        es.addEventListener('deal_updated', () => {
          queryClient.invalidateQueries({ queryKey: ['home'] });
        });

        es.addEventListener('decision_created', () => {
          queryClient.invalidateQueries({ queryKey: ['home'] });
        });

        es.addEventListener('user_limits_updated', () => {
          queryClient.invalidateQueries({ queryKey: ['home'] });
        });

        es.onerror = () => {
          if (es) {
            es.close();
            es = null;
          }
          // Exponential backoff reconnect
          reconnectTimeout = setTimeout(connect, 5000);
        };
      } catch (e) {
        reconnectTimeout = setTimeout(connect, 5000);
      }
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) es.close();
    };
  }, [queryClient]);
}
