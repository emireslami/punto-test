"use client";

import {
  ApiOutlined,
  CloudUploadOutlined,
  CodeOutlined,
  FileImageOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Collapse,
  ConfigProvider,
  Divider,
  Flex,
  Form,
  Image as AntImage,
  Input,
  Segmented,
  Select,
  Slider,
  Space,
  Tag,
  Typography,
  Upload,
  theme,
} from "antd";
import type { UploadFile } from "antd";
import faIR from "antd/locale/fa_IR";
import { useMemo, useState } from "react";

const { Text, Title, Paragraph } = Typography;
const { Dragger } = Upload;

const experts = ["exterior", "interior", "masterplan", "landscape", "plan", "product"];
const styles = ["photoreal", "raw", "cgi_render", "cad", "freehand_sketch", "clay_model"];

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

type FormValues = {
  prompt: string;
  apiKey?: string;
  expert: string;
  renderStyle: string;
  geometry: string;
};

export default function Home() {
  return (
    <ConfigProvider
      direction="rtl"
      locale={faIR}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#12499f",
          colorInfo: "#12499f",
          borderRadius: 6,
          fontFamily: "IRANSans, Arial, Helvetica, sans-serif",
        },
        components: {
          Button: { controlHeight: 42, fontWeight: 700 },
          Card: { borderRadiusLG: 6 },
          Input: { controlHeight: 40 },
          Select: { controlHeight: 40 },
          Segmented: {
            itemSelectedBg: "#12499f",
            itemSelectedColor: "#ffffff",
          },
        },
      }}
    >
      <App>
        <RenderPanel />
      </App>
    </ConfigProvider>
  );
}

