import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function streamMediaToStorage(
  mediaUrl: string,
  bucketName: string,
): Promise<
  | { success: true; path: string; publicUrl: string; contentType: string }
  | { success: false; error: string }
> {
  try {
    new URL(mediaUrl);
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    const isAllowed =
      contentType.startsWith("audio/") ||
      contentType.startsWith("video/") ||
      contentType === "application/octet-stream";
    if (!isAllowed) throw new Error(`Unsupported content type: ${contentType}`);
    const ext = contentType.split("/")[1]?.split(";")[0] ?? "mp3";
    const filePath = `uploads/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, response.body!, { contentType, cacheControl: "no-cache", upsert: false });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return { success: true, path: data.path, publicUrl: urlData.publicUrl, contentType };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let text: string;
  let voiceId: string;
  let model: string;
  let speed: number | undefined;
  let vol: number | undefined;
  let pitch: number | undefined;
  let emotion: string | undefined;
  let audioFormat: string;

  try {
    const body = await req.json();
    text = body.text;
    if (!text) throw new Error("Missing text");
    voiceId = body.voice_id ?? "male-qn-qingse";
    model = body.model ?? "speech-02-turbo";
    speed = body.speed;
    vol = body.vol;
    pitch = body.pitch;
    emotion = body.emotion;
    audioFormat = body.audio_format ?? "mp3";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("INTEGRATIONS_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const voiceSetting: Record<string, unknown> = { voice_id: voiceId };
  if (speed !== undefined) voiceSetting.speed = speed;
  if (vol !== undefined) voiceSetting.vol = vol;
  if (pitch !== undefined) voiceSetting.pitch = pitch;
  if (emotion !== undefined) voiceSetting.emotion = emotion;

  const requestBody = {
    model,
    text,
    stream: false,
    output_format: "url",
    voice_setting: voiceSetting,
    audio_setting: { format: audioFormat },
  };

  const upstream = await fetch("https://app-cyyl8odtf08x-api-DLEO7Bj0lORa-gateway.appmiaoda.com/v1/t2a_v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gateway-Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text();
    return new Response(errText, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({ error: `Upstream error: ${upstream.status}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const result = await upstream.json();

  if (result.base_resp?.status_code !== 0) {
    return new Response(
      JSON.stringify({
        error: `TTS error ${result.base_resp?.status_code}: ${result.base_resp?.status_msg}`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const rawAudioUrl = result.data?.audio;
  const extraInfo = result.extra_info ?? {};

  let audioUrl = rawAudioUrl;
  if (rawAudioUrl) {
    const stored = await streamMediaToStorage(rawAudioUrl, "generated-audio");
    if (stored.success) {
      audioUrl = stored.publicUrl;
    }
  }

  return new Response(
    JSON.stringify({
      audioUrl,
      audioLength: extraInfo.audio_length,
      usageCharacters: extraInfo.usage_characters,
      audioFormat: extraInfo.audio_format,
      traceId: result.trace_id,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});