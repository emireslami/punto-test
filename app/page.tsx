"use client";

import {
  ApiOutlined,
  CloudUploadOutlined,
  CodeOutlined,
  DownOutlined,
  FileImageOutlined,
  FolderOutlined,
  LeftOutlined,
  LogoutOutlined,
  ReadOutlined,
  SettingOutlined,
  ShopOutlined,
  StarOutlined,
  ThunderboltOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  App,
  Avatar,
  Button,
  Card,
  Collapse,
  ConfigProvider,
  Divider,
  Dropdown,
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
import type { ReactNode } from "react";
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

type PageKey = "profile" | "projects" | "business" | "jobs" | "ai" | "settings";
type AiToolKey = "exterior";

const aiTools = [
  {
    key: "exterior",
    title: "رندر خارجی",
    badge: "MNMLAI Exterior",
    category: "رندرینگ",
    credits: "۱۰",
    ready: true,
    image:
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80",
  },
  {
    key: "sketch",
    title: "تبدیل اسکیس به رندر",
    badge: "MNMLAI Sketch",
    category: "رندرینگ",
    credits: "۱۰",
    ready: false,
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
  },
  {
    key: "interior",
    title: "مبلمان فضای داخلی",
    badge: "MNMLAI Virtual",
    category: "طراحی داخلی",
    credits: "۱۰",
    ready: false,
    image:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80",
  },
  {
    key: "enhancer",
    title: "افزایش کیفیت رندر",
    badge: "MNMLAI Enhancer",
    category: "ارائه و تولید مدارک",
    credits: "۱۰",
    ready: false,
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80",
  },
  {
    key: "video",
    title: "ویدئو معماری",
    badge: "MNMLAI Motion",
    category: "ارائه و تولید مدارک",
    credits: "۱۰۰",
    ready: false,
    image:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
  },
  {
    key: "kitchen",
    title: "طراحی آشپزخانه",
    badge: "MNMLAI Interior",
    category: "طراحی داخلی",
    credits: "۱۰",
    ready: false,
    image:
      "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=900&q=80",
  },
] as const;

const aiCategories = ["همه", "طراحی کانسپت", "رندرینگ", "طراحی داخلی", "ارائه و تولید مدارک"];

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
          fontFamily: "Anjoman, Arial, Helvetica, sans-serif",
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
  const { message, modal } = App.useApp();
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
  const [activePage, setActivePage] = useState<PageKey>("ai");
  const [activeAiTool, setActiveAiTool] = useState<AiToolKey | null>(null);

  const canSubmit = useMemo(() => Boolean(image && !isSubmitting), [image, isSubmitting]);
  const heroImage = resultUrls[0] || preview;
  const pageLabels: Record<PageKey, string> = {
    profile: "پروفایل",
    projects: "پروژه‌ها",
    business: "کسب‌وکار",
    jobs: "آگهی‌های استخدام",
    ai: "هوش مصنوعی",
    settings: "تنظیمات",
  };
  const navItems: Array<{ key: PageKey; label: string; icon: ReactNode }> = [
    { key: "profile", label: "پروفایل", icon: <UserOutlined /> },
    { key: "projects", label: "پروژه‌ها", icon: <FolderOutlined /> },
    { key: "business", label: "کسب‌وکار", icon: <ShopOutlined /> },
    { key: "jobs", label: "آگهی‌های استخدام", icon: <ReadOutlined /> },
    { key: "ai", label: "هوش مصنوعی", icon: <StarOutlined /> },
  ];
  const activeNavItem = navItems.find((item) => item.key === activePage) || {
    key: activePage,
    label: pageLabels[activePage],
    icon: null,
  };
  const isAiToolOpen = activePage === "ai" && activeAiTool === "exterior";
  const breadcrumbItems = isAiToolOpen
    ? [
        { key: "ai", label: "هوش مصنوعی", onClick: () => setActiveAiTool(null) },
        { key: "tools", label: "خانه ابزارها", onClick: () => setActiveAiTool(null) },
        { key: "rendering", label: "رندرینگ", onClick: () => setActiveAiTool(null) },
        { key: "exterior", label: "رندر خارجی", onClick: () => setActiveAiTool("exterior") },
      ]
    : activePage === "ai"
      ? [
          { key: "ai", label: "هوش مصنوعی", onClick: () => setActiveAiTool(null) },
          { key: "tools", label: "خانه ابزارها", onClick: () => setActiveAiTool(null) },
        ]
      : [
          { key: activePage, label: activeNavItem.label, onClick: () => setActivePage(activePage) },
          { key: "soon", label: "هنوز آماده نیست", onClick: () => setActivePage(activePage) },
        ];

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

  function openUtilityPage(page: "profile" | "settings") {
    setActivePage(page);
    setActiveAiTool(null);
  }

  function confirmLogout() {
    modal.confirm({
      title: "خروج از حساب؟",
      content: "برای خروج از پنل پونتو تایید کن. این بخش فعلاً فقط نمایشی است.",
      okText: "خروج",
      cancelText: "انصراف",
      centered: true,
      onOk: () => {
        message.info("خروج فعلاً فعال نیست");
      },
    });
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
      <section className="app-frame">
        <aside className="side-menu" aria-label="منوی اصلی">
          <div className="side-menu-logo">
            <img src="/punto-logo.svg" alt="Punto" />
          </div>
          <nav className="side-menu-nav">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={activePage === item.key ? "active" : ""}
                onClick={() => {
                  setActivePage(item.key);
                  if (item.key === "ai") setActiveAiTool(null);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="main-area">
          <header className="studio-header">
            <div className="header-actions">
              <Dropdown
                trigger={["click"]}
                placement="bottomLeft"
                menu={{
                  items: [
                    { key: "profile", label: "پروفایل", icon: <UserOutlined /> },
                    { key: "settings", label: "تنظیمات", icon: <SettingOutlined /> },
                    { type: "divider" },
                    { key: "logout", label: "خروج", icon: <LogoutOutlined /> },
                  ],
                  onClick: ({ key }) => {
                    if (key === "profile") openUtilityPage("profile");
                    if (key === "settings") openUtilityPage("settings");
                    if (key === "logout") confirmLogout();
                  },
                }}
              >
                <Button className="profile-trigger" type="text" aria-label="منوی پروفایل">
                  <Avatar size={30} icon={<UserOutlined />} />
                  <span className="profile-name">امیر اسلامی</span>
                  <DownOutlined />
                </Button>
              </Dropdown>
            </div>
          </header>

          <div className="breadcrumb-row">
            {breadcrumbItems.map((item, index) => (
              <span className="breadcrumb-item" key={item.key}>
                <button type="button" onClick={item.onClick}>
                  {item.label}
                </button>
                {index < breadcrumbItems.length - 1 ? <LeftOutlined aria-hidden /> : null}
              </span>
            ))}
          </div>

          {activePage === "ai" && !activeAiTool ? (
            <AiHomePage onOpenExterior={() => setActiveAiTool("exterior")} />
          ) : isAiToolOpen ? (
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

            <Panel title="ثبت درخواست">
              <Button
                block
                type="primary"
                htmlType="submit"
                icon={<FileImageOutlined />}
                loading={isSubmitting}
                disabled={!canSubmit}
              >
                ثبت
              </Button>
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
                <div className="empty-stage" aria-hidden="true">
                  <span className="stage-line stage-line-top" />
                  <span className="stage-card stage-card-input">
                    <span />
                    <span />
                  </span>
                  <span className="stage-core">
                    <CloudUploadOutlined />
                  </span>
                  <span className="stage-card stage-card-output">
                    <span />
                    <span />
                  </span>
                  <span className="stage-line stage-line-bottom" />
                </div>
                <h3>تصویر اول را بفرست، رندر آماده می‌شود</h3>
                <p>عکس، اسکیس یا مدل حجمی را از پنل سمت راست آپلود کن.</p>
                <div className="empty-chips">
                  <span>photo</span>
                  <span>sketch</span>
                  <span>3dmass</span>
                </div>
              </div>
            )}

            <div className="canvas-copy">
              <span className="canvas-eyebrow">استودیو رندر معماری</span>
              <Title level={2}>از تصویر خام تا خروجی قابل ارائه</Title>
              <Paragraph>
                یک عکس، اسکیس یا مدل حجمی را وارد کن و با کنترل سبک، دقت و پرامپت،
                نسخه‌ی تازه‌ای از فضا بساز.
              </Paragraph>
            </div>

            <div className="workflow-steps" aria-label="مراحل ساخت رندر">
              <div className="workflow-step">
                <span>۱</span>
                <strong>ورودی را آماده کن</strong>
                <p>تصویر، اسکیس یا مدل را از پنل سمت راست آپلود کن.</p>
              </div>
              <div className="workflow-step">
                <span>۲</span>
                <strong>جهت رندر را مشخص کن</strong>
                <p>نوع ورودی، سبک، سرعت و میزان پایبندی به تصویر را انتخاب کن.</p>
              </div>
              <div className="workflow-step">
                <span>۳</span>
                <strong>رندر را ثبت کن</strong>
                <p>پرامپت کوتاه بنویس و از آخرین بخش پنل درخواست را بفرست.</p>
              </div>
            </div>

            <div className="status-row">
              <Tag color={statusColor(status)}>{status}</Tag>
              {requestId ? <Text code dir="ltr">Request ID: {requestId}</Text> : null}
            </div>

            <div className="canvas-bottom-dock" aria-label="وضعیت و راهنمای خروجی">
              <div>
                <span>قدم بعدی</span>
                <strong>{heroImage ? "تنظیمات را دقیق کن و ثبت بزن" : "تصویر را از پنل سمت راست آپلود کن"}</strong>
              </div>
              <div>
                <span>خروجی</span>
                <strong>{resultUrls.length ? `${resultUrls.length} تصویر آماده` : "پس از ثبت اینجا نمایش داده می‌شود"}</strong>
              </div>
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
          ) : (
            <NotReadyPage title={activeNavItem.label} />
          )}
        </div>
      </section>
    </main>
  );
}

