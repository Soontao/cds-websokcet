import type { WebSocket } from "ws";

import { CDSWebSocketServer } from "./ws";

declare module "cds-internal-tool" {
  interface Service {
    path?: string;
  }

  interface CDS {
    wss: CDSWebSocketServer;
  }

  interface EventContext {
    __ws_client?: WebSocket
  }
}

