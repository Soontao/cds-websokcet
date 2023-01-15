namespace test.app.srv;


@cds.websocket.enabled
service MyService {

  @cds.websocket.inbound
  event confirm {

  };

  @cds.websocket.inbound
  event ping {

  };

  @cds.websocket.target: 'context'
  @cds.websocket.outbound
  event pong {

  };

  @cds.websocket.target: 'random' // random one
  @cds.websocket.outbound
  event dispatch {

  }

  // by default, is context
  @cds.websocket.target: 'context' // inbound one, if not have context client, raise error
  @cds.websocket.outbound
  event reply {

  }


  @cds.websocket.target: 'all' // all clients
  @cds.websocket.outbound
  event notifyAll {

  };

}
