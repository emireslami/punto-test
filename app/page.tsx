"use client";

import {
  ApiOutlined,
  CloudUploadOutlined,
  CodeOutlined,
  FileImageOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Card,
  Collapse,
  ConfigProvider,
  Divider,
  Empty,
  Flex,
  Form,
  Image as AntImage,
  Input,
  Row,
  Segmented,
  Select,
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
          borderRadius: 8,
          fontFamily: "IRANSans, Arial, Helvetica, sans-serif",
        },
        components: {
          Button: {
            controlHeight: 44,
            fontWeight: 700,
          },
          Card: {
            borderRadiusLG: 8,
          },
          Input: {
            controlHeight: 42,
          },
          Select: {
            controlHeight: 42,
          },
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

  const canSubmit = useMemo(() => Boolean(image && !isSubmitting), [image, isSubmitting]);

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
      const formData = new FormData();
      formData.append("action", "render");
      formData.append("model", model);
      formData.append("image", image);
      formData.append("prompt", values.prompt.trim());
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
    <main className="app-shell" dir="rtl">
      <section className="app-grid">
        <Card className="intro-card" variant="outlined">
          <Flex vertical justify="space-between" className="intro-card-inner">
            <div>
              <div className="brand-lockup">
                <img src="/punto-logo.svg" alt="Punto" className="punto-logo" />
                <Tag color="blue" icon={<ThunderboltOutlined />}>
                  mnml.ai render panel
                </Tag>
              </div>
              <Title level={1}>خروجی سریع از v4.4 Fast و Ultra</Title>
              <Paragraph>
                عکس معماری یا محصول را بدهید، پرامپت را بنویسید و مدل را انتخاب کنید.
                نتیجه بعد از پردازش در همین صفحه نمایش داده می‌شود.
              </Paragraph>
            </div>

            <Space direction="vertical" size={12} className="model-notes">
              <Alert
                type="info"
                showIcon
                message="Fast"
                description="سریع‌تر، خروجی 1K، یک اعتبار برای هر تولید."
              />
              <Alert
                type="warning"
                showIcon
                message="Ultra"
                description="کیفیت بالاتر، خروجی 2K، سه اعتبار برای هر تولید."
              />
            </Space>
          </Flex>
        </Card>

        <Space direction="vertical" size={16} className="panel-stack">
          <Card title="تنظیمات تولید" variant="outlined" className="form-card">
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
              <Form.Item label="عکس ورودی" required>
                <Dragger
                  accept="image/png,image/jpeg,image/webp"
                  beforeUpload={handleUpload}
                  fileList={fileList}
                  maxCount={1}
                  onRemove={removeUpload}
                  className="upload-box"
                >
                  <p className="ant-upload-drag-icon">
                    <CloudUploadOutlined />
                  </p>
                  <p className="ant-upload-text">عکس را انتخاب یا اینجا رها کنید</p>
                  <p className="ant-upload-hint">PNG، JPG یا WebP</p>
                </Dragger>
              </Form.Item>

              {preview ? (
                <div className="preview-frame">
                  <AntImage src={preview} alt="پیش‌نمایش عکس ورودی" preview={false} />
                </div>
              ) : null}

              <Form.Item
                label="پرامپت"
                name="prompt"
                rules={[{ required: true, message: "پرامپت را وارد کنید" }]}
              >
                <Input.TextArea
                  rows={4}
                  maxLength={2000}
                  showCount
                  placeholder="مثلا: نمای مدرن با شیشه، نور golden hour و فضای سبز طبیعی"
                />
              </Form.Item>

              <Row gutter={[16, 0]}>
                <Form.Item label="API Key" name="apiKey" className="responsive-field">
                  <Input.Password
                    dir="ltr"
                    prefix={<ApiOutlined />}
                    placeholder="اختیاری اگر MNML_API_KEY تنظیم شده"
                  />
                </Form.Item>

                <Form.Item
                  label="Expert"
                  name="expert"
                  className="responsive-field"
                  rules={[{ required: true }]}
                >
                  <Select options={experts.map((item) => ({ label: item, value: item }))} />
                </Form.Item>

                <Form.Item
                  label="Render style"
                  name="renderStyle"
                  className="responsive-field"
                  rules={[{ required: true }]}
                >
                  <Select options={styles.map((item) => ({ label: item, value: item }))} />
                </Form.Item>

                <Form.Item
                  label="Geometry"
                  name="geometry"
                  className="responsive-field"
                  rules={[{ required: true }]}
                >
                  <Select
                    options={[
                      { label: "precise", value: "precise" },
                      { label: "creative", value: "creative" },
                    ]}
                  />
                </Form.Item>
              </Row>

              <Divider />

              <Flex wrap gap={12} align="center" justify="space-between">
                <Segmented<Model>
                  value={model}
                  onChange={setModel}
                  options={[
                    { label: "v4.4 Fast", value: "fast" },
                    { label: "v4.4 Ultra", value: "ultra" },
                  ]}
                />

                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<FileImageOutlined />}
                  loading={isSubmitting}
                  disabled={!canSubmit}
                >
                  گرفتن خروجی
                </Button>
              </Flex>
            </Form>
          </Card>

          <Card
            title="نتیجه"
            variant="outlined"
            extra={<Tag color={statusColor(status)}>{status}</Tag>}
          >
            {requestId ? (
              <Text code dir="ltr" className="request-id">
                Request ID: {requestId}
              </Text>
            ) : null}

            {resultUrls.length ? (
              <div className="result-grid">
                {resultUrls.map((url) => (
                  <AntImage
                    key={url}
                    src={url}
                    alt="خروجی تولید شده"
                    className="result-image"
                  />
                ))}
              </div>
            ) : (
              <Empty
                className="empty-result"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="خروجی بعد از تکمیل پردازش اینجا دیده می‌شود"
              />
            )}

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
          </Card>
        </Space>
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

function statusColor(status: string) {
  if (status.includes("آماده")) return "success";
  if (status.includes("پردازش") || status.includes("صف") || status.includes("ارسال")) {
    return "processing";
  }
  if (status.includes("ناموفق") || status.includes("خطا")) return "error";
  return "default";
}