function AiHomePage({ onOpenExterior }: { onOpenExterior: () => void }) {
  return (
    <section className="ai-home">
      <div className="ai-home-header">
        <div>
          <span className="canvas-eyebrow">کتابخانه ابزارهای هوش مصنوعی</span>
          <Title level={1}>با یک ابزار شروع کن</Title>
          <Paragraph>
            ابزارهای معماری Punto برای رندرینگ، طراحی داخلی و آماده‌سازی ارائه اینجا
            جمع شده‌اند. فعلاً ابزار رندر خارجی آماده استفاده است.
          </Paragraph>
        </div>
      </div>

      <div className="ai-category-tabs" aria-label="دسته‌بندی ابزارهای هوش مصنوعی">
        {aiCategories.map((category) => (
          <button key={category} type="button" className={category === "همه" ? "active" : ""}>
            {category}
          </button>
        ))}
      </div>

      <div className="ai-tool-grid">
        {aiTools.map((tool) => (
          <button
            key={tool.key}
            type="button"
            className={`ai-tool-card ${tool.ready ? "ready" : "disabled"}`}
            onClick={tool.ready ? onOpenExterior : undefined}
            aria-disabled={!tool.ready}
          >
            <span className="tool-image" style={{ backgroundImage: `url(${tool.image})` }}>
              <span className="credit-pill">
                {tool.credits}
                <ThunderboltOutlined />
              </span>
            </span>
            <span className="tool-meta">
              <span>
                <Tag color="blue">{tool.badge}</Tag>
                <strong>{tool.title}</strong>
              </span>
              <small>{tool.ready ? "آماده استفاده" : "به‌زودی"}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function NotReadyPage({ title }: { title: string }) {
  return (
    <section className="not-ready-canvas">
      <div className="not-ready-panel">
        <Tag color="processing">در حال آماده‌سازی</Tag>
        <Title level={2}>{title}</Title>
        <Paragraph>
          این بخش هنوز برای استفاده عمومی آماده نشده است. صفحه‌ی هوش مصنوعی فعال است و
          می‌توانی از منوی راست دوباره وارد آن شوی.
        </Paragraph>
        <div className="not-ready-grid" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </section>
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
