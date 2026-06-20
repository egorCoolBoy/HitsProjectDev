import { useEffect } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

type UseDebtRealtimeParams = {
  enabled: boolean;
  onDebtsChanged: () => void;
};

export function useDebtRealtime({ enabled, onDebtsChanged }: UseDebtRealtimeParams) {
  useEffect(() => {
    if (!enabled) return;

    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/orders', {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('debtsChanged', onDebtsChanged);

    connection.start().catch((error) => {
      console.warn('SignalR debt connection failed', error);
    });

    return () => {
      connection.off('debtsChanged', onDebtsChanged);
      connection.stop().catch(() => undefined);
    };
  }, [enabled, onDebtsChanged]);
}