function RenderPanel() {
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [image, setImage] = useState<File | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [preview, setPreview] = useState("");
  const [model, setModel] = useState<Model>("fast");
  const [status, setStatus] = useState("آماده");
  const [requestId, setRequestId] = useState("");
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [rawResponse, setRawResponse] = useState<RenderResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageKind, setImageKind] = useState("3dmass");
  const [stylePreset, setStylePreset] = useState("none");
  const [fidelity, setFidelity] = useState(75);

  const canSubmit = useMemo(() => Boolean(image && !isSubmitting), [image, isSubmitting]);
  const heroImage = resultUrls[0] || preview;

  function handleUpload(nextFile: File) {
    setImage(nextFile);
    setFileList([
      {
        uid: nextFile.name,
        name: nextFile.name,
        status: "done",
        originFileObj: nextFile,
      },
    ]);
    setResultUrls([]);
    setRawResponse(null);
    setRequestId("");

    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(nextFile));
    return false;
  }

  function removeUpload() {
    setImage(null);
    setFileList([]);
    setResultUrls([]);
    setRawResponse(null);
    setRequestId("");
    if (preview) URL.revokeObjectURL(preview);
    setPreview("");
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
        message.success("خروجی آماده شد");
        return;
      }

      if (data.status === "failed" || data.status === "canceled") {
        throw new Error(data.error || data.message?.toString() || "پردازش متوقف شد");
      }

      delay = Math.min(delay + 1000, 7000);
    }

    setStatus("در حال پردازش؛ بعدا با همین Request ID وضعیت را چک کنید");
  }

  async function handleSubmit(values: FormValues) {
    if (!image || !values.prompt.trim()) {
      message.warning("عکس و پرامپت لازم است");
      return;
    }

    setIsSubmitting(true);
    setStatus("ارسال به mnml.ai");
    setResultUrls([]);
    setRawResponse(null);
    setRequestId("");

    try {
      const promptDetails = [
        values.prompt.trim(),
        `image type: ${imageKind}`,
        `style preset: ${stylePreset}`,
        `fidelity: ${fidelity}`,
      ].join("\n");
      const formData = new FormData();
      formData.append("action", "render");
      formData.append("model", model);
      formData.append("image", image);
      formData.append("prompt", promptDetails);
      formData.append("expert_name", values.expert);
      formData.append("render_style", values.renderStyle);
      formData.append("geometry", values.geometry);
      if (values.apiKey?.trim()) formData.append("api_key", values.apiKey.trim());

      const data = await callMnml(formData);
      setRawResponse(data);

      if (!data.id) {
        throw new Error("API شناسه‌ی درخواست برنگرداند");
      }

      setRequestId(data.id);
      setStatus(`در صف پردازش: ${data.id}`);
      await pollStatus(data.id, values.apiKey || "");
    } catch (error) {
      const text = error instanceof Error ? error.message : "خطای ناشناخته";
      setStatus(text);
      message.error(text);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="studio-shell" dir="rtl">
      <header className="studio-header">
        <div className="header-actions">
          <Button type="primary" size="small">شارژ اشتراک</Button>
          <Button size="small">تاریخچه</Button>
          <Button size="small" shape="circle">؟</Button>
        </div>
        <div className="brand-side">
          <img src="/punto-logo.svg" alt="Punto" className="header-logo" />
          <span className="brand-mark">P</span>
        </div>
      </header>

      <div className="breadcrumb-row">
        <span>هوش مصنوعی</span>
        <span>طراحی کانسپت</span>
        <span>طراحی نمای خارجی</span>
      </div>

      <section className="studio-layout">
        <aside className="settings-rail">
          <Form<FormValues>
            form={form}
            layout="vertical"
            requiredMark={false}
            initialValues={{
              expert: "exterior",
              renderStyle: "photoreal",
              geometry: "precise",
            }}
            onFinish={handleSubmit}
          >
            <Panel title="آپلود عکس">
              <Dragger
                accept="image/png,image/jpeg,image/webp"
                beforeUpload={handleUpload}
                fileList={fileList}
                maxCount={1}
                onRemove={removeUpload}
                className="compact-upload"
              >
                <Button type="primary" icon={<CloudUploadOutlined />}>آپلود عکس</Button>
                <p>یا با کشیدن و انداختن عکس</p>
              </Dragger>
            </Panel>

            <Panel title="نوع عکس" subtitle="بین مدل‌های زیر نوع عکس ورودی خود را انتخاب کنید.">
              <ChoiceGrid
                value={imageKind}
                onChange={setImageKind}
                items={[
                  { value: "photo", label: "photo", visual: "photo" },
                  { value: "sketch", label: "sketch", visual: "sketch" },
                  { value: "3dmass", label: "3dmass", visual: "mass" },
                ]}
              />
            </Panel>

            <Panel title="نوع رندر" subtitle="رویکرد رندرینگ بین دقت و خلاقیت.">
              <Segmented
                block
                value={form.getFieldValue("geometry") || "precise"}
                onChange={(value) => form.setFieldValue("geometry", value)}
                options={[
                  { label: "رندر خلاق", value: "creative" },
                  { label: "رندر دقیق", value: "precise" },
                ]}
              />
              <p className="panel-note">
                دقیق: برای ورودی‌های دقیق، مواد، رنگ‌ها و هندسه را حفظ می‌کند.
              </p>
            </Panel>

            <Panel title="اتونومی: دقیق" subtitle="رویکرد رندرینگ بین دقت و خلاقیت.">
              <div className="slider-row">
                <Slider min={0} max={100} value={fidelity} onChange={setFidelity} />
                <span>{fidelity}</span>
              </div>
              <div className="slider-labels">
                <span>دقیق</span>
                <span>متعادل</span>
                <span>انعطاف‌پذیر</span>
              </div>
            </Panel>

            <Panel title="پرامپت">
              <Form.Item
                name="prompt"
                rules={[{ required: true, message: "پرامپت را وارد کنید" }]}
              >
                <Input.TextArea
                  rows={6}
                  maxLength={2000}
                  placeholder="the style, materials, colors, lighting, camera angle, image quality and finish..."
                />
              </Form.Item>
            </Panel>

            <Panel title="استایل‌ها">
              <ChoiceGrid
                value={stylePreset}
                onChange={setStylePreset}
                items={[
                  { value: "artistic", label: "Artistic", visual: "image" },
                  { value: "realistic", label: "Realistic", visual: "image" },
                  { value: "none", label: "بدون استایل", visual: "none" },
                ]}
              />
              <Form.Item name="renderStyle" className="hidden-field">
                <Select options={styles.map((item) => ({ label: item, value: item }))} />
              </Form.Item>
            </Panel>

            <Panel title="سرعت رندر" subtitle="رویکرد رندرینگ بین سرعت و کیفیت.">
              <Segmented<Model>
                block
                value={model}
                onChange={setModel}
                options={[
                  { label: "بهترین خروجی", value: "ultra" },
                  { label: "سریع‌ترین خروجی", value: "fast" },
                ]}
              />
              <p className="panel-note">
                سریع‌تر برای تست، بهترین خروجی برای نتیجه نهایی.
              </p>
              <Button
                block
                type="primary"
                htmlType="submit"
                icon={<FileImageOutlined />}
                loading={isSubmitting}
                disabled={!canSubmit}
              >
                نیاز به شارژ اشتراک
              </Button>
            </Panel>

            <Panel title="تنظیمات API">
              <Form.Item label="API Key" name="apiKey">
                <Input.Password
                  dir="ltr"
                  prefix={<ApiOutlined />}
                  placeholder="اختیاری اگر MNML_API_KEY تنظیم شده"
                />
              </Form.Item>
              <Form.Item label="Expert" name="expert">
                <Select options={experts.map((item) => ({ label: item, value: item }))} />
              </Form.Item>
            </Panel>
          </Form>
        </aside>

        <section className="work-canvas">
          <div className="canvas-inner">
            {heroImage ? (
              <div className="hero-preview">
                <AntImage src={heroImage} alt="پیش‌نمایش یا خروجی" preview={Boolean(resultUrls[0])} />
              </div>
            ) : (
              <div className="empty-hero">
                <CloudUploadOutlined />
                <p>برای شروع یک تصویر آپلود کنید</p>
              </div>
            )}

            <Title level={2}>رندر نمای بیرونی با هوش مصنوعی</Title>
            <Paragraph>
              با آپلود یک عکس یا مدل، فضای داخلی یا بیرونی را سریع بازطراحی کن.
            </Paragraph>
            <ul className="instruction-list">
              <li>تصویر را از پنل سمت راست آپلود کن.</li>
              <li>نوع ورودی، سبک و میزان دقت را انتخاب کن.</li>
              <li>یک پرامپت کوتاه و دقیق بنویس.</li>
              <li>از نوار پایین پنل، رندر را شروع کن.</li>
            </ul>

            <div className="status-row">
              <Tag color={statusColor(status)}>{status}</Tag>
              {requestId ? <Text code dir="ltr">Request ID: {requestId}</Text> : null}
            </div>

            {resultUrls.length > 1 ? (
              <div className="result-strip">
                {resultUrls.slice(1).map((url) => (
                  <AntImage key={url} src={url} alt="خروجی تولید شده" />
                ))}
              </div>
            ) : null}

            {rawResponse ? (
              <Collapse
                className="raw-collapse"
                items={[
                  {
                    key: "raw",
                    label: (
                      <Space>
                        <CodeOutlined />
                        پاسخ خام API
                      </Space>
                    ),
                    children: (
                      <pre dir="ltr" className="raw-json">
                        {JSON.stringify(rawResponse, null, 2)}
                      </pre>
                    ),
                  },
                ]}
              />
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="settings-card" variant="outlined">
      <Flex justify="space-between" align="start" gap={12}>
        <div>
          <h3>{title}</h3>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </Flex>
      <Divider />
      {children}
    </Card>
  );
}

function ChoiceGrid({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (value: string) => void;
  items: Array<{ value: string; label: string; visual: string }>;
}) {
  return (
    <div className="choice-grid">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`choice-tile ${value === item.value ? "selected" : ""}`}
          onClick={() => onChange(item.value)}
        >
          <span className={`tile-visual ${item.visual}`} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
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

function statusColor(status: string) {
  if (status.includes("آماده")) return "success";
  if (status.includes("پردازش") || status.includes("صف") || status.includes("ارسال")) {
    return "processing";
  }
  if (status.includes("ناموفق") || status.includes("خطا")) return "error";
  return "default";
}
