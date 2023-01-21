/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable camelcase */
import { cwdRequireCDS } from "cds-internal-tool";
import url from "url";
import { ANNOTATION_CDS_WEBSOCKET_ENABLED } from "./constants";
import "./types";
import { CDSWebSocket, CDSWebSocketServer, _serve_ws_events, _service_message_dispatcher } from "./ws";

const cds = cwdRequireCDS();
const logger = cds.log("ws");


cds.once("listening", ({ server }) => {
  const wss = cds.wss = new CDSWebSocketServer({ noServer: true });
  wss.on("connection", (ws: CDSWebSocket) => { ws.on("message", _service_message_dispatcher(ws) as any); });

  server.on("upgrade", function _handleUpgrade(req, socket, head) {
    if (req.url) {
      const { pathname } = url.parse(req.url);
      if (pathname !== null && wss.hasServicePath(pathname)) {
        const service = wss.getServiceByPath(pathname);
        wss.handleUpgrade(req, socket, head, function (ws: CDSWebSocket) {
          ws.__cds_service = service!;
          wss.emit("connection", ws, req);
        } as unknown as any);
        return;
      }
    }

    logger.error("unexpected request", req.url);
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
  });

  for (const service of cds.services) {
    if (service?.definition?.[ANNOTATION_CDS_WEBSOCKET_ENABLED] === true) {
      if (service.path) {
        logger.info("serving webscoket", service.name);
        wss.registerService(service);
        _serve_ws_events(service);
      }
      else {
        logger.warn("service", service.name, "do not have path, so cannot handled by websocket");
      }
    }
  }
});
