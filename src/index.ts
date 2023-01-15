import { cwdRequireCDS } from "cds-internal-tool";
import { WebSocket, WebSocketServer } from "ws";
import { ANNOTATION_CDS_WEBSOCKET_ENABLED, ANNOTATION_CDS_WEBSOCKET_INBOUND, ANNOTATION_CDS_WEBSOCKET_OUTBOUND, ANNOTATION_CDS_WEBSOCKET_TARGET } from "./constants";
import "./types";

const cds = cwdRequireCDS()
const logger = cds.log("ws")

function _message_dispatcher(this: WebSocket, rawData: Buffer, isRaw: boolean) {
  // TODO: log error when raw
  const { event, data } = JSON.parse(rawData.toString("utf-8"))
  this.emit(event, data)
}

function getRandomWsClient() {
  const idx = Math.floor(Math.random() * (cds.wss.clients.size - 1))
  return Array.from(cds.wss.clients.values()).at(idx) as WebSocket
}

cds.once("listening", ({ server }) => {
  cds.wss = new WebSocketServer({ server })
  cds.wss.on("connection", (ws) => { ws.on("message", _message_dispatcher) })

  for (const service of cds.services) {
    if (service?.definition?.[ANNOTATION_CDS_WEBSOCKET_ENABLED] === true) {
      // REVISIT: upgrade for path
      for (const ev of service.events()) {
        const evName = ev.name.slice(service.name.length + 1)
        // TODO: not possible annotated with both inbound and outbound
        if (ev[ANNOTATION_CDS_WEBSOCKET_INBOUND]) {
          logger.debug(
            "listen inbound event", ev.name,
            "for service", service.name
          )
          cds.wss?.on("connection", ws => {
            ws.on(ev.name, (data) => {
              // TODO: tenant
              cds.spawn({}, () => {
                if (cds.context) {
                  cds.context.__ws_client = ws
                }
                return service.emit(evName, data)
              })
            })
          })
        }

        if (ev[ANNOTATION_CDS_WEBSOCKET_OUTBOUND]) {
          logger.debug(
            "impl outbound event", ev.name,
            "for service", service.name
          )

          // TODO: validate the target type
          service.on(evName as any, (req) => {
            let clients: Set<WebSocket> = new Set()
            const target = ev[ANNOTATION_CDS_WEBSOCKET_TARGET]
            switch (target) {
              case 'random':
                clients = new Set([getRandomWsClient()])
                break;
              case 'broadcast':
                clients = cds.wss.clients
                break;
              case 'context': case undefined:
                if (cds.context?.__ws_client) {
                  clients = new Set([cds.context.__ws_client])
                }
                else {
                  clients = new Set([getRandomWsClient()])
                }
                break
              default:
                logger.warn("inbound target", target, "is NOT supported")
                break;
            }

            for (const client of clients) {
              client.send(
                JSON.stringify({
                  event: ev.name,
                  data: req.data
                })
              )
            }
          })
        }

      }
    }
  }
})

