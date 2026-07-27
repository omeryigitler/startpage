"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { defaultConfig, type StartpageConfig } from "./startpage-config";
import {
  findOpenTarget,
  googleSearchUrl,
  normalizeCommand,
  routeCommand,
  type CommandRoute,
} from "./command-router";

const STORAGE_KEY = "startpage-config-v1";

type AgentMessage = {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  approvalId?: string;
};

type PendingConfigAction = {
  title: string;
  description: string;
  nextConfig: StartpageConfig;
};

type LocalAction =
  | { kind: "module"; title: string }
  | { kind: "pending"; action: PendingConfigAction }
  | { kind: "error"; message: string }
  | null;

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type AgentPayload = Record<string, unknown> & {
  ok?: boolean;
  error?: string;
  code?: string;
  message?: string;
  status?: string;
  approvalId?: string;
  summary?: { summary?: string };
  draft?: {
    clientName?: string;
    totalPrice?: number;
    currency?: string;
    siteType?: string;
  };
  result?: { quoteNumber?: string };
};

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function cloneConfig(config: StartpageConfig): StartpageConfig {
  return JSON.parse(JSON.stringify(config)) as StartpageConfig;
}

function safeUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function openSafely(url: string) {
  const safe = safeUrl(url);
  if (!safe) return false;
  const opened = window.open(safe, "_blank", "noopener,noreferrer");
  if (opened) opened.opener = null;
  return Boolean(opened);
}

function setControlledInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  if (setter) setter.call(input, value);
  else input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function formatAgentPayload(payload: AgentPayload) {
  if (payload.message) return payload.message;
  if (payload.status === "waiting_approval") {
    const lines = [payload.summary?.summary || "Teklif taslağı hazırlandı."];
    if (payload.draft?.clientName) lines.push(`Müşteri: ${payload.draft.clientName}`);
    if (payload.draft?.totalPrice) {
      lines.push(`Teklif: ${new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: payload.draft.currency || "TRY",
        maximumFractionDigits: 0,
      }).format(payload.draft.totalPrice)}`);
    }
    lines.push("İşlemi aşağıdaki onay düğmelerinden tamamlayabilirsiniz.");
    return lines.join("\n");
  }
  if (payload.status === "approved") return `Onaylandı${payload.result?.quoteNumber ? `: ${payload.result.quoteNumber}` : "."}`;
  if (payload.status === "rejected") return "İşlem reddedildi.";
  return "Taurus Agent işlemi tamamladı.";
}

function findByTitle<T extends { title: string }>(items: T[], requested: string) {
  const needle = normalizeCommand(requested);
  return items.find((item) => normalizeCommand(item.title) === needle)
    || items.find((item) => normalizeCommand(item.title).includes(needle) || needle.includes(normalizeCommand(item.title)));
}

