import { cwdRequireCDS, EventNames } from "cds-internal-tool";
import { CDSWebSocket, _service_message_dispatcher } from "./ws";

const cds = cwdRequireCDS();
const { Service } = cds;

class WebSocketClientService extends Service<EventNames, { url: string }> {

  // TODO: reconnect
  private _ws!: CDSWebSocket;

  async init() {
    const logger = cds.log(this.name ?? "WebSocketClientService");

    // TODO: validate options
    const ws = this._ws = new CDSWebSocket(this.options.url, { service: this as any });
    ws.on("message", _service_message_dispatcher(ws) as any);
    ws.on("error", logger.error);

    // TODO: timeout
    await new Promise((resolve) => ws.on("open", resolve));

    // TODO: regsiter inbound event to cds.Service


    // outbound handler
    this.on("*", (req) => {
      return new Promise<void>((resolve, reject) => {
        ws.send(
          JSON.stringify({
            event: req.event,
            data: req.data,
            headers: req.headers,
          }),
          (err) => {
            if (err) { reject(err); } else { resolve(); }
          }
        );
      });
    });

    await super.init();
  }

}


export = WebSocketClientService