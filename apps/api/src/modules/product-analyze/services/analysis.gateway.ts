import {
  ANALYSIS_SOCKET_EVENTS,
  analysisSubscriptionSchema,
} from '@acme/shared';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthSessionService } from '../../../shared/auth/auth-session.service';
import { findScanByAnalysisIdForUser } from '../repositories/scanRepository';
import {
  buildAnalysisResponseFromStoredState,
  type BuildAnalysisSocketPayloadInput,
  buildAnalysisSocketPayload,
} from './analysis-state';

const getAnalysisRoom = (analysisId: string) => `analysis:${analysisId}`;

@WebSocketGateway({
  namespace: '/scanner',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Cookie', 'Content-Type', 'Authorization'],
  },
})
export class AnalysisGateway implements OnGatewayInit {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly authSessionService: AuthSessionService) {}

  afterInit(server: Server) {
    server.use(async (client, next) => {
      try {
        const userId = await this.authSessionService.requireUserIdFromHeaders(
          client.handshake.headers,
        );
        client.data.userId = userId;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  @SubscribeMessage(ANALYSIS_SOCKET_EVENTS.subscribe)
  async handleSubscribe(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const parsed = analysisSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      throw new WsException('Invalid analysis subscription');
    }

    const userId = client.data.userId as string | undefined;
    if (!userId) {
      throw new WsException('Unauthorized');
    }

    const scan = await findScanByAnalysisIdForUser(userId, parsed.data.analysisId);
    if (!scan) {
      throw new WsException('Analysis not found');
    }

    await client.join(getAnalysisRoom(parsed.data.analysisId));
    client.emit(
      ANALYSIS_SOCKET_EVENTS.subscribed,
      buildAnalysisResponseFromStoredState({
        analysisId: parsed.data.analysisId,
        status: scan.personalAnalysisStatus,
        result: scan.personalResult,
        scanId: scan.id,
        productId: scan.productId,
        barcode: scan.barcode,
      }),
    );
  }

  @SubscribeMessage(ANALYSIS_SOCKET_EVENTS.unsubscribe)
  async handleUnsubscribe(
    @MessageBody() body: unknown,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const parsed = analysisSubscriptionSchema.safeParse(body);
    if (!parsed.success) {
      throw new WsException('Invalid analysis subscription');
    }

    await client.leave(getAnalysisRoom(parsed.data.analysisId));
  }

  emitProductStarted(input: BuildAnalysisSocketPayloadInput) {
    this.emitToAnalysisRoom(ANALYSIS_SOCKET_EVENTS.productStarted, input);
  }

  emitProductCompleted(input: BuildAnalysisSocketPayloadInput) {
    this.emitToAnalysisRoom(ANALYSIS_SOCKET_EVENTS.productCompleted, input);
  }

  emitProductFailed(input: BuildAnalysisSocketPayloadInput) {
    this.emitToAnalysisRoom(ANALYSIS_SOCKET_EVENTS.productFailed, input);
  }

  emitIngredientsStarted(input: BuildAnalysisSocketPayloadInput) {
    this.emitToAnalysisRoom(ANALYSIS_SOCKET_EVENTS.ingredientsStarted, input);
  }

  emitIngredientsCompleted(input: BuildAnalysisSocketPayloadInput) {
    this.emitToAnalysisRoom(ANALYSIS_SOCKET_EVENTS.ingredientsCompleted, input);
  }

  emitIngredientsFailed(input: BuildAnalysisSocketPayloadInput) {
    this.emitToAnalysisRoom(ANALYSIS_SOCKET_EVENTS.ingredientsFailed, input);
  }

  private emitToAnalysisRoom(
    event: string,
    input: BuildAnalysisSocketPayloadInput,
  ) {
    if (!this.server) {
      return;
    }

    this.server
      .to(getAnalysisRoom(input.analysisId))
      .emit(event, buildAnalysisSocketPayload(input));
  }
}