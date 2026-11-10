"use client";
import { Children, isValidElement, useEffect, useId, useRef, useState, type ChangeEvent, type ReactElement, type SelectHTMLAttributes } from "react";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import styles from "./agency.module.css";

type Option = { value: string; label: string; disabled: boolean };
export function Select({ children, value, defaultValue, name, onChange, id, disabled, required, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  const options: Option[] = Children.toArray(children).filter(isValidElement).map(child => {
    const p = (child as ReactElement<{ value?: string; children?: string; disabled?: boolean }>).props;
    return { value: String(p.value ?? p.children ?? ""), label: String(p.children ?? ""), disabled: Boolean(p.disabled) };
  });
  const [local, setLocal] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const selected = String(value ?? (options.some(option => option.value === local) ? local : options[0]?.value ?? ""));
  function pick(option: Option) {
    if (option.disabled) return;
    setLocal(option.value); setOpen(false);
    onChange?.({ target: { value: option.value, name }, currentTarget: { value: option.value, name } } as ChangeEvent<HTMLSelectElement>);
    trigger.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div ref={root} className={styles.select} onKeyDown={event => {
    if (event.key === "Escape" && open) { event.stopPropagation(); event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault(); setOpen(true);
      setIndex(old => event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (old + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
    }
    if (event.key === "Enter" && open) { event.preventDefault(); if (options[index]) pick(options[index]); }
    if (event.key === "Tab") setOpen(false);
  }}>
    {name && <input type="hidden" name={name} value={selected} />}
    <button ref={trigger} id={id} type="button" disabled={disabled} className={styles.selectTrigger} role="combobox" aria-expanded={open} aria-controls={listId} aria-required={required} aria-label={rest["aria-label"]} aria-activedescendant={open ? `${listId}-${index}` : undefined} onClick={() => { setIndex(Math.max(0, options.findIndex(option => option.value === selected))); setOpen(!open); }}>
      <span>{options.find(option => option.value === selected)?.label || "Choose an option"}</span><ChevronDown size={15} />
    </button>
    {open && <div id={listId} className={styles.selectMenu} role="listbox">{options.map((option, i) => <button key={option.value} id={`${listId}-${i}`} type="button" role="option" aria-selected={option.value === selected} disabled={option.disabled} className={i === index ? styles.highlighted : undefined} onPointerMove={() => setIndex(i)} onClick={() => pick(option)}><span>{option.label}</span>{option.value === selected && <Check size={14} />}</button>)}</div>}
  </div>;
}
export function NumberControl({ value, onChange, min = 1, max = 500, label }: { value: number; onChange: (value: number) => void; min?: number; max?: number; label: string }) {
  const update = (next: number) => onChange(Math.min(max, Math.max(min, Number.isFinite(next) ? next : min)));
  return <div className={styles.number}><button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => update(value - 1)}><Minus size={14} /></button><input type="text" inputMode="numeric" pattern="[0-9]*" aria-label={label} value={value} onChange={event => update(Number(event.target.value))} onKeyDown={event => { if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); update(value + (event.key === "ArrowUp" ? 1 : -1)); } }} /><button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => update(value + 1)}><Plus size={14} /></button></div>;
}
