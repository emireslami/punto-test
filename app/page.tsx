"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

const experts = ["exterior", "interior", "masterplan", "landscape", "plan", "product"];
const styles = [
  "photoreal",
  "raw",
  "cgi_render",
  "cad",
  "freehand_sketch",
  "clay_model",
  "illustration",
  "watercolor",
];

type Model = "fast" | "ultra";
type RenderResponse = {
  status?: string;
  id?: string;
  message?: string[] | string;
  credits?: number;
  seed?: number;
  error?: string;
  code?: string;
};

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<Model>("fast");
  const [expert, setExpert] = useState("exterior");
  const [renderStyle, setRenderStyle] = useState("photoreal");
  const [geometry, setGeometry] = useState("precise");
  const [status, setStatus] = useState("آماده");
  const [requestId, setRequestId] = useState("");
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [rawResponse, setRawResponse] = useState<RenderResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => Boolean(image && prompt.trim() && !isSubmitting),
    [image, prompt, isSubmitting],
  );

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImage(file);
    setResultUrls([]);
    setRawResponse(null);
    setRequestId("");

    if (preview) URL.revokeObjectURL(preview);
    setPreview(file ? URL.createObjectURL(file) : "");
  }

  async function callMnml(formData: FormData) {
    const response = await fetch("/api/mnml", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as RenderResponse;
    if (!response.ok) {
      throw new Error(data.message?.toString() || data.error || "درخواست ناموفق بود");
    }
    return data;
  }

  async function pollStatus(id: string, key: string) {
    let delay = 3500;

    for (let attempt = 0; attempt < 24; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      const formData = new FormData();
      formData.append("action", "status");
      formData.append("id", id);
      if (key.trim()) formData.append("api_key", key.trim());

      const data = await callMnml(formData);
      setRawResponse(data);
      setStatus(statusLabel(data.status));

      if (data.status === "success") {
        const urls = Array.isArray(data.message)
          ? data.message
          : data.message
            ? [data.message]
            : [];
        setResultUrls(urls);
        return;
      }

      if (data.status === "failed" || data.status === "canceled") {
        throw new Error(data.error || data.message?.toString() || "پردازش متوقف شد");
      }

      delay = Math.min(delay + 1000, 7000);
    }

    setStatus("در حال پردازش؛ بعدا با همین Request ID وضعیت را چک کنید");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!image || !prompt.trim()) return;

    setIsSubmitting(true);
    setStatus("ارسال به mnml.ai");
    setResultUrls([]);
    setRawResponse(null);
    setRequestId("");

    try {
      const formData = new FormData();
      formData.append("action", "render");
      formData.append("model", model);
      formData.append("image", image);
      formData.append("prompt", prompt.trim());
      formData.append("expert_name", expert);
      formData.append("render_style", renderStyle);
      formData.append("geometry", geometry);
      if (apiKey.trim()) formData.append("api_key", apiKey.trim());

      const data = await callMnml(formData);
      setRawResponse(data);

      if (!data.id) {
        throw new Error("API شناسه‌ی درخواست برنگرداند");
      }

      setRequestId(data.id);
      setStatus(`در صف پردازش: ${data.id}`);
      await pollStatus(data.id, apiKey);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "خطای ناشناخته");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f1ea] text-[#1d2522]" dir="rtl">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8">
        <aside className="flex flex-col justify-between rounded-lg border border-[#d7d0c3] bg-[#fffcf6] p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-[#5d6f68]">mnml.ai render panel</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-[#151b19] sm:text-4xl">
              خروجی سریع از v4.4 Fast و Ultra
            </h1>
            <p className="mt-4 leading-7 text-[#50605a]">
              عکس معماری یا محصول را بدهید، پرامپت را بنویسید و مدل را انتخاب کنید.
              نتیجه بعد از پردازش در همین صفحه نمایش داده می‌شود.
            </p>
          </div>

          <div className="mt-8 grid gap-3 text-sm text-[#50605a]">
            <div className="rounded-md bg-[#eef3ef] p-3">
              Fast: سریع‌تر، خروجی 1K، یک اعتبار برای هر تولید.
            </div>
            <div className="rounded-md bg-[#f7eadb] p-3">
              Ultra: کیفیت بالاتر، خروجی 2K، سه اعتبار برای هر تولید.
            </div>
          </div>
        </aside>

        <div className="grid gap-5">
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-[#d7d0c3] bg-white p-4 shadow-sm sm:p-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm font-medium">عکس ورودی</span>
                <input
                  className="rounded-md border border-[#cfc7b8] bg-[#fffcf6] px-3 py-2 text-sm"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImage}
                  required
                />
              </label>

              {preview ? (
                <div className="sm:col-span-2">
                  <img
                    src={preview}
                    alt="پیش‌نمایش عکس ورودی"
                    className="h-64 w-full rounded-md border border-[#d7d0c3] object-contain bg-[#f9f6ef]"
                  />
                </div>
              ) : null}

              <label className="grid gap-2 sm:col-span-2">
                <span className="text-sm font-medium">پرامپت</span>
                <textarea
                  className="min-h-28 resize-y rounded-md border border-[#cfc7b8] bg-[#fffcf6] px-3 py-2 leading-7 outline-none focus:border-[#21735b]"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  maxLength={2000}
                  placeholder="مثلا: نمای مدرن با شیشه، نور golden hour و فضای سبز طبیعی"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">API Key</span>
                <input
                  className="rounded-md border border-[#cfc7b8] bg-[#fffcf6] px-3 py-2 text-left text-sm outline-none focus:border-[#21735b]"
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="اختیاری اگر MNML_API_KEY تنظیم شده"
                  dir="ltr"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Expert</span>
                <select
                  className="rounded-md border border-[#cfc7b8] bg-[#fffcf6] px-3 py-2 outline-none focus:border-[#21735b]"
                  value={expert}
                  onChange={(event) => setExpert(event.target.value)}
                >
                  {experts.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Render style</span>
                <select
                  className="rounded-md border border-[#cfc7b8] bg-[#fffcf6] px-3 py-2 outline-none focus:border-[#21735b]"
                  value={renderStyle}
                  onChange={(event) => setRenderStyle(event.target.value)}
                >
                  {styles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Geometry</span>
                <select
                  className="rounded-md border border-[#cfc7b8] bg-[#fffcf6] px-3 py-2 outline-none focus:border-[#21735b]"
                  value={geometry}
                  onChange={(event) => setGeometry(event.target.value)}
                >
                  <option value="precise">precise</option>
                  <option value="creative">creative</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-grid grid-cols-2 rounded-md border border-[#cfc7b8] bg-[#f6f2ea] p-1">
                {(["fast", "ultra"] as Model[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setModel(item)}
                    className={`rounded px-4 py-2 text-sm font-semibold transition ${
                      model === item ? "bg-[#21735b] text-white" : "text-[#50605a]"
                    }`}
                  >
                    {item === "fast" ? "v4.4 Fast" : "v4.4 Ultra"}
                  </button>
                ))}
              </div>

              <button
                className="rounded-md bg-[#151b19] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#28312e] disabled:cursor-not-allowed disabled:bg-[#9aa39f]"
                type="submit"
                disabled={!canSubmit}
              >
                {isSubmitting ? "در حال ساخت..." : "گرفتن خروجی"}
              </button>
            </div>
          </form>

          <section className="rounded-lg border border-[#d7d0c3] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">نتیجه</h2>
              <span className="rounded-md bg-[#eef3ef] px-3 py-2 text-sm text-[#2d5d4f]">
                {status}
              </span>
            </div>

            {requestId ? (
              <p className="mt-3 text-sm text-[#50605a]" dir="ltr">
                Request ID: {requestId}
              </p>
            ) : null}

            {resultUrls.length ? (
              <div className="mt-4 grid gap-4">
                {resultUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt="خروجی تولید شده"
                      className="max-h-[560px] w-full rounded-md border border-[#d7d0c3] object-contain bg-[#f9f6ef]"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex min-h-52 items-center justify-center rounded-md border border-dashed border-[#cfc7b8] bg-[#fffcf6] px-4 text-center text-[#6b7671]">
                خروجی بعد از تکمیل پردازش اینجا دیده می‌شود.
              </div>
            )}

            {rawResponse ? (
              <details className="mt-4 rounded-md bg-[#f5f3ee] p-3 text-sm">
                <summary className="cursor-pointer font-medium">پاسخ خام API</summary>
                <pre className="mt-3 overflow-auto text-left" dir="ltr">
                  {JSON.stringify(rawResponse, null, 2)}
                </pre>
              </details>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}

function statusLabel(status?: string) {
  switch (status) {
    case "starting":
      return "شروع پردازش";
    case "processing":
      return "در حال پردازش";
    case "success":
      return "آماده";
    case "failed":
      return "ناموفق";
    case "canceled":
      return "لغو شده";
    default:
      return status || "در انتظار پاسخ";
  }
}
