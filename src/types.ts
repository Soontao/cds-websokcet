import type { WebSocket, WebSocketServer } from "ws";

declare module "cds-internal-tool" {
  interface CDS {
    wss: WebSocketServer;
  }
  interface EventContext {
    __ws_client?: WebSocket
  }
}
