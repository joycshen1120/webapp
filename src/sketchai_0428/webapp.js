import * as fal from "npm:@fal-ai/serverless-client";
import { loadEnv } from "../../shared/util.ts";
import * as log from "../../shared/logger.ts";
import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { createExitSignal, staticServer } from "../../shared/server.ts";

import { ask, say } from "../../shared/cli.js";
import { gptPrompt } from "../../shared/openai.js";

try {
  const path = new URL(".", import.meta.url).pathname;
  const correctedPath = Deno.build.os === "windows" ? path.substring(1) : path;
  Deno.chdir(correctedPath);
  console.log(`Current working directory: ${Deno.cwd()}`);
} catch (error) {
  console.error("Failed to change directory:", error.message);
}

const env = loadEnv();
if (!env.FAL_API_KEY) {
  log.error("No FAL_API_KEY in .env file. Please provide the API key.");
  Deno.exit(1); // Exit the application if API key is missing
}

fal.config({
  credentials: env.FAL_API_KEY,
});

const app = new Application();
const router = new Router();

router.post("/api/sketch", async (ctx) => {
  try {
    const { phrase, setting } = await ctx.request.body().value;

    console.log("body", await ctx.request.body().value);
    log.info(
      `Received sketch request with phrase: ${phrase} and setting: ${setting}`,
    );

    const shortPrompt = `Sketch of ${phrase} in ${setting}.`;
    const result = await fal.subscribe("fal-ai/stable-cascade", {
      input: {
        "prompt": shortPrompt,
        "image_size": "square_hd",
        "num_images": 1,
        "first_stage_steps": 15,
        "second_stage_steps": 5,
        "guidance_scale": 2,
        "enable_safety_checker": true,
      },
      logs: true,
    });

    const sketchUrl = result.images?.[0]?.url ?? null;

    ctx.response.status = 200;
    ctx.response.body = { sketchUrl };
  } catch (error) {
    log.error("Error processing sketch:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to generate sketch" };
  }
});

router.post("/api/saveThoughts", async (ctx) => {
  try {
    const { thoughts } = await ctx.request.body().value;

    console.log("Received thoughts:", thoughts);

    const format = `
    {
  "prompt_1": "In the dead of night, under a full moon, a circle of stones begins to glow",
  "prompt_2": "With a sudden burst of emerald light, the air crackles with energy as the witch materializes",
  "prompt_3": "The witch raises her arms, summoning her familiar, a black cat with piercing green eyes",
  "prompt_4": "She extends a hand, enchanting the surrounding forest, causing the trees to bend",
  "prompt_5": "The witch weaves her incantations, a symphony of whispered spells",
}
    `;

    const response = await gptPrompt(
      `
      The user input was '${thoughts}' and '${shortPrompt}'.
      You are a talented storyboard script generator. Based on the ${thoughts} and ${shortPrompt}, generate a concise and creative series prompts for quick storyboarding. One sentence for each prompt.
      Respond with JSON. Use this format: ${format}.
      Return only the JSON, starting with { and end with }.
      `,
      {
        max_tokens: 512,
        temperature: 0.75,
        response_format: { type: "json_object" },
      },
    );

    const prompts = JSON.parse(response);

    say(prompts);
    console.log(prompts);

    // Returning the AI-generated prompts to the frontend
    ctx.response.status = 200;
    ctx.response.body = { prompts, message: "Prompts generated successfully" };
  } catch (error) {
    console.error("Error handling /api/saveThoughts:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to generate prompts" };
  }
});

router.post("/api/storyboard", async (ctx) => {
  try {
    const { prompts } = await ctx.request.body().value; // Expecting an array of prompts
    log.info(`Received storyboard request with prompts: ${prompts}`);

    const images = [];
    for (let prompt of prompts) {
      const shortPrompt =
        `Sketch of ${prompt}. Drawn in a designer's rough sketch style.`;
      const result = await fal.subscribe("fal-ai/stable-cascade", {
        input: {
          "prompt": shortPrompt,
          "image_size": "square_hd",
          "num_images": 1,
          "first_stage_steps": 15,
          "second_stage_steps": 5,
          "guidance_scale": 2,
          "enable_safety_checker": true,
        },
        logs: true,
      });

      images.push(
        result.images && result.images.length > 0 ? result.images[0].url : null,
      );
    }

    ctx.response.status = 200;
    ctx.response.body = { images };
  } catch (error) {
    log.error("Error processing storyboard:", error);
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to generate storyboard" };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());
app.use(staticServer);

const PORT = 8000;
console.log(`\nServer listening on http://localhost:${PORT}`);
await app.listen({ port: PORT, signal: createExitSignal() });
