/**
 * Session routes (overview §5 and §8), mounted under `/api/sessions`:
 *
 * - `GET /campaigns` → `{ campaigns: [{ id, sliceIds }] }`, in lexicographic order;
 * - `GET /campaigns/:campaignId` → the saved `campaign.json`;
 * - `PUT /campaigns/:campaignId` → saves a JSON object with `formatVersion` ≥ 1 (204);
 * - `GET /campaigns/:campaignId/slices/:sliceId` → the saved JSONL, byte for byte;
 * - `PUT /campaigns/:campaignId/slices/:sliceId` → saves an `application/x-ndjson`
 *   body exactly as received (204); the campaign must exist (404 otherwise).
 *
 * Ids are checked before anything touches the disk (400). Campaigns accept only
 * JSON and slices only NDJSON: any other content type is 415.
 */
import type { FastifyInstance, FastifyPluginCallback } from "fastify";
import { z } from "zod";

import { API_ERRORS, sendError } from "./errors.ts";
import { campaignDocument, sessionId, validateSlice } from "./session-format.ts";
import type { SessionStore } from "./session-store.ts";

/** Options of {@link sessionRoutes}. */
export interface SessionRoutesOptions {
  readonly store: SessionStore;
  /** Largest body of the save routes (`SESSION_BODY_LIMIT_BYTES`). */
  readonly bodyLimit: number;
}

/** Media type of slices, with the charset the server answers with. */
export const NDJSON_TYPE = "application/x-ndjson; charset=utf-8";
const JSON_TYPE = "application/json; charset=utf-8";

const campaignParams = z.object({ campaignId: sessionId });
const sliceParams = z.object({ campaignId: sessionId, sliceId: sessionId });

/** Campaign routes; this context parses JSON only. */
const campaignRoutes: FastifyPluginCallback<SessionRoutesOptions> = (
  app,
  { store, bodyLimit },
  done,
) => {
  app.removeContentTypeParser("text/plain");

  app.get("/campaigns", async () => ({ campaigns: await store.listCampaigns() }));

  app.get("/campaigns/:campaignId", async (request, reply) => {
    const params = campaignParams.safeParse(request.params);
    if (!params.success) {
      return sendError(reply, 400, API_ERRORS.invalidId);
    }
    const campaign = await store.readCampaign(params.data.campaignId);
    if (campaign === undefined) {
      return sendError(reply, 404, API_ERRORS.campaignNotFound);
    }
    return reply.type(JSON_TYPE).send(campaign);
  });

  app.put("/campaigns/:campaignId", { bodyLimit }, async (request, reply) => {
    const params = campaignParams.safeParse(request.params);
    if (!params.success) {
      return sendError(reply, 400, API_ERRORS.invalidId);
    }
    if (!campaignDocument.safeParse(request.body).success) {
      return sendError(reply, 400, API_ERRORS.invalidCampaign);
    }
    await store.writeCampaign(params.data.campaignId, `${JSON.stringify(request.body, null, 2)}\n`);
    return reply.code(204).send();
  });

  done();
};

/** Keeps only the NDJSON parser in this context, as raw bytes: other content types get 415. */
function acceptNdjsonOnly(app: FastifyInstance): void {
  app.removeAllContentTypeParsers();
  app.addContentTypeParser(
    "application/x-ndjson",
    { parseAs: "buffer" },
    (_request, body, parsed) => {
      parsed(null, body);
    },
  );
}

/** Slice routes; this context parses NDJSON only, as raw bytes. */
const sliceRoutes: FastifyPluginCallback<SessionRoutesOptions> = (
  app,
  { store, bodyLimit },
  done,
) => {
  acceptNdjsonOnly(app);

  app.get("/campaigns/:campaignId/slices/:sliceId", async (request, reply) => {
    const params = sliceParams.safeParse(request.params);
    if (!params.success) {
      return sendError(reply, 400, API_ERRORS.invalidId);
    }
    const slice = await store.readSlice(params.data.campaignId, params.data.sliceId);
    if (slice === undefined) {
      return sendError(reply, 404, API_ERRORS.sliceNotFound);
    }
    return reply.type(NDJSON_TYPE).send(slice);
  });

  app.put("/campaigns/:campaignId/slices/:sliceId", { bodyLimit }, async (request, reply) => {
    const params = sliceParams.safeParse(request.params);
    if (!params.success) {
      return sendError(reply, 400, API_ERRORS.invalidId);
    }
    const slice = validateSlice(request.body);
    if (!slice.ok) {
      return sendError(reply, 400, { code: "INVALID_BODY", message: slice.error });
    }
    if (!(await store.hasCampaign(params.data.campaignId))) {
      return sendError(reply, 404, API_ERRORS.campaignNotFound);
    }
    await store.writeSlice(params.data.campaignId, params.data.sliceId, slice.value);
    return reply.code(204).send();
  });

  done();
};

/**
 * The session routes. Register them with `prefix: "/api/sessions"`; each kind of
 * document gets its own context, so the content types stay apart.
 */
export const sessionRoutes: FastifyPluginCallback<SessionRoutesOptions> = (
  app,
  { store, bodyLimit },
  done,
) => {
  // Only the route options go down: the prefix was already applied to this context.
  void app.register(campaignRoutes, { store, bodyLimit });
  void app.register(sliceRoutes, { store, bodyLimit });
  done();
};
