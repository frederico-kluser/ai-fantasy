import { describe, expect, it } from "vitest";

import { handleClientError, type ClientSocket } from "./errors.ts";

/** A socket that records what the handler writes and whether it was destroyed. */
function fakeSocket(state: { destroyed: boolean; writable: boolean }) {
  const writes: string[] = [];
  const socket: ClientSocket & { closed: boolean } = {
    destroyed: state.destroyed,
    writable: state.writable,
    closed: false,
    write: (data) => {
      writes.push(data);
      return true;
    },
    destroy: () => {
      socket.closed = true;
      return socket;
    },
  };
  return { socket, writes };
}

/** The raw HTTP response the handler writes for `status` and the error body. */
function rawResponse(status: string, body: object): string {
  const json = JSON.stringify(body);
  return `HTTP/1.1 ${status}\r\nConnection: close\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${String(Buffer.byteLength(json))}\r\n\r\n${json}`;
}

describe("errors of the HTTP parser, before Fastify sees a request (overview §5.2)", () => {
  it.each([
    [
      "HPE_HEADER_OVERFLOW",
      "431 Request Header Fields Too Large",
      { code: "HEADERS_TOO_LARGE", message: "Os cabeçalhos do pedido passam do tamanho máximo." },
    ],
    [
      "ERR_HTTP_REQUEST_TIMEOUT",
      "408 Request Timeout",
      { code: "REQUEST_TIMEOUT", message: "O pedido demorou demais para chegar." },
    ],
    [
      "HPE_INVALID_METHOD",
      "400 Bad Request",
      { code: "MALFORMED_REQUEST", message: "Pedido HTTP malformado." },
    ],
  ])(
    "given the parser error %s when handling it then the JSON error goes out and the socket closes",
    (code, status, error) => {
      const { socket, writes } = fakeSocket({ destroyed: false, writable: true });

      handleClientError({ code }, socket);

      expect({ writes, closed: socket.closed }).toEqual({
        writes: [rawResponse(status, { error })],
        closed: true,
      });
    },
  );

  it("given a parser error without a code when handling it then the answer is the malformed request", () => {
    const { socket, writes } = fakeSocket({ destroyed: false, writable: true });

    handleClientError({}, socket);

    expect(writes).toEqual([
      rawResponse("400 Bad Request", {
        error: { code: "MALFORMED_REQUEST", message: "Pedido HTTP malformado." },
      }),
    ]);
  });

  it("given a connection reset by the client when handling it then nothing is written and the socket is left alone", () => {
    const { socket, writes } = fakeSocket({ destroyed: false, writable: true });

    handleClientError({ code: "ECONNRESET" }, socket);

    expect({ writes, closed: socket.closed }).toEqual({ writes: [], closed: false });
  });

  it("given a socket already destroyed when handling an error then nothing is written", () => {
    const { socket, writes } = fakeSocket({ destroyed: true, writable: true });

    handleClientError({ code: "HPE_INVALID_METHOD" }, socket);

    expect({ writes, closed: socket.closed }).toEqual({ writes: [], closed: false });
  });

  it("given a socket that can no longer be written when handling an error then it is only closed", () => {
    const { socket, writes } = fakeSocket({ destroyed: false, writable: false });

    handleClientError({ code: "HPE_INVALID_METHOD" }, socket);

    expect({ writes, closed: socket.closed }).toEqual({ writes: [], closed: true });
  });
});
