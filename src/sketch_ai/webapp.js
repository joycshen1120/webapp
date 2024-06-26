import * as fal from "npm:@fal-ai/serverless-client";

import { loadEnv } from "../../shared/util.ts";
import * as log from "../../shared/logger.ts";

// Change the current working directory to the directory of this script
// This is necessary to serve static files with the correct path even
// when the script is executed from a different directory
Deno.chdir(new URL(".", import.meta.url).pathname);
// log the current working directory with friendly message
console.log(`Current working directory: ${Deno.cwd()}`);

const env = loadEnv();
if (!env.FAL_API_KEY) log.warn("No FAL_API_KEY in .env file");

fal.config({
  credentials: env.FAL_API_KEY, // or a$function that returns a string
});

// Oak is a middleware framework for Deno's http server, it makes it easier to
// write web apps in Deno.
import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";

import { makeImage } from "../../shared/openai.ts";

// static server serves files from the public directory
// exitSignal is used to shut down the server when the process exits (ctrl-c)
import { createExitSignal, staticServer } from "../../shared/server.ts";

// create web server
const app = new Application();
const router = new Router();

//new generation 0422
router.get("/api/sketch", async (ctx) => {
  const prompt = ctx.request.url.searchParams.get("prompt");
  console.log("Sketch request received:", prompt);
  const shortPrompt = prompt.slice(0, 1024); // Shorten prompt if needed

  const result = await fal.subscribe("fal-ai/stable-cascade", { // Model name might need to be adjusted based on availability
    input: {
      "prompt": `Sketch of ${shortPrompt}`, // Modify the prompt to emphasize sketching
      "image_size": "square_hd",
      "num_images": 1,
      "first_stage_steps": 15, // Adjust these steps for less detail
      "second_stage_steps": 5,
      "guidance_scale": 2, // Lower guidance for less fidelity
      "enable_safety_checker": true,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        console.log("Sketch generation in progress...");
      }
    },
  });

  console.log("Sketch result:", result);
  ctx.response.body = result.images[0].url; // Return the URL of the generated sketch
});

router.get("/api/fal", async (ctx) => {
  const prompt = ctx.request.url.searchParams.get("prompt");
  console.log("Request received");
  console.log(prompt);
  const shortPrompt = prompt.slice(0, 1024);
  const result = await fal.subscribe("fal-ai/stable-cascade", {
    input: {
      "prompt": shortPrompt,
      "negative_prompt": "",
      "first_stage_steps": 20,
      "second_stage_steps": 10,
      "guidance_scale": 4,
      "image_size": "square_hd",
      "num_images": 1,
      "loras": [],
      "enable_safety_checker": true,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        // update.logs.map((log) => log.message).forEach(console.log);
      }
    },
  });
  console.log("result", result);
  ctx.response.body = result.images[0].url;
});

router.get("/api/falfast", async (ctx) => {
  const prompt = ctx.request.url.searchParams.get("prompt");
  console.log("Request received");
  console.log(prompt);
  const shortPrompt = prompt.slice(0, 1024);
  const result = await fal.subscribe("fal-ai/fast-lightning-sdxl", {
    input: {
      "prompt": shortPrompt,
      "image_size": "square_hd",
      "num_inference_steps": "4",
      "num_images": 1,
      "enable_safety_checker": true,
    },
    logs: true,
    onQueueUpdate: (update) => {
      if (update.status === "IN_PROGRESS") {
        // update.logs.map((log) => log.message).forEach(console.log);
      }
    },
  });
  console.log("result", result);
  ctx.response.body = result.images[0].url;
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
