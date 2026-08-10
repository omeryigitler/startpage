"use client";

import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label: string;
  disabled: boolean;
};

type SelectMenu = {
  select: HTMLSelectElement;
  trigger: HTMLButtonElement;
  options: SelectOption[];
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

type DialogState = {
  kind: "alert" | "confirm";
  message: string;
};

type EnhancedSelect = {
  button: HTMLButtonElement;
  onClick: () => void;
  onChange: () => void;
};

function selectedLabel(select: HTMLSelectElement) {
  return select.selectedOptions[0]?.textContent?.trim() || select.value || "Select";
}

function setAttributeIfChanged(element: HTMLElement, name: string, value: string) {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function dialogMeta(dialog: DialogState) {
  const lower = dialog.message.toLocaleLowerCase("en-US");
  if (dialog.kind === "alert") {
    if (lower.includes("clipboard")) return { eyebrow: "SYSTEM MESSAGE", title: "Clipboard", confirm: "Close", danger: false };
    if (lower.includes("currently") || lower.includes("before deleting")) return { eyebrow: "WORKFLOW NOTICE", title: "Stage is in use", confirm: "Close", danger: false };
    return { eyebrow: "SYSTEM MESSAGE", title: "Notice", confirm: "Close", danger: false };
  }
  if (lower.includes("delete")) return { eyebrow: "CONFIRM ACTION", title: "Delete record?", confirm: "Delete", danger: true };
  if (lower.includes("restore")) return { eyebrow: "CONFIRM ACTION", title: "Restore defaults?", confirm: "Restore", danger: false };
  return { eyebrow: "CONFIRM ACTION", title: "Continue?", confirm: "Confirm", danger: false };
}

export default function HistoryUx({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [selectMenu, setSelectMenu] = useState<SelectMenu | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resumeTargetRef = useRef<HTMLElement | null>(null);
  const confirmBypassRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const records = new Map<HTMLSelectElement, EnhancedSelect>();
    let activeClickTarget: HTMLElement | null = null;
    let scanQueued = false;

    const syncSelect = (select: HTMLSelectElement, button: HTMLButtonElement) => {
      const label = selectedLabel(select);
      if (button.textContent !== label) button.textContent = label;
      if (button.disabled !== select.disabled) button.disabled = select.disabled;
      setAttributeIfChanged(button, "aria-disabled", select.disabled ? "true" : "false");
      setAttributeIfChanged(button, "aria-label", select.getAttribute("aria-label") || label);
    };

    const openSelect = (select: HTMLSelectElement, button: HTMLButtonElement) => {
      if (select.disabled) return;
      syncSelect(select, button);
      const rect = button.getBoundingClientRect();
      const options = Array.from(select.options).map((option) => ({
        value: option.value,
        label: option.textContent?.trim() || option.value,
        disabled: option.disabled,
      }));
      const desiredHeight = Math.min(300, Math.max(42, options.length * 34 + 10));
      const roomBelow = window.innerHeight - rect.bottom - 10;
      const roomAbove = rect.top - 10;
      const placeAbove = roomBelow < Math.min(180, desiredHeight) && roomAbove > roomBelow;
      const maxHeight = Math.max(80, Math.min(desiredHeight, placeAbove ? roomAbove - 8 : roomBelow));
      const top = placeAbove ? Math.max(8, rect.top - maxHeight - 6) : Math.min(window.innerHeight - maxHeight - 8, rect.bottom + 6);
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - rect.width - 8));

      setAttributeIfChanged(button, "aria-expanded", "true");
      setSelectMenu({ select, trigger: button, options, left, top, width: rect.width, maxHeight });
    };

    const enhance = (select: HTMLSelectElement) => {
      const existing = records.get(select);
      if (existing) {
        if (!existing.button.isConnected && select.isConnected) select.insertAdjacentElement("afterend", existing.button);
        syncSelect(select, existing.button);
        return;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "thaCustomSelectTrigger";
      if (select.classList.contains("thaStatusSelect")) button.classList.add("thaStatusSelectCustom");
      if (select.closest(".thaKanbanCard")) button.classList.add("thaKanbanSelectCustom");
      if (select.closest(".thaField")) button.classList.add("thaFieldSelectCustom");
      button.setAttribute("role", "combobox");
      button.setAttribute("aria-haspopup", "listbox");
      button.setAttribute("aria-expanded", "false");

      const onClick = () => openSelect(select, button);
      const onChange = () => syncSelect(select, button);
      button.addEventListener("click", onClick);
      select.addEventListener("change", onChange);
      select.classList.add("thaNativeSelectHidden");
      select.insertAdjacentElement("afterend", button);
      syncSelect(select, button);
      records.set(select, { button, onClick, onChange });
    };

    const cleanDisconnected = () => {
      for (const [select, record] of records) {
        if (select.isConnected) continue;
        record.button.removeEventListener("click", record.onClick);
        select.removeEventListener("change", record.onChange);
        record.button.remove();
        records.delete(select);
      }
    };

    const scan = () => {
      scanQueued = false;
      const root = document.querySelector<HTMLElement>(".thaShell") || document.body;
      root.querySelectorAll<HTMLSelectElement>("select:not(.thaNativeSelectHidden)").forEach(enhance);
      cleanDisconnected();
    };

    const queueScan = () => {
      if (scanQueued) return;
      scanQueued = true;
      window.requestAnimationFrame(scan);
    };

    scan();
    const observedRoot = document.querySelector<HTMLElement>(".thaShell") || document.body;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length || mutation.removedNodes.length) {
          queueScan();
          break;
        }
      }
    });
    observer.observe(observedRoot, { childList: true, subtree: true });

    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);

    const captureClick = (event: MouseEvent) => {
      activeClickTarget = (event.target as Element | null)?.closest<HTMLElement>("button,a,[role='button']") || null;
      const captured = activeClickTarget;
      queueMicrotask(() => {
        if (activeClickTarget === captured) activeClickTarget = null;
      });
    };

    document.addEventListener("click", captureClick, true);

    window.alert = (message?: unknown) => {
      setDialog({ kind: "alert", message: String(message ?? "") });
    };

    window.confirm = (message?: string) => {
      if (confirmBypassRef.current) {
        confirmBypassRef.current = false;
        return true;
      }
      resumeTargetRef.current = activeClickTarget;
      setDialog({ kind: "confirm", message: String(message ?? "") });
      return false;
    };

    const closeFloating = () => {
      setSelectMenu((current) => {
        if (current) current.trigger.setAttribute("aria-expanded", "false");
        return null;
      });
    };
    window.addEventListener("resize", closeFloating);
    window.addEventListener("scroll", closeFloating, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", captureClick, true);
      window.removeEventListener("resize", closeFloating);
      window.removeEventListener("scroll", closeFloating, true);
      window.alert = nativeAlert;
      window.confirm = nativeConfirm;
      for (const [select, record] of records) {
        record.button.removeEventListener("click", record.onClick);
        select.removeEventListener("change", record.onChange);
        record.button.remove();
        select.classList.remove("thaNativeSelectHidden");
      }
    };
  }, []);

  useEffect(() => {
    if (!selectMenu && !dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectMenu) {
        selectMenu.trigger.setAttribute("aria-expanded", "false");
        setSelectMenu(null);
      } else if (dialog) {
        setDialog(null);
        resumeTargetRef.current = null;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectMenu, dialog]);

  function closeSelect() {
    selectMenu?.trigger.setAttribute("aria-expanded", "false");
    setSelectMenu(null);
  }

  function chooseSelect(value: string) {
    if (!selectMenu) return;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    descriptor?.set?.call(selectMenu.select, value);
    selectMenu.select.dispatchEvent(new Event("change", { bubbles: true }));
    const label = selectedLabel(selectMenu.select);
    if (selectMenu.trigger.textContent !== label) selectMenu.trigger.textContent = label;
    closeSelect();
  }

  function closeDialog() {
    setDialog(null);
    resumeTargetRef.current = null;
  }

  function confirmDialog() {
    if (!dialog) return;
    if (dialog.kind === "alert") {
      closeDialog();
      return;
    }
    const target = resumeTargetRef.current;
    setDialog(null);
    resumeTargetRef.current = null;
    if (target?.isConnected) {
      confirmBypassRef.current = true;
      window.requestAnimationFrame(() => target.click());
    }
  }

  const dialogInfo = dialog ? dialogMeta(dialog) : null;

  return (
    <>
      {children}
      {mounted && selectMenu ? createPortal(
        <>
          <button className="thaSelectScrim" type="button" aria-label="Close dropdown" onClick={closeSelect} />
          <div
            className="thaCustomSelectMenu"
            role="listbox"
            style={{ left: selectMenu.left, top: selectMenu.top, width: selectMenu.width, maxHeight: selectMenu.maxHeight }}
          >
            {selectMenu.options.map((option, index) => (
              <button
                type="button"
                role="option"
                aria-selected={selectMenu.select.value === option.value}
                className={selectMenu.select.value === option.value ? "active" : ""}
                disabled={option.disabled}
                key={`${option.value}-${index}`}
                onClick={() => chooseSelect(option.value)}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>,
        document.body,
      ) : null}
      {mounted && dialog && dialogInfo ? createPortal(
        <div className="thaUxDialogScrim" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
          <section className="thaUxDialog" role="dialog" aria-modal="true" aria-label={dialogInfo.title}>
            <div className="thaUxDialogHead">
              <div><small>{dialogInfo.eyebrow}</small><strong>{dialogInfo.title}</strong></div>
              <button type="button" className="thaUxDialogClose" onClick={closeDialog} aria-label="Close"><X size={15} /></button>
            </div>
            <p>{dialog.message}</p>
            <div className="thaUxDialogActions">
              {dialog.kind === "confirm" ? <button type="button" className="thaUxDialogCancel" onClick={closeDialog}>Cancel</button> : null}
              <button type="button" className={`thaUxDialogConfirm ${dialogInfo.danger ? "danger" : ""}`} onClick={confirmDialog}>{dialogInfo.confirm}</button>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
