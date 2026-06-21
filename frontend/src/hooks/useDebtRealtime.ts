import { useEffect } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

type UseDebtRealtimeParams = {
  enabled: boolean;
  onDebtsChanged: () => void;
  onOrdersChanged?: () => void;
};

export function useDebtRealtime({ enabled, onDebtsChanged, onOrdersChanged }: UseDebtRealtimeParams) {
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
    if (onOrdersChanged) {
      connection.on('orderStatusChanged', onOrdersChanged);
    }

    connection.start().catch((error) => {
      console.warn('SignalR debt connection failed', error);
    });

    return () => {
      connection.off('debtsChanged', onDebtsChanged);
      if (onOrdersChanged) {
        connection.off('orderStatusChanged', onOrdersChanged);
      }
      connection.stop().catch(() => undefined);
    };
  }, [enabled, onDebtsChanged, onOrdersChanged]);
}
