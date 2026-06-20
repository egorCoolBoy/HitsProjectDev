import { useEffect } from 'react';
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { parseNumericId } from '../utils/apiMappers';

const ORDER_EVENTS = [
  'orderExpenseCreated',
  'orderExpenseUpdated',
  'orderExpenseDeleted',
  'orderExpenseParticipationUpdated',
  'orderParticipantAdded',
  'orderParticipantRemoved',
  'paymentCreated',
  'paymentUpdated',
  'paymentDeleted',
] as const;

type UseOrderRealtimeParams = {
  orderId: string | null;
  enabled: boolean;
  onOrderChanged: () => void;
};

export function useOrderRealtime({ orderId, enabled, onOrderChanged }: UseOrderRealtimeParams) {
  useEffect(() => {
    if (!enabled || !orderId) return;

    const numericOrderId = parseNumericId(orderId);
    if (!numericOrderId) return;

    let disposed = false;
    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/orders', {
        accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    const joinOrder = async () => {
      if (disposed || connection.state !== HubConnectionState.Connected) return;
      await connection.invoke('JoinOrder', numericOrderId);
    };

    ORDER_EVENTS.forEach((eventName) => {
      connection.on(eventName, onOrderChanged);
    });

    connection.onreconnected(() => {
      joinOrder().catch((error) => {
        console.warn('SignalR order rejoin failed', error);
      });
    });

    connection
      .start()
      .then(joinOrder)
      .catch((error) => {
        console.warn('SignalR order connection failed', error);
      });

    return () => {
      disposed = true;
      ORDER_EVENTS.forEach((eventName) => {
        connection.off(eventName, onOrderChanged);
      });

      if (connection.state === HubConnectionState.Connected) {
        connection
          .invoke('LeaveOrder', numericOrderId)
          .catch(() => undefined)
          .finally(() => {
            connection.stop().catch(() => undefined);
          });
      } else {
        connection.stop().catch(() => undefined);
      }
    };
  }, [enabled, onOrderChanged, orderId]);
}
