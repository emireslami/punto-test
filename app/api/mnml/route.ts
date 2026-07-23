import { NextRequest, NextResponse } from "next/server";

const endpoints = {
  fast: "https://api.mnmlai.dev/v1/archDiffusion-v44-lite",
  ultra: "https://api.mnmlai.dev/v1/archDiffusion-v44",
};

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const action = form.get("action")?.toString() || "render";
    const apiKey = form.get("api_key")?.toString() || process.env.MNML_API_KEY;

    if (!apiKey) {
      return jsonError("MNML_API_KEY تنظیم نشده و API key هم در فرم وارد نشده است.", 401);
    }

    if (action === "status") {
      const id = form.get("id")?.toString();
      if (!id) return jsonError("Request ID لازم است.", 400);

      const response = await fetch(`https://api.mnmlai.dev/v1/status/${encodeURIComponent(id)}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      });

      return proxyJson(response);
    }

    const model = form.get("model")?.toString() === "ultra" ? "ultra" : "fast";
    const image = form.get("image");
    const prompt = form.get("prompt")?.toString();

    if (!(image instanceof File)) return jsonError("عکس ورودی لازم است.", 400);
    if (!prompt) return jsonError("پرامپت لازم است.", 400);

    const outbound = new FormData();
    outbound.append("image", image);
    appendIfPresent(outbound, form, "prompt");
    appendIfPresent(outbound, form, "expert_name");
    appendIfPresent(outbound, form, "render_style");
    appendIfPresent(outbound, form, "geometry");
    outbound.append("output_format", "png");

    const response = await fetch(endpoints[model], {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: outbound,
    });

    return proxyJson(response);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "خطای ناشناخته", 500);
  }
}

function appendIfPresent(target: FormData, source: FormData, key: string) {
  const value = source.get(key);
  if (value !== null) target.append(key, value);
}

async function proxyJson(response: Response) {
  const text = await response.text();
  let data: unknown;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { status: "error", message: text || "پاسخ API قابل خواندن نبود" };
  }

  return NextResponse.json(data, { status: response.status });
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ status: "error", message }, { status });
}
