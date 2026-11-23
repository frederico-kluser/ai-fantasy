import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { FastifyInstance } from "fastify";
import { describe, expect, it, onTestFinished } from "vitest";

import {
  configFor,
  LOCAL_HOST,
  rawExchange,
  temporaryFolder,
  testApp,
  treeOf,
  writeTree,
} from "../test/support.ts";
import { listeningAddresses, startServer } from "./server.ts";

const CAMPAIGN = { formatVersion: 1, characters: [{ id: "c1", name: "Otávio" }], gapHours: 72 };
const SLICE = Buffer.from(
  '{"formatVersion":1,"seeds":{"cast":7,"scene":9}}\n{"kind":"PLAYER_ACT","line":"Olá, ação ☕"}\r\n{"n":3}\n',
  "utf8",
);
const NDJSON = "application/x-ndjson";

const INVALID_ID = {
  error: {
    code: "INVALID_ID",
    message:
      "Id inválido: use de 1 a 64 caracteres entre a-z, 0-9 e '-', começando por letra ou número.",
  },
};
const INVALID_CAMPAIGN = {
  error: {
    code: "INVALID_BODY",
    message:
      "Campanha inválida: o corpo tem de ser um objeto JSON com formatVersion inteiro maior ou igual a 1.",
  },
};
const INVALID_JSON = { error: { code: "INVALID_BODY", message: "O corpo não é JSON válido." } };
const CAMPAIGN_NOT_FOUND = { error: { code: "NOT_FOUND", message: "Campanha não encontrada." } };
const SLICE_NOT_FOUND = { error: { code: "NOT_FOUND", message: "Fatia não encontrada." } };
const UNSUPPORTED = {
  error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Tipo de conteúdo não aceito nesta rota." },
};
const TOO_LARGE = {
  error: {
    code: "BODY_TOO_LARGE",
    message:
      "O corpo do pedido passa do limite de tamanho desta rota (BODY_LIMIT_BYTES ou SESSION_BODY_LIMIT_BYTES).",
  },
};

async function putCampaign(app: FastifyInstance, campaignId: string, payload: unknown = CAMPAIGN) {
  return app.inject({
    method: "PUT",
    url: `/api/sessions/campaigns/${campaignId}`,
    headers: { host: LOCAL_HOST, "content-type": "application/json" },
    payload: JSON.stringify(payload),
  });
}

async function putJson(app: FastifyInstance, campaignId: string, body: string) {
  return app.inject({
    method: "PUT",
    url: `/api/sessions/campaigns/${campaignId}`,
    headers: { host: LOCAL_HOST, "content-type": "application/json" },
    payload: body,
  });
}

async function putSlice(
  app: FastifyInstance,
  path: string,
  payload: Buffer | string = SLICE,
  contentType = NDJSON,
) {
  return app.inject({
    method: "PUT",
    url: `/api/sessions/campaigns/${path}`,
    headers: { host: LOCAL_HOST, "content-type": contentType },
    payload,
  });
}

async function get(app: FastifyInstance, path: string) {
  return app.inject({ url: `/api/sessions/${path}`, headers: { host: LOCAL_HOST } });
}

function errorOf(response: { statusCode: number; json: () => unknown }) {
  return { status: response.statusCode, body: response.json() };
}

describe("listing (GET /api/sessions/campaigns)", () => {
  it("given nothing saved when listing then the list is empty", async () => {
    const { app } = testApp();

    const response = await get(app, "campaigns");

    expect({ status: response.statusCode, body: response.json<unknown>() }).toEqual({
      status: 200,
      body: { campaigns: [] },
    });
  });

  it("given campaigns and slices saved when listing then both come in lexicographic order", async () => {
    const { app } = testApp();
    await putCampaign(app, "tavern");
    await putCampaign(app, "kitchen");
    await putSlice(app, "tavern/slices/2");
    await putSlice(app, "tavern/slices/10");
    await putSlice(app, "tavern/slices/1");
    await putSlice(app, "tavern/slices/2-b");

    const response = await get(app, "campaigns");

    expect(response.json<unknown>()).toEqual({
      campaigns: [
        { id: "kitchen", sliceIds: [] },
        { id: "tavern", sliceIds: ["1", "10", "2", "2-b"] },
      ],
    });
  });
});

