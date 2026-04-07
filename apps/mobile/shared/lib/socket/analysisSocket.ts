import {
  ANALYSIS_SOCKET_EVENTS,
  analysisSocketEventPayloadSchema,
  type AnalysisSocketEventPayload,
} from '@acme/shared';
import { io, type Socket } from 'socket.io-client';
import { getCookieString } from '../auth/betterAuthClient';
import { ENV } from '../env';

type AnalysisEventHandler = (payload: AnalysisSocketEventPayload) => void;

type IncomingAnalysisEvent =
  | typeof ANALYSIS_SOCKET_EVENTS.subscribed
  | typeof ANALYSIS_SOCKET_EVENTS.productStarted
  | typeof ANALYSIS_SOCKET_EVENTS.productCompleted
  | typeof ANALYSIS_SOCKET_EVENTS.productFailed
  | typeof ANALYSIS_SOCKET_EVENTS.ingredientsStarted
  | typeof ANALYSIS_SOCKET_EVENTS.ingredientsCompleted
  | typeof ANALYSIS_SOCKET_EVENTS.ingredientsFailed;

const INCOMING_ANALYSIS_EVENTS: IncomingAnalysisEvent[] = [
  ANALYSIS_SOCKET_EVENTS.subscribed,
  ANALYSIS_SOCKET_EVENTS.productStarted,
  ANALYSIS_SOCKET_EVENTS.productCompleted,
  ANALYSIS_SOCKET_EVENTS.productFailed,
  ANALYSIS_SOCKET_EVENTS.ingredientsStarted,
  ANALYSIS_SOCKET_EVENTS.ingredientsCompleted,
  ANALYSIS_SOCKET_EVENTS.ingredientsFailed,
];

class AnalysisSocketClient {
  private socket: Socket | null = null;
  private readonly subscriptionCounts = new Map<string, number>();

  subscribe(analysisId: string) {
    const currentCount = this.subscriptionCounts.get(analysisId) ?? 0;
    this.subscriptionCounts.set(analysisId, currentCount + 1);

    const socket = this.connect();
    if (socket.connected && currentCount === 0) {
      socket.emit(ANALYSIS_SOCKET_EVENTS.subscribe, { analysisId });
    }
  }

  unsubscribe(analysisId: string) {
    const currentCount = this.subscriptionCounts.get(analysisId);
    if (!currentCount) {
      return;
    }

    if (currentCount === 1) {
      this.subscriptionCounts.delete(analysisId);
      this.socket?.emit(ANALYSIS_SOCKET_EVENTS.unsubscribe, { analysisId });
      this.disconnectIfIdle();
      return;
    }

    this.subscriptionCounts.set(analysisId, currentCount - 1);
  }

  on(event: IncomingAnalysisEvent, handler: AnalysisEventHandler) {
    const socket = this.connect();

    const wrappedHandler = (payload: unknown) => {
      const parsed = analysisSocketEventPayloadSchema.safeParse(payload);
      if (parsed.success) {
        handler(parsed.data);
      }
    };

    socket.on(event, wrappedHandler);

    return () => {
      this.socket?.off(event, wrappedHandler);
      this.disconnectIfIdle();
    };
  }

  private connect(): Socket {
    const socket = this.ensureSocket();
    const cookie = getCookieString();

    if (!cookie) {
      return socket;
    }

    socket.io.opts.extraHeaders = {
      Cookie: cookie,
    };

    if (!socket.connected) {
      socket.connect();
    }

    return socket;
  }

  private ensureSocket(): Socket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(`${ENV.EXPO_PUBLIC_API_URL}/scanner`, {
      autoConnect: false,
      transports: ['websocket'],
      reconnection: true,
    });

    this.socket.on('connect', () => {
      this.flushSubscriptions();
    });

    this.socket.io.on('reconnect_attempt', () => {
      const socket = this.socket;
      if (!socket) {
        return;
      }

      const cookie = getCookieString();
      socket.io.opts.extraHeaders = cookie
        ? {
            Cookie: cookie,
          }
        : {};
    });

    return this.socket;
  }

  private flushSubscriptions() {
    if (!this.socket?.connected) {
      return;
    }

    for (const analysisId of this.subscriptionCounts.keys()) {
      this.socket.emit(ANALYSIS_SOCKET_EVENTS.subscribe, { analysisId });
    }
  }

  private disconnectIfIdle() {
    if (!this.socket || this.subscriptionCounts.size > 0) {
      return;
    }

    const hasActiveListeners = INCOMING_ANALYSIS_EVENTS.some(
      (event) => this.socket?.listeners(event).length,
    );

    if (!hasActiveListeners) {
      this.socket.disconnect();
    }
  }
}

export const analysisSocket = new AnalysisSocketClient();