function parseLocalAction(text: string, config: StartpageConfig): LocalAction {
  const command = text.trim();
  const normalized = normalizeCommand(command);

  const moduleMatch = /^(.+?)\s+modul(?:unu|u|e)?\s+(?:ac|goster)$/i.exec(normalized);
  if (moduleMatch) return { kind: "module", title: moduleMatch[1].trim() };

  const greetingMatch = /(?:karsilama|selamlama|greeting)(?:\s+mesajini)?\s*(?:su\s*)?[:=-]?\s*(.+?)\s+(?:yap|olarak\s+degistir|degistir|guncelle)$/i.exec(normalized);
  if (greetingMatch) {
    const nextConfig = cloneConfig(config);
    const originalValue = command.match(/(?:karşılama|karsilama|selamlama|greeting)(?:\s+mesajını|\s+mesajini)?\s*(?:şu|su)?\s*[:=-]?\s*(.+?)\s+(?:yap|olarak\s+değiştir|olarak\s+degistir|değiştir|degistir|güncelle|guncelle)$/i)?.[1]
      || greetingMatch[1];
    nextConfig.greeting = originalValue.trim();
    return {
      kind: "pending",
      action: {
        title: "Karşılama mesajını değiştir",
        description: `Yeni mesaj: ${nextConfig.greeting}`,
        nextConfig,
      },
    };
  }

  const addLinkMatch = /^(.+?)\s+klasor(?:une|una|ine|ina|e|a)\s+(.+?)\s+(?:baglantisini\s+|linkini\s+)?ekle\s+(https?:\/\/\S+)$/i.exec(normalized);
  if (addLinkMatch) {
    const folder = findByTitle(config.folders, addLinkMatch[1]);
    const url = safeUrl(addLinkMatch[3]);
    if (!folder) return { kind: "error", message: `“${addLinkMatch[1]}” klasörü bulunamadı.` };
    if (!url) return { kind: "error", message: "Yalnızca güvenli http/https bağlantıları eklenebilir." };
    const nextConfig = cloneConfig(config);
    const target = findByTitle(nextConfig.folders, folder.title);
    target?.links.push({ name: addLinkMatch[2].trim(), url, note: "Taurus Agent ile eklendi" });
    return {
      kind: "pending",
      action: {
        title: `${folder.title} klasörüne bağlantı ekle`,
        description: `${addLinkMatch[2].trim()} → ${url}`,
        nextConfig,
      },
    };
  }

  const updateLinkMatch = /^(.+?)\s+(?:baglantisini|linkini)\s+(https?:\/\/\S+)\s+(?:olarak\s+)?(?:degistir|guncelle)$/i.exec(normalized);
  if (updateLinkMatch) {
    const url = safeUrl(updateLinkMatch[2]);
    const nextConfig = cloneConfig(config);
    const link = nextConfig.folders.flatMap((folder) => folder.links).find((item) => {
      const name = normalizeCommand(item.name);
      const requested = normalizeCommand(updateLinkMatch[1]);
      return name === requested || name.includes(requested) || requested.includes(name);
    });
    if (!link) return { kind: "error", message: `“${updateLinkMatch[1]}” bağlantısı bulunamadı.` };
    if (!url) return { kind: "error", message: "Yalnızca güvenli http/https bağlantıları kullanılabilir." };
    link.url = url;
    return {
      kind: "pending",
      action: {
        title: `${link.name} bağlantısını güncelle`,
        description: `Yeni adres: ${url}`,
        nextConfig,
      },
    };
  }

  const addProjectMatch = /^(?:projelere|proje\s+listesine)\s+(.+?)\s+ekle\s+(https?:\/\/\S+)$/i.exec(normalized);
  if (addProjectMatch) {
    const url = safeUrl(addProjectMatch[2]);
    if (!url) return { kind: "error", message: "Proje adresi geçerli bir http/https URL olmalıdır." };
    const nextConfig = cloneConfig(config);
    nextConfig.projects.push({ name: addProjectMatch[1].trim(), url, status: "Aktif" });
    return {
      kind: "pending",
      action: {
        title: "Yeni proje ekle",
        description: `${addProjectMatch[1].trim()} → ${url}`,
        nextConfig,
      },
    };
  }

  const projectStatusMatch = /^(.+?)\s+projesini\s+(.+?)\s+(?:yap|olarak\s+guncelle)$/i.exec(normalized);
  if (projectStatusMatch) {
    const nextConfig = cloneConfig(config);
    const requested = normalizeCommand(projectStatusMatch[1]);
    const project = nextConfig.projects.find((item) => {
      const name = normalizeCommand(item.name);
      return name === requested || name.includes(requested) || requested.includes(name);
    });
    if (!project) return { kind: "error", message: `“${projectStatusMatch[1]}” projesi bulunamadı.` };
    project.status = projectStatusMatch[2].trim();
    return {
      kind: "pending",
      action: {
        title: `${project.name} durumunu değiştir`,
        description: `Yeni durum: ${project.status}`,
        nextConfig,
      },
    };
  }

  return null;
}