describe("campaigns (PUT and GET /api/sessions/campaigns/:campaignId)", () => {
  it("given a campaign when saving it then the server answers 204 and writes campaign.json", async () => {
    const { app, dataDir } = testApp();

    const response = await putCampaign(app, "tavern");

    expect({
      status: response.statusCode,
      body: response.body,
      file: readFileSync(join(dataDir, "campaigns", "tavern", "campaign.json"), "utf8"),
      tree: treeOf(dataDir),
    }).toEqual({
      status: 204,
      body: "",
      file: `${JSON.stringify(CAMPAIGN, null, 2)}\n`,
      tree: ["campaigns", "campaigns/tavern", "campaigns/tavern/campaign.json"],
    });
  });

  it("given a saved campaign when reading it then the same JSON comes back", async () => {
    const { app } = testApp();
    await putCampaign(app, "tavern");

    const response = await get(app, "campaigns/tavern");

    expect({
      status: response.statusCode,
      type: response.headers["content-type"],
      body: response.json<unknown>(),
    }).toEqual({ status: 200, type: "application/json; charset=utf-8", body: CAMPAIGN });
  });

  it("given a saved campaign when saving it again then the new version replaces it", async () => {
    const { app } = testApp();
    await putCampaign(app, "tavern");

    await putCampaign(app, "tavern", { formatVersion: 2, renamed: true });

    expect((await get(app, "campaigns/tavern")).json<unknown>()).toEqual({
      formatVersion: 2,
      renamed: true,
    });
  });

  it("given no campaign when reading it then the server answers 404", async () => {
    const { app } = testApp();

    expect(errorOf(await get(app, "campaigns/missing"))).toEqual({
      status: 404,
      body: CAMPAIGN_NOT_FOUND,
    });
  });

  it.each([
    {},
    { formatVersion: 0 },
    { formatVersion: 1.5 },
    { formatVersion: "1" },
    [{ formatVersion: 1 }],
    "campaign",
    null,
  ])(
    "given the campaign %j when saving then the server answers 400 and writes nothing",
    async (payload) => {
      const { app, dataDir } = testApp();

      const response = await putCampaign(app, "tavern", payload);

      expect({ ...errorOf(response), tree: treeOf(dataDir) }).toEqual({
        status: 400,
        body: INVALID_CAMPAIGN,
        tree: [],
      });
    },
  );

  it.each([["{not json"], [""]])(
    "given the body %j that is not JSON when saving a campaign then the server answers 400",
    async (body) => {
      const { app } = testApp();

      expect(errorOf(await putJson(app, "tavern", body))).toEqual({
        status: 400,
        body: INVALID_JSON,
      });
    },
  );

  it("given no body when saving a campaign then the server answers 400", async () => {
    const { app } = testApp();

    const response = await app.inject({
      method: "PUT",
      url: "/api/sessions/campaigns/tavern",
      headers: { host: LOCAL_HOST },
    });

    expect(errorOf(response)).toEqual({ status: 400, body: INVALID_CAMPAIGN });
  });

  it.each(["text/plain", NDJSON, "application/xml"])(
    "given a campaign sent as %s when saving then the server answers 415",
    async (contentType) => {
      const { app } = testApp();

      const response = await app.inject({
        method: "PUT",
        url: "/api/sessions/campaigns/tavern",
        headers: { host: LOCAL_HOST, "content-type": contentType },
        payload: JSON.stringify(CAMPAIGN),
      });

      expect(errorOf(response)).toEqual({ status: 415, body: UNSUPPORTED });
    },
  );
});

