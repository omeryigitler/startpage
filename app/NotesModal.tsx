"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  if (!value) return "Not saved yet";
  return new Intl.DateTimeFormat("en-GB", {
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
  const [mounted, setMounted] = useState(false);
  const [notes, setNotes] = useState<StartpageNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);

  const selected = useMemo(() => notes.find(note => note.id === selectedId) || null, [notes, selectedId]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, mounted]);

  async function loadNotes(preferredId?: string | null) {
    setStatus("Loading notes...");
    const response = await fetch("/api/notes", { cache: "no-store" });
    const data = await response.json() as { notes?: StartpageNote[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Notes could not be loaded.");

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
    setStatus(nextNotes.length ? "Notes are up to date." : "Create your first note.");
  }

  useEffect(() => {
    if (!open || !canEdit) return;
    loadNotes().catch(error => setStatus(error instanceof Error ? error.message : "Notes could not be loaded."));
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
    setStatus("New note ready.");
  }

  function chooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files || []);
    event.target.value = "";
    const allowed = incoming.filter(file => file.type.startsWith("image/") || file.type === "application/pdf");
    const sized = allowed.filter(file => file.size <= 4 * 1024 * 1024);
    const available = Math.max(0, 12 - (selected?.attachments.length || 0) - pendingFiles.length);
    const next = sized.slice(0, available);
    setPendingFiles(current => [...current, ...next]);

    if (allowed.length !== incoming.length) setStatus("Only images and PDF files are supported.");
    else if (sized.length !== allowed.length) setStatus("Each file can be up to 4 MB.");
    else if (next.length !== sized.length) setStatus("A note can contain up to 12 files.");
    else setStatus(`${next.length} file${next.length === 1 ? "" : "s"} ready to save.`);
  }

  async function save() {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setStatus("A note title is required.");
      return;
    }

    setBusy(true);
    setStatus("Saving note...");
    try {
      const response = await fetch("/api/notes", {
        method: selectedId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedId || undefined, title: cleanTitle, content }),
      });
      const data = await response.json() as { note?: StartpageNote; error?: string };
      if (!response.ok || !data.note) throw new Error(data.error || "Note could not be saved.");

      const savedId = data.note.id;
      for (const file of pendingFiles) {
        setStatus(`Uploading ${file.name}...`);
        const form = new FormData();
        form.set("noteId", savedId);
        form.set("file", file);
        const uploadResponse = await fetch("/api/notes/upload", { method: "POST", body: form });
        const uploadData = await uploadResponse.json() as { error?: string };
        if (!uploadResponse.ok) throw new Error(uploadData.error || `${file.name} could not be uploaded.`);
      }

      await loadNotes(savedId);
      setStatus(pendingFiles.length ? "Note and files saved." : "Note saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Note could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAttachment(attachment: NoteAttachment) {
    if (!selectedId || busy) return;
    setBusy(true);
    setStatus(`Removing ${attachment.name}...`);
    try {
      const query = new URLSearchParams({ noteId: selectedId, pathname: attachment.pathname });
      const response = await fetch(`/api/notes/upload?${query}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "File could not be removed.");
      await loadNotes(selectedId);
      setStatus("File removed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "File could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeNote() {
    if (!selectedId || busy) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      setStatus("Press Delete again to confirm.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/notes?id=${encodeURIComponent(selectedId)}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Note could not be deleted.");
      await loadNotes(null);
      setStatus("Note deleted.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Note could not be deleted.");
    } finally {
      setBusy(false);
      setDeleteArmed(false);
    }
  }

  if (!open || !mounted) return null;

  const hasFiles = Boolean(selected?.attachments.length || pendingFiles.length);

  const modal = <div className="notesBackdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="notesModal" role="dialog" aria-modal="true" aria-label="Notes">
      <header className="notesHeader">
        <div><NotebookPen size={22}/><span><strong>Notes</strong><small>Personal archive with titles, dates and file attachments</small></span></div>
        <div className="notesHeaderActions"><button type="button" onClick={createNew} disabled={!canEdit || busy}><Plus size={16}/> <span>New note</span></button><button type="button" className="notesClose" onClick={onClose} disabled={busy} aria-label="Close notes"><X size={19}/></button></div>
      </header>

      {!canEdit ? <div className="notesLoginState"><NotebookPen size={36}/><strong>Notes are private</strong><p>Sign in with your Google account to view and edit your notes.</p><a href="/giris">Sign in with Google</a></div> : <div className="notesBody">
        <aside className="notesList">
          <div className="notesListTitle"><strong>All notes</strong><span>{notes.length}</span></div>
          <div className="notesListScroll">{notes.map(note => <button type="button" key={note.id} className={note.id === selectedId ? "active" : ""} onClick={() => setSelectedId(note.id)}><strong>{note.title}</strong><p>{note.content || "No content"}</p><span><Clock3 size={12}/>{formatDate(note.updatedAt)}</span>{note.attachments.length > 0 && <i><Paperclip size={11}/>{note.attachments.length}</i>}</button>)}{!notes.length && <div className="notesEmpty"><NotebookPen size={28}/><span>No notes yet</span></div>}</div>
        </aside>

        <section className="noteEditor">
          <div className="noteFields">
            <input className="noteTitleInput" value={title} onChange={event => setTitle(event.target.value)} placeholder="Note title" maxLength={180}/>
            <div className="noteDates"><span><strong>Created</strong>{formatDate(selected?.createdAt)}</span><span><strong>Last edited</strong>{formatDate(selected?.updatedAt)}</span></div>
            <textarea value={content} onChange={event => setContent(event.target.value)} placeholder="Write your note here..." maxLength={50000}/>
          </div>

          <section className="noteAttachments">
            <div className="attachmentGrid">
              {selected?.attachments.map(attachment => <article key={attachment.pathname} className="attachmentCard">
                <a href={fileUrl(attachment.pathname)} target="_blank" rel="noreferrer" className="attachmentPreview">{attachment.contentType.startsWith("image/") ? <img src={fileUrl(attachment.pathname)} alt={attachment.name}/> : <FileText size={34}/>}</a>
                <div><strong title={attachment.name}>{attachment.name}</strong><span>{formatSize(attachment.size)} · {formatDate(attachment.uploadedAt)}</span></div>
                <button type="button" onClick={() => removeAttachment(attachment)} disabled={busy} aria-label={`Remove ${attachment.name}`}><Trash2 size={14}/></button>
              </article>)}
              {pendingFiles.map((file, index) => <article key={`${file.name}-${index}`} className="attachmentCard pending"><div className="attachmentPreview">{file.type.startsWith("image/") ? <FileImage size={34}/> : <FileText size={34}/>}</div><div><strong title={file.name}>{file.name}</strong><span>{formatSize(file.size)} · Ready to save</span></div><button type="button" onClick={() => setPendingFiles(files => files.filter((_, fileIndex) => fileIndex !== index))} disabled={busy} aria-label={`Remove ${file.name}`}><X size={14}/></button></article>)}
              <label className={hasFiles ? "attachmentAddTile compact" : "attachmentAddTile"}>
                <UploadCloud size={hasFiles ? 18 : 22}/>
                <span>Add image or PDF</span>
                <input type="file" multiple accept="image/*,application/pdf" onChange={chooseFiles} disabled={busy}/>
              </label>
            </div>
          </section>

          <footer className="notesFooter"><span>{status}</span><div>{selectedId && <button type="button" className={deleteArmed ? "danger armed" : "danger"} onClick={removeNote} disabled={busy} aria-label={deleteArmed ? "Confirm delete note" : "Delete note"} title={deleteArmed ? "Confirm delete" : "Delete note"}><Trash2 size={17}/></button>}<button type="button" className="saveNoteButton" onClick={save} disabled={busy} aria-label={busy ? "Processing" : "Save note"} title={busy ? "Processing" : "Save note"}><Save size={18}/></button></div></footer>
        </section>
      </div>}
    </section>
  </div>;

  return createPortal(modal, document.body);
}
