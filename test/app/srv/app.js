const { cwdRequireCDS } = require("cds-internal-tool");

const cds = cwdRequireCDS()

module.exports = class MyService extends cds.ApplicationService {
  init() {
    this.on("ping", function () {
      return this.emit("pong", {})
    })
  }
}