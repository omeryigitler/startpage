"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Clock3, FileImage, FileText, NotebookPen, Paperclip, Plus, Save, Trash2, UploadCloud, X } from "lucide-react";

export type NoteAttachment = {
  pathname: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string;
};

export type StartpageNote = {
  id: string;
  title: string;
  content: string;
  attachments: NoteAttachment[];
  createdAt: string;
  updatedAt: string;
};

type Props = {
  open: boolean;
  canEdit: boolean;
  onClose: () => void;
};

function formatDate(value?: string) {
  if (!value) return "Henüz kaydedilmedi";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileUrl(pathname: string) {
  return `/api/notes/file?pathname=${encodeURIComponent(pathname)}`;
}

export default function NotesModal({ open, canEdit, onClose }: Props) {
  const [notes, setNotes] = useState<StartpageNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  const selected = useMemo(() => notes.find(note => note.id === selectedId) || null, [notes, selectedId]);

  async function loadNotes(preferredId?: string | null) {
    setStatus("Notlar yükleniyor...");
    const response = await fetch("/api/notes", { cache: "no-store" });
    const data = await response.json() as { notes?: StartpageNote[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Notlar yüklenemedi.");

    const nextNotes = data.notes || [];
    setNotes(nextNotes);
    const nextId = preferredId === null ? null : preferredId || selectedId || nextNotes[0]?.id || null;
    setSelectedId(nextId);
    const nextSelected = nextNotes.find(note => note.id === nextId);
    if (nextSelected) {
      setTitle(nextSelected.title);
      setContent(nextSelected.content);
    } else {
      setTitle("");
      setContent("");
    }
    setPendingFiles([]);
    setStatus(nextNotes.length ? "Notlar güncel." : "İlk notunu oluşturabilirsin.");
  }

  useEffect(() => {
    if (!open || !canEdit) return;
    loadNotes().catch(error => setStatus(error instanceof Error ? error.message : "Notlar yüklenemedi."));
  }, [open, canEdit]);

  useEffect(() => {
    if (!selected) return;
    setTitle(selected.title);
    setContent(selected.content);
    setPendingFiles([]);
    setDeleteArmed(false);
    setStatus("");
  }, [selectedId]);

  function createNew() {
    setSelectedId(null);
    setTitle("");
    setContent("");
    setPendingFiles([]);
    setDeleteArmed(false);
    setStatus("Yeni not hazırlanıyor.");
  }

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files || []);
    event.target.value = "";
    const allowed = incoming.filter(file => file.type.startsWith("image/") || file.type === "application/pdf");
    const sized = allowed.filter(file => file.size <= 4 * 1024 * 1024);
    const available = Math.max(0, 12 - (selected?.attachments.length || 0) - pendingFiles.length);
    const next = sized.slice(0, available);
    setPendingFiles(current => [...current, ...next]);

    if (allowed.length !== incoming.length) setStatus("Yalnızca görsel ve PDF kabul edilir.");
    else if (sized.length !== allowed.length) setStatus("Her dosya en fazla 4 MB olabilir.");
    else if (next.length !== sized.length) setStatus("Bir nota en fazla 12 dosya eklenebilir.");
    else setStatus(`${next.length} dosya kaydetmeye hazır.`);
  }

  async function save() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setStatus("Not başlığı gerekli.");
      return;
    }

    setBusy(true);
    setStatus("Not kaydediliyor...");
    try {
      const response = await fetch("/api/notes", {
        method: selectedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId || undefined, title: cleanTitle, content }),
      });
      const data = await response.json() as { note?: StartpageNote; error?: string };
      if (!response.ok || !data.note) throw new Error(data.error || "Not kaydedilemedi.");

      const savedId = data.note.id;
      for (const file of pendingFiles) {
        setStatus(`${file.name} yükleniyor...`);
        const form = new FormData();
        form.set("noteId", savedId);
        form.set("file", file);
        const uploadResponse = await fetch("/api/notes/upload", { method: "POST", body: form });
        const uploadData = await uploadResponse.json() as { error?: string };
        if (!uploadResponse.ok) throw new Error(uploadData.error || `${file.name} yüklenemedi.`);
      }

      await loadNotes(savedId);
      setStatus(pendingFiles.length ? "Not ve dosyalar kaydedildi." : "Not kaydedildi.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Not kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAttachment(attachment: NoteAttachment) {
    if (!selectedId || busy) return;
    setBusy(true);
    setStatus(`${attachment.name} siliniyor...`);
    try {
      const query = new URLSearchParams({ noteId: selectedId, pathname: attachment.pathname });
      const response = await fetch(`/api/notes/upload?${query}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Dosya silinemedi.");
      await loadNotes(selectedId);
      setStatus("Dosya silindi.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Dosya silinemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function removeNote() {
    if (!selectedId || busy) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      setStatus("Notu silmek için Silinsin mi? düğmesine tekrar bas.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/notes?id=${encodeURIComponent(selectedId)}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Not silinemedi.");
      await loadNotes(null);
      setStatus("Not silindi.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Not silinemedi.");
    } finally {
      setBusy(false);
      setDeleteArmed(false);
    }
  }

  if (!open) return null;

  return <div className="notesBackdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="notesModal" role="dialog" aria-modal="true" aria-label="Notlar">
      <header className="notesHeader">
        <div><NotebookPen size={22}/><span><strong>Notlar</strong><small>Başlık, tarih ve dosya ekleriyle kişisel arşiv</small></span></div>
        <div className="notesHeaderActions"><button type="button" onClick={createNew} disabled={!canEdit || busy}><Plus size={16}/> Yeni not</button><button type="button" className="notesClose" onClick={onClose} disabled={busy}><X size={19}/></button></div>
      </header>

      {!canEdit ? <div className="notesLoginState"><NotebookPen size={36}/><strong>Notlar özel alandır</strong><p>Notlarını görmek ve düzenlemek için Google hesabınla yönetim girişini aç.</p><a href="/giris">Google ile giriş yap</a></div> : <div className="notesBody">
        <aside className="notesList">
          <div className="notesListTitle"><strong>Tüm notlar</strong><span>{notes.length}</span></div>
          <div className="notesListScroll">{notes.map(note => <button type="button" key={note.id} className={note.id === selectedId ? "active" : ""} onClick={() => setSelectedId(note.id)}><strong>{note.title}</strong><p>{note.content || "İçerik yok"}</p><span><Clock3 size={12}/>{formatDate(note.updatedAt)}</span>{note.attachments.length > 0 && <i><Paperclip size={11}/>{note.attachments.length}</i>}</button>)}{!notes.length && <div className="notesEmpty"><NotebookPen size={28}/><span>Henüz not yok</span></div>}</div>
        </aside>

        <section className="noteEditor">
          <div className="noteFields">
            <input className="noteTitleInput" value={title} onChange={event => setTitle(event.target.value)} placeholder="Not başlığı" maxLength={180}/>
            <div className="noteDates"><span><strong>Oluşturuldu</strong>{formatDate(selected?.createdAt)}</span><span><strong>Son düzenleme</strong>{formatDate(selected?.updatedAt)}</span></div>
            <textarea value={content} onChange={event => setContent(event.target.value)} placeholder="Notunu buraya yaz..." maxLength={50000}/>
          </div>

          <section className="noteAttachments">
            <header><div><Paperclip size={16}/><strong>Ekler</strong></div><label><UploadCloud size={15}/> Görsel veya PDF<input type="file" multiple accept="image/*,application/pdf" onChange={chooseFiles} disabled={busy}/></label></header>
            <div className="attachmentGrid">
              {selected?.attachments.map(attachment => <article key={attachment.pathname} className="attachmentCard">
                <a href={fileUrl(attachment.pathname)} target="_blank" rel="noreferrer" className="attachmentPreview">{attachment.contentType.startsWith("image/") ? <img src={fileUrl(attachment.pathname)} alt={attachment.name}/> : <FileText size={34}/>}</a>
                <div><strong title={attachment.name}>{attachment.name}</strong><span>{formatSize(attachment.size)} · {formatDate(attachment.uploadedAt)}</span></div>
                <button type="button" onClick={() => removeAttachment(attachment)} disabled={busy} aria-label={`${attachment.name} dosyasını sil`}><Trash2 size={14}/></button>
              </article>)}
              {pendingFiles.map((file, index) => <article key={`${file.name}-${index}`} className="attachmentCard pending"><div className="attachmentPreview">{file.type.startsWith("image/") ? <FileImage size={34}/> : <FileText size={34}/>}</div><div><strong title={file.name}>{file.name}</strong><span>{formatSize(file.size)} · Kaydetmeye hazır</span></div><button type="button" onClick={() => setPendingFiles(files => files.filter((_, fileIndex) => fileIndex !== index))} disabled={busy}><X size={14}/></button></article>)}
              {!selected?.attachments.length && !pendingFiles.length && <div className="attachmentsEmpty"><Paperclip size={20}/><span>Bu nota henüz dosya eklenmedi.</span></div>}
            </div>
          </section>

          <footer className="notesFooter"><span>{status}</span><div>{selectedId && <button type="button" className={deleteArmed ? "danger armed" : "danger"} onClick={removeNote} disabled={busy}><Trash2 size={15}/>{deleteArmed ? "Silinsin mi?" : "Notu sil"}</button>}<button type="button" className="saveNoteButton" onClick={save} disabled={busy}><Save size={16}/>{busy ? "İşleniyor" : "Kaydet"}</button></div></footer>
        </section>
      </div>}
    </section>
  </div>;
}
