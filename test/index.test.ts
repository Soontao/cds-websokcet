import { setupTest } from "cds-internal-tool";
import { WebSocket } from "ws";

describe("Index Test Suite", () => {

  const axios = setupTest(__dirname, "./app")

  it('should support startup server', async () => {
    const response = await axios.get("/my/$metadata")
    expect(response.status).toBe(200)
    expect(response.data).toMatch(/test\.app\.srv\.MyService/)
  });

  it('should support build WebSocket connection', async () => {
    const ws = new WebSocket(`ws://${axios.defaults!.baseURL!.slice(7)}/my`)
    await new Promise(resolve => ws.on("open", resolve))
    await Promise.all([
      new Promise<any>(
        (resolve) => { ws.on("message", resolve) }
      ),
      new Promise<void>(
        (resolve, reject) =>
          ws.send(
            JSON.stringify({ event: "test.app.srv.MyService.ping" }),
            (err) => err === undefined ? resolve() : reject(err)
          )
      ),
    ])
    ws.close()
  });

});