export default function TaurusCommandBridge() {
  const [portal, setPortal] = useState<HTMLElement | null>(null);
  const [config, setConfig] = useState<StartpageConfig>(defaultConfig);
  const [canEdit, setCanEdit] = useState(false);
  const [route, setRoute] = useState<CommandRoute>({ kind: "idle", label: "⌘ K /" });
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [pending, setPending] = useState<PendingConfigAction | null>(null);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const configRef = useRef(config);
  const canEditRef = useRef(canEdit);
  const busyRef = useRef(busy);

  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { canEditRef.current = canEdit; }, [canEdit]);
  useEffect(() => { busyRef.current = busy; }, [busy]);

  const addMessage = useCallback((role: AgentMessage["role"], text: string, approvalId?: string) => {
    setMessages((current) => [...current.slice(-7), { id: id(), role, text, approvalId }]);
  }, []);

  const updateVisualMode = useCallback((value: string) => {
    const nextRoute = routeCommand(value, configRef.current);
    setRoute(nextRoute);
    const form = formRef.current;
    const expansion = form?.closest<HTMLElement>(".searchExpansion");
    if (form) {
      form.dataset.commandMode = nextRoute.kind;
      form.dataset.commandLabel = nextRoute.label;
    }
    expansion?.classList.toggle("taurus-agent-query", nextRoute.kind === "agent");
  }, []);

  const openModule = useCallback((title: string) => {
    const requested = normalizeCommand(title);
    const folderIndex = configRef.current.folders.findIndex((folder) => {
      const name = normalizeCommand(folder.title);
      return name === requested || name.includes(requested) || requested.includes(name);
    });
    const special = [
      { names: ["projeler", "projects"], index: configRef.current.folders.length },
      { names: ["gunluk", "daily"], index: configRef.current.folders.length + 1 },
      { names: ["sistem", "system"], index: configRef.current.folders.length + 2 },
    ].find((item) => item.names.some((name) => requested.includes(name)));
    const index = folderIndex >= 0 ? folderIndex : special?.index;
    if (index === undefined || index < 0) return false;

    const main = document.querySelector<HTMLElement>(".taurusStartpage");
    if (!main?.classList.contains("is-launched")) {
      document.querySelector<HTMLButtonElement>(".centerLogoButton")?.click();
    }
    window.setTimeout(() => {
      const dots = document.querySelectorAll<HTMLButtonElement>(".folderDots button");
      dots[index]?.click();
      window.setTimeout(() => document.querySelector<HTMLButtonElement>(".centerFolderCover")?.click(), 780);
    }, main?.classList.contains("is-launched") ? 50 : 720);
    return true;
  }, []);

  const decideApproval = useCallback(async (approvalId: string, decision: "approve" | "reject") => {
    if (busyRef.current) return;
    setBusy(true);
    try {
      const response = await fetch("/api/agent?action=approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, decision }),
      });
      const payload = (await response.json()) as AgentPayload;
      if (!response.ok || payload.ok === false) throw new Error(payload.error || "Onay işlemi başarısız.");
      addMessage("agent", formatAgentPayload(payload));
    } catch (error) {
      addMessage("system", error instanceof Error ? error.message : "Onay işlemi başarısız.");
    } finally {
      setBusy(false);
    }
  }, [addMessage]);

  const runAgent = useCallback(async (text: string) => {
    const directTarget = findOpenTarget(text, configRef.current);
    if (directTarget && /\b(aç|ac|open|git|göster|goster)\b/i.test(normalizeCommand(text))) {
      if (openSafely(directTarget.url)) addMessage("agent", `${directTarget.name} yeni sekmede açıldı.`);
      else addMessage("system", "Tarayıcı yeni sekmeyi engelledi. Açılır pencere iznini kontrol edin.");
      return;
    }

    const localAction = parseLocalAction(text, configRef.current);
    if (localAction?.kind === "module") {
      addMessage("agent", openModule(localAction.title)
        ? `${localAction.title} modülü açıldı.`
        : `“${localAction.title}” modülü bulunamadı.`);
      return;
    }
    if (localAction?.kind === "error") {
      addMessage("system", localAction.message);
      return;
    }
    if (localAction?.kind === "pending") {
      if (!canEditRef.current) {
        setNeedsLogin(true);
        addMessage("system", "Startpage yapılandırmasını değiştirmek için yönetici girişi gereklidir.");
        return;
      }
      setPending(localAction.action);
      addMessage("agent", `Değişiklik ön izlemesi hazır: ${localAction.action.description}`);
      return;
    }

    setBusy(true);
    setNeedsLogin(false);
    try {
      const response = await fetch("/api/agent?action=command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const payload = (await response.json()) as AgentPayload;
      if (response.status === 401) setNeedsLogin(true);
      if (!response.ok || payload.ok === false) throw new Error(payload.error || "Taurus Agent isteği başarısız.");
      addMessage("agent", formatAgentPayload(payload), payload.status === "waiting_approval" ? payload.approvalId : undefined);
    } catch (error) {
      addMessage("system", error instanceof Error ? error.message : "Taurus Agent isteği başarısız.");
    } finally {
      setBusy(false);
    }
  }, [addMessage, openModule]);

  const execute = useCallback(async (value?: string) => {
    if (busyRef.current) return;
    const input = inputRef.current;
    const raw = String(value ?? input?.value ?? "").trim();
    if (!raw) {
      input?.focus();
      return;
    }
    const nextRoute = routeCommand(raw, configRef.current);
    setRoute(nextRoute);

    if (nextRoute.kind === "agent") {
      if (!nextRoute.text) {
        addMessage("system", "@ işaretinden sonra bir Taurus Agent komutu yazın.");
        return;
      }
      addMessage("user", nextRoute.text);
      if (input) setControlledInput(input, "");
      updateVisualMode("");
      await runAgent(nextRoute.text);
      return;
    }

    if (nextRoute.kind === "open") {
      if (!openSafely(nextRoute.url)) addMessage("system", "Tarayıcı yeni sekmeyi engelledi. Açılır pencere iznini kontrol edin.");
      return;
    }

    if (nextRoute.kind === "google" && nextRoute.query) {
      if (!openSafely(googleSearchUrl(nextRoute.query))) addMessage("system", "Tarayıcı Google arama sekmesini engelledi.");
    }
  }, [addMessage, runAgent, updateVisualMode]);

  const startVoice = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      addMessage("system", "Bu tarayıcı sesli komutu desteklemiyor. Chrome veya Edge kullanın.");
      return;
    }

    const recognition = new Constructor();
    recognition.lang = "tr-TR";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    setListening(true);
    document.querySelector(".centerLogoButton")?.classList.add("taurus-listening");
    let finalText = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      const spoken = (finalText || interim).trim();
      if (spoken && inputRef.current) {
        setControlledInput(inputRef.current, `@ ${spoken}`);
        updateVisualMode(`@ ${spoken}`);
      }
    };
    recognition.onerror = (event) => {
      const messagesByCode: Record<string, string> = {
        "not-allowed": "Mikrofon izni engellendi. Adres çubuğundan mikrofon iznini açıp tekrar deneyin.",
        "audio-capture": "Mikrofon bulunamadı veya başka bir uygulama tarafından kullanılıyor.",
        "no-speech": "Ses algılanamadı. Logoya tekrar basıp konuşun.",
        network: "Ses tanıma servisine ulaşılamadı.",
      };
      addMessage("system", messagesByCode[event.error || ""] || `Sesli komut hatası: ${event.error || "bilinmiyor"}`);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      document.querySelector(".centerLogoButton")?.classList.remove("taurus-listening");
      const spoken = finalText.trim();
      if (spoken) void execute(`@ ${spoken}`);
    };

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      document.querySelector(".centerLogoButton")?.classList.remove("taurus-listening");
      addMessage("system", "Sesli komut başlatılamadı.");
    }
  }, [addMessage, execute, updateVisualMode]);

  const savePending = useCallback(async () => {
    if (!pending || busyRef.current) return;
    setBusy(true);
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: pending.nextConfig }),
      });
      const payload = await response.json() as { error?: string; config?: StartpageConfig };
      if (!response.ok) throw new Error(payload.error || "Startpage değişikliği kaydedilemedi.");
      const saved = payload.config || pending.nextConfig;
      setConfig(saved);
      configRef.current = saved;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      addMessage("agent", `${pending.title} tamamlandı. Startpage yenileniyor.`);
      setPending(null);
      window.setTimeout(() => window.location.reload(), 850);
    } catch (error) {
      addMessage("system", error instanceof Error ? error.message : "Startpage değişikliği kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }, [addMessage, pending]);

  useEffect(() => {
    let cancelled = false;
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = { ...defaultConfig, ...JSON.parse(cached) } as StartpageConfig;
        setConfig(parsed);
        configRef.current = parsed;
      } catch {}
    }
    fetch("/api/state", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { config?: StartpageConfig; canEdit?: boolean; hasStoredState?: boolean }) => {
        if (cancelled) return;
        setCanEdit(Boolean(data.canEdit));
        if (data.hasStoredState && data.config) {
          setConfig(data.config);
          configRef.current = data.config;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let observer: MutationObserver | null = null;
    const bind = () => {
      const form = document.querySelector<HTMLFormElement>(".centerSearchForm");
      const input = form?.querySelector<HTMLInputElement>("input") || null;
      const expansion = form?.closest<HTMLElement>(".searchExpansion") || null;
      if (!form || !input || !expansion) return false;
      formRef.current = form;
      inputRef.current = input;
      form.dataset.commandBridge = "1";
      setPortal(expansion);
      updateVisualMode(input.value);
      return true;
    };
    if (!bind()) {
      observer = new MutationObserver(() => {
        if (bind()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
    return () => observer?.disconnect();
  }, [updateVisualMode]);

  useEffect(() => {
    const onInput = (event: Event) => {
      if (event.target === inputRef.current) updateVisualMode(inputRef.current?.value || "");
    };
    const onSubmit = (event: SubmitEvent) => {
      if (event.target !== formRef.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void execute();
    };
    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const formButton = element?.closest<HTMLButtonElement>(".centerSearchForm > button:last-child");
      if (formButton && formRef.current?.contains(formButton)) {
        const value = inputRef.current?.value.trim() || "";
        if (value) {
          event.preventDefault();
          event.stopImmediatePropagation();
          void execute(value);
        }
        return;
      }

      const resultLink = element?.closest<HTMLAnchorElement>(".centerSearchResults a[href]");
      if (resultLink) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openSafely(resultLink.href);
        return;
      }

      const logo = element?.closest<HTMLButtonElement>(".centerLogoButton");
      if (logo && document.querySelector(".taurusStartpage")?.classList.contains("is-launched")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        startVoice();
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (recognitionRef.current) recognitionRef.current.abort();
      if (messages.length || pending) {
        setMessages([]);
        setPending(null);
        setNeedsLogin(false);
      }
    };

    document.addEventListener("input", onInput, true);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onEscape, true);
    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onEscape, true);
    };
  }, [execute, messages.length, pending, startVoice, updateVisualMode]);

  useEffect(() => {
    const expansion = formRef.current?.closest<HTMLElement>(".searchExpansion");
    expansion?.classList.toggle("taurus-command-open", Boolean(messages.length || pending || busy));
  }, [messages.length, pending, busy]);

  if (!portal || (!messages.length && !pending && !busy && !listening)) return null;

  return createPortal(
    <section className="taurusCommandPanel" aria-live="polite">
      <header>
        <div>
          <span className={listening ? "is-live" : ""} />
          <strong>TAURUS AGENT</strong>
          <small>{busy ? "İŞLENİYOR" : listening ? "DİNLİYOR" : route.kind.toUpperCase()}</small>
        </div>
        <button type="button" onClick={() => { setMessages([]); setPending(null); setNeedsLogin(false); }} aria-label="Agent sonucunu kapat">×</button>
      </header>
      <div className="taurusCommandLog">
        {messages.map((message) => (
          <article className={`taurusCommandMessage ${message.role}`} key={message.id}>
            <small>{message.role === "user" ? "YOU" : message.role === "agent" ? "TAURUS" : "SYSTEM"}</small>
            <p>{message.text}</p>
            {message.approvalId && (
              <div className="taurusCommandActions">
                <button type="button" disabled={busy} onClick={() => void decideApproval(message.approvalId!, "approve")}>ONAYLA</button>
                <button type="button" disabled={busy} className="secondary" onClick={() => void decideApproval(message.approvalId!, "reject")}>REDDET</button>
              </div>
            )}
          </article>
        ))}
        {busy && <div className="taurusCommandThinking">● ● ●</div>}
      </div>
      {pending && (
        <article className="taurusConfigPreview">
          <small>STARTPAGE V2 / DEĞİŞİKLİK ÖN İZLEMESİ</small>
          <strong>{pending.title}</strong>
          <p>{pending.description}</p>
          <div className="taurusCommandActions">
            <button type="button" disabled={busy} onClick={() => void savePending()}>UYGULA</button>
            <button type="button" disabled={busy} className="secondary" onClick={() => setPending(null)}>İPTAL</button>
          </div>
        </article>
      )}
      {needsLogin && <a className="taurusAgentLogin" href="/giris">GOOGLE YÖNETİCİ GİRİŞİNİ AÇ ↗</a>}
      <footer><span>@ AGENT</span><span>? WEB</span><span>LOGO = SES</span></footer>
    </section>,
    portal,
  );
}
