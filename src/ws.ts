/* eslint-disable camelcase */
import { cwdRequireCDS, EventDefinition, Service } from "cds-internal-tool";
import { ClientOptions, WebSocket, WebSocketServer } from "ws";
import {
  ANNOTATION_CDS_WEBSOCKET_INBOUND,
  ANNOTATION_CDS_WEBSOCKET_OUTBOUND,
  ANNOTATION_CDS_WEBSOCKET_TARGET
} from "./constants";


const cds = cwdRequireCDS();
const logger = cds.log("ws");

export class CDSWebSocket extends WebSocket {
  __cds_service: Service;

  constructor(address: string, options?: ClientOptions & { service?: Service }) {
    super(address, options);
    this.__cds_service = options?.service as any;
  }
}

export class CDSWebSocketServer extends WebSocketServer {
  /**
   * websocket service mapping
   * key is path, value is cds.Service instance
   */
  __ws_services = new Map<string, Service>();

  public registerService(service: Service) {
    logger.info("register service", service.name, "with path", service.path, "for websocket");
    this.__ws_services.set(service.path!, service);
  }

  public hasServicePath(path: string) {
    return this.__ws_services.has(path);
  }

  public getServiceByPath(path: string) {
    return this.__ws_services.get(path);
  }


}

export function _service_message_dispatcher(ws: CDSWebSocket) {
  const cds = cwdRequireCDS();

  return function _message_dispatcher(this: CDSWebSocket, rawData: Buffer) {
    // TODO: log error when raw
    const payload = JSON.parse(rawData.toString("utf-8"));

    // TODO: validatge if events is not existed
    // TODO: tenant/user/id
    cds.spawn({}, () => {
      if (cds.context) {
        cds.context.__ws_client = ws;
      }
      return ws.__cds_service.emit(payload);
    });
  };
}

export function _serve_ws_events(service: Service) {

  // REVISIT: upgrade for path
  for (const ev of service.events()) {

    // short event name
    const evName = ev.name.slice(service.name.length + 1);

    // TODO: not possible annotated with both inbound and outbound
    if (ev[ANNOTATION_CDS_WEBSOCKET_INBOUND]) {
      logger.debug(
        "deteceted inbound event", ev.name,
        "for service", service.name
      );
      // _service_message_dispatcher has generic implementations
    }

    if (ev[ANNOTATION_CDS_WEBSOCKET_OUTBOUND]) {
      logger.debug(
        "impl outbound event", ev.name,
        "for service", service.name
      );

      // TODO: validate the target type
      service.on(
        evName as any,
        function _outbound_event_handler(req) {
          const clients: Set<WebSocket> = getClientsForEvent(ev);
          logger.debug("send message to", clients.size, "clients");
          if (clients.size === 0) { return; }

          // TODO: retry
          // REVISIT: maybe allSettled ?
          return Promise.all(
            Array.from(clients).map(client => new Promise<void>((resolve, reject) => {
              // TODO: retry
              // TODO: more information like id
              return client.send(
                JSON.stringify({
                  event: ev.name,
                  data: req.data
                }),
                (err) => err === undefined ? resolve() : reject(err)
              );
            }))
          );

        }
      );
    }

  }
}


/**
 * get target clients by event definition `@cds.websocket.target`
 * 
 * @param ev 
 * @returns 
 */
export function getClientsForEvent(ev: EventDefinition) {
  const cds = cwdRequireCDS();
  let clients: Set<WebSocket> = new Set();
  const target = ev[ANNOTATION_CDS_WEBSOCKET_TARGET];
  switch (target) {
    case "random":
      clients = new Set([getRandomWsClient()]);
      break;
    case "broadcast":
      clients = cds.wss.clients;
      break;
    case "context": case undefined:
      if (cds.context?.__ws_client) {
        clients = new Set([cds.context.__ws_client]);
      }
      else {
        clients = new Set([getRandomWsClient()]);
      }
      break;
    default:
      logger.warn("outbound target", target, "is NOT supported");
      break;
  }
  return clients;
}



/**
 * get a random client from current all clients
 * 
 * @returns 
 */
function getRandomWsClient() {
  const cds = cwdRequireCDS();
  const idx = Math.floor(Math.random() * (cds.wss.clients.size - 1));
  return Array.from(cds.wss.clients.values()).at(idx) as WebSocket;
}