describe("slices (PUT and GET /api/sessions/campaigns/:campaignId/slices/:sliceId)", () => {
  it("given a saved slice when reading it back then the JSONL is identical", async () => {
    const { app } = testApp();
    await putCampaign(app, "tavern");
    const saved = await putSlice(app, "tavern/slices/1");

    const response = await get(app, "campaigns/tavern/slices/1");

    expect({
      saved: saved.statusCode,
      status: response.statusCode,
      type: response.headers["content-type"],
      bytes: response.rawPayload,
    }).toEqual({
      saved: 204,
      status: 200,
      type: "application/x-ndjson; charset=utf-8",
      bytes: SLICE,
    });
  });

  it("given a slice when saving it then the file holds exactly the bytes received", async () => {
    const { app, dataDir } = testApp();
    await putCampaign(app, "tavern");

    await putSlice(app, "tavern/slices/2-b");

    expect(readFileSync(join(dataDir, "campaigns", "tavern", "slices", "2-b.jsonl"))).toEqual(
      SLICE,
    );
  });

  it("given a content type with a charset when saving a slice then it is accepted", async () => {
    const { app } = testApp();
    await putCampaign(app, "tavern");

    const response = await putSlice(app, "tavern/slices/1", SLICE, `${NDJSON}; charset=utf-8`);

    expect(response.statusCode).toBe(204);
  });

  it("given a saved slice when saving it again then the new bytes replace it", async () => {
    const { app } = testApp();
    await putCampaign(app, "tavern");
    await putSlice(app, "tavern/slices/1");

    await putSlice(app, "tavern/slices/1", '{"formatVersion":2}\n');

    expect((await get(app, "campaigns/tavern/slices/1")).body).toBe('{"formatVersion":2}\n');
  });

  it("given no campaign when saving a slice then the server answers 404 and writes nothing", async () => {
    const { app, dataDir } = testApp();

    const response = await putSlice(app, "tavern/slices/1");

    expect({ ...errorOf(response), tree: treeOf(dataDir) }).toEqual({
      status: 404,
      body: CAMPAIGN_NOT_FOUND,
      tree: [],
    });
  });

  it("given no slice when reading it then the server answers 404", async () => {
    const { app } = testApp();
    await putCampaign(app, "tavern");

    expect(errorOf(await get(app, "campaigns/tavern/slices/9"))).toEqual({
      status: 404,
      body: SLICE_NOT_FOUND,
    });
  });

  it.each([
    [
      '{"formatVersion":1}',
      "Fatia inválida: o JSONL tem de terminar com uma quebra de linha (\\n).",
    ],
    ['{"formatVersion":1}\n[1]\n', "Fatia inválida: a linha 2 não é um objeto JSON."],
    [
      '{"seed":1}\n',
      "Fatia inválida: a primeira linha precisa de formatVersion inteiro maior ou igual a 1.",
    ],
    [Buffer.from([0x7b, 0xff, 0x7d, 0x0a]), "Fatia inválida: o corpo não é texto UTF-8."],
  ])(
    "given the invalid slice %j when saving then the server answers 400 and writes nothing",
    async (payload, message) => {
      const { app, dataDir } = testApp();
      await putCampaign(app, "tavern");

      const response = await putSlice(app, "tavern/slices/1", payload);

      expect({
        ...errorOf(response),
        slices: existsSync(join(dataDir, "campaigns", "tavern", "slices")),
      }).toEqual({
        status: 400,
        body: { error: { code: "INVALID_BODY", message } },
        slices: false,
      });
    },
  );

  it("given no body when saving a slice then the server answers 400", async () => {
    const { app } = testApp();
    await putCampaign(app, "tavern");

    const response = await app.inject({
      method: "PUT",
      url: "/api/sessions/campaigns/tavern/slices/1",
      headers: { host: LOCAL_HOST },
    });

    expect(errorOf(response)).toEqual({
      status: 400,
      body: {
        error: { code: "INVALID_BODY", message: "Fatia inválida: o corpo não é texto UTF-8." },
      },
    });
  });

  it.each(["application/json", "text/plain", "application/octet-stream"])(
    "given a slice sent as %s when saving then the server answers 415",
    async (contentType) => {
      const { app } = testApp();
      await putCampaign(app, "tavern");

      expect(errorOf(await putSlice(app, "tavern/slices/1", SLICE, contentType))).toEqual({
        status: 415,
        body: UNSUPPORTED,
      });
    },
  );
});

