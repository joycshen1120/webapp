import * as fal from "npm:@fal-ai/serverless-client";

import { loadEnv } from "../shared/util.ts";
import * as log from "../shared/logger.ts";

const env = loadEnv();
if (!env.FAL_API_KEY) log.warn("No FAL_API_KEY in .env file");

fal.config({
  credentials: env.FAL_API_KEY, // or a$function that returns a string
});

import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";

import { makeImage } from "../shared/openai.ts";

import { createExitSignal, staticServer } from "../shared/server.ts";

import { gptPrompt } from "../shared/openai.ts";

// create web server
const app = new Application();
const router = new Router();

// add the DALL•E route
router.get("/api/dalle", async (ctx) => {
  const objectElement = ctx.request.url.searchParams.get("objectElement");
  console.log("Request received");
  const prompt =
    `draw a simple sketch of ${objectElement}, make it low fidelity style, draw like a designer making their first sketch of an idea `;
  const shortPrompt = await gptPrompt(
    prompt,
    {
      temperature: 0.6,
      max_tokens: 1024,
    },
  );
  console.log(shortPrompt);
  // const shortPrompt = answer.slice(0, 1024);
  const result = await makeImage(shortPrompt);
  ctx.response.body = result;
});

// install routes
app.use(router.routes());
app.use(router.allowedMethods());

// set it up to serve static files from public
app.use(staticServer);

// tell the user we are about to start
console.log("\nListening on http://localhost:8000");

// start the web server
await app.listen({ port: 8000, signal: createExitSignal() });
