const port = parseInt(Deno.env.get("PORT") || "8000");

Deno.serve({ port }, async (req: Request) => {
  const url = new URL(req.url);
  const targetUrl = new URL(url.pathname + url.search, "https://api.openai.com");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Parse target URL params and body
  const headers = new Headers(req.headers);
  headers.set("Host", "api.openai.com");
  headers.delete("Origin");

  let body = null;
  if (req.body) {
    body = await req.arrayBuffer();
  }

  const upgrade = req.headers.get("Upgrade");
  if (upgrade && upgrade.toLowerCase() === "websocket") {
    const wsTarget = targetUrl.href.replace("https://", "wss://");
    const { socket: clientWs, response: wsResponse } = Deno.upgradeWebSocket(req);
    const serverWs = new WebSocket(wsTarget);

    serverWs.binaryType = "arraybuffer";
    clientWs.binaryType = "arraybuffer";

    serverWs.onopen = () => {};

    serverWs.onmessage = (event) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(event.data);
      }
    };

    clientWs.onmessage = (event) => {
      if (serverWs.readyState === WebSocket.OPEN) {
        serverWs.send(event.data);
      }
    };

    serverWs.onclose = () => {
      clientWs.close();
    };

    clientWs.onclose = () => {
      serverWs.close();
    };

    serverWs.onerror = () => {
      clientWs.close();
    };

    clientWs.onerror = () => {
      serverWs.close();
    };

    return wsResponse;
  }

  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: body ?? undefined,
  });

  const respHeaders = new Headers(response.headers);
  respHeaders.set("Access-Control-Allow-Origin", "*");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  });
});