describe("ids (overview §8: nothing outside the data folder)", () => {
  it("given a session id with ../ when saving then the request is rejected", async () => {
    const { app, dataDir } = testApp();

    const response = await putCampaign(app, "..%2F..%2Fescape");

    expect({
      ...errorOf(response),
      tree: treeOf(dataDir),
      escaped: existsSync(join(dirname(dirname(dataDir)), "escape")),
    }).toEqual({ status: 400, body: INVALID_ID, tree: [], escaped: false });
  });

  it.each(["..", "%2E%2E"])(
    "given the dot segment %j as campaign id when saving then the URL is normalized, no route matches and nothing is written",
    async (campaignId) => {
      const { app, dataDir } = testApp();

      expect({
        status: (await putCampaign(app, campaignId)).statusCode,
        tree: treeOf(dataDir),
      }).toEqual({
        status: 404,
        tree: [],
      });
    },
  );

  it("given a raw request with .. as campaign id (no client normalization) when saving then the server answers 400", async () => {
    const dataDir = temporaryFolder();
    const app = await startServer({
      config: configFor({ PORT: "0", DATA_DIR: dataDir }),
      webDistDir: temporaryFolder(),
    });
    onTestFinished(async () => {
      await app.close();
    });
    const port = Math.max(...listeningAddresses(app).map((address) => address.port));
    const body = '{"formatVersion":1}';

    const response = await rawExchange(
      port,
      `PUT /api/sessions/campaigns/.. HTTP/1.1\r\nHost: 127.0.0.1:${String(port)}\r\nContent-Type: application/json\r\nContent-Length: ${String(body.length)}\r\nConnection: close\r\n\r\n${body}`,
    );

    expect({
      status: response.split("\r\n")[0],
      invalidId: response.includes('"INVALID_ID"'),
      tree: treeOf(dataDir),
    }).toEqual({
      status: "HTTP/1.1 400 Bad Request",
      invalidId: true,
      tree: [],
    });
  });

  it.each(["..%5C..%5Cescape", "Tavern", "a_b", "a.b", "%20a", "a".repeat(65)])(
    "given the campaign id %j when saving then the server answers 400",
    async (campaignId) => {
      const { app, dataDir } = testApp();

      expect({ ...errorOf(await putCampaign(app, campaignId)), tree: treeOf(dataDir) }).toEqual({
        status: 400,
        body: INVALID_ID,
        tree: [],
      });
    },
  );

  it.each(["campaigns/..%2Fx", "campaigns/Tavern"])(
    "given the invalid id in %s when reading a campaign then the server answers 400",
    async (path) => {
      const { app } = testApp();

      expect(errorOf(await get(app, path))).toEqual({ status: 400, body: INVALID_ID });
    },
  );

  it.each(["tavern/slices/..%2F..%2F..%2Fescape", "tavern/slices/1.jsonl", "..%2Ftavern/slices/1"])(
    "given the invalid ids in %s when saving a slice then the server answers 400",
    async (path) => {
      const { app, dataDir } = testApp();
      await putCampaign(app, "tavern");

      expect({ ...errorOf(await putSlice(app, path)), tree: treeOf(dataDir) }).toEqual({
        status: 400,
        body: INVALID_ID,
        tree: ["campaigns", "campaigns/tavern", "campaigns/tavern/campaign.json"],
      });
    },
  );

  it.each([
    "campaigns/tavern/slices/..%2F..%2F..%2Fprivate",
    "campaigns/..%2F..%2Fprivate/slices/1",
  ])(
    "given the invalid ids in %s when reading a slice then the server answers 400 and reads nothing",
    async (path) => {
      const { app, dataDir } = testApp();
      writeTree(dataDir, "private.jsonl", '{"formatVersion":1,"private":true}\n');

      const response = await get(app, path);

      expect({ ...errorOf(response), leaked: response.body.includes("private") }).toEqual({
        status: 400,
        body: INVALID_ID,
        leaked: false,
      });
    },
  );
});

describe("session body limit (SESSION_BODY_LIMIT_BYTES)", () => {
  const LIMITS = { BODY_LIMIT_BYTES: "64", SESSION_BODY_LIMIT_BYTES: "256" };
  const header = '{"formatVersion":1}\n';

  it("given a slice above the global limit but within the session limit when saving then it is accepted", async () => {
    const { app } = testApp(LIMITS);
    await putCampaign(app, "tavern", { formatVersion: 1 });
    const slice = `${header}{"pad":"${"x".repeat(200 - header.length - 11)}"}\n`;

    const response = await putSlice(app, "tavern/slices/1", slice);

    expect({ size: Buffer.byteLength(slice), status: response.statusCode }).toEqual({
      size: 200,
      status: 204,
    });
  });

  it("given a slice exactly at the session limit when saving then it is accepted", async () => {
    const { app } = testApp(LIMITS);
    await putCampaign(app, "tavern", { formatVersion: 1 });
    const slice = `${header}{"pad":"${"x".repeat(256 - header.length - 11)}"}\n`;

    const response = await putSlice(app, "tavern/slices/1", slice);

    expect({ size: Buffer.byteLength(slice), status: response.statusCode }).toEqual({
      size: 256,
      status: 204,
    });
  });

  it("given a slice one byte above the session limit when saving then the server answers 413 and writes nothing", async () => {
    const { app, dataDir } = testApp(LIMITS);
    await putCampaign(app, "tavern", { formatVersion: 1 });
    const slice = `${header}{"pad":"${"x".repeat(257 - header.length - 11)}"}\n`;

    const response = await putSlice(app, "tavern/slices/1", slice);

    expect({
      size: Buffer.byteLength(slice),
      ...errorOf(response),
      slices: existsSync(join(dataDir, "campaigns", "tavern", "slices")),
    }).toEqual({ size: 257, status: 413, body: TOO_LARGE, slices: false });
  });

  it("given a campaign above the session limit when saving then the server answers 413", async () => {
    const { app } = testApp(LIMITS);

    const response = await putCampaign(app, "tavern", { formatVersion: 1, pad: "x".repeat(300) });

    expect(errorOf(response)).toEqual({ status: 413, body: TOO_LARGE });
  });
});
