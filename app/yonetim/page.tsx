"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { defaultConfig, StartpageConfig } from "../startpage-config";

const STORAGE_KEY = "startpage-config-v1";
const NOTE_KEY = "startpage-quick-note";

type StatePayload = {
  config?: StartpageConfig;
  note?: string;
  isNew?: boolean;
  setupRequired?: boolean;
  error?: string;
};

export default function ManagementPage() {
  const [config, setConfig] = useState<StartpageConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storageStatus, setStorageStatus] = useState("Kalıcı veriler yükleniyor...");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const raw = localStorage.getItem(STORAGE_KEY);
      const localNote = localStorage.getItem(NOTE_KEY) || "";
      let localConfig = defaultConfig;

      if (raw) {
        try {
          localConfig = { ...defaultConfig, ...JSON.parse(raw) };
          setConfig(localConfig);
        } catch {}
      }

      try {
        const response = await fetch("/api/state?initialize=1", { cache: "no-store" });
        const data = await response.json() as StatePayload;
        if (cancelled) return;

        if (!response.ok || data.setupRequired) {
          setStorageStatus(data.error || "Veritabanı bağlı değil; yerel yedek kullanılıyor.");
          return;
        }

        if (data.isNew && raw) {
          const migration = await fetch("/api/state", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: localConfig, note: localNote }),
          });

          if (!migration.ok) throw new Error("migration");
          setConfig(localConfig);
          setStorageStatus("Tarayıcıdaki mevcut veriler kalıcı alana aktarıldı.");
          return;
        }

        if (data.config) {
          setConfig(data.config);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.config));
        }
        if (typeof data.note === "string") localStorage.setItem(NOTE_KEY, data.note);
        setStorageStatus("Veritabanı ile senkronize.");
      } catch {
        if (!cancelled) setStorageStatus("Kalıcı veri okunamadı; yerel yedek kullanılıyor.");
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "save");

      setStorageStatus("Veritabanına kaydedildi ve tüm cihazlarla senkronize.");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      setStorageStatus(error instanceof Error && error.message !== "save" ? error.message : "Kalıcı kayıt başarısız; yerel yedek kaydedildi.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="adminPage">
    <header className="adminHeader">
      <div><p>STARTPAGE / YÖNETİM</p><h1>İçerik kontrolü</h1></div>
      <Link href="/"><ArrowLeft size={18}/> Ana sayfa</Link>
    </header>

    <form onSubmit={save} className="adminForm">
      <section className="adminSection">
        <div className="sectionHeading"><div><span>00</span><h2>Daktilo karşılama yazısı</h2></div></div>
        <div className="editorGrid"><article className="editorCard"><input value={config.greeting || ""} onChange={e=>setConfig({...config,greeting:e.target.value})} placeholder="Boş bırakırsan saate göre Günaydın / İyi günler / İyi akşamlar yazar"/><small>Bu alan boşken karşılama yazısı günün saatine göre otomatik değişir.</small></article></div>
      </section>

      <section className="adminSection">
        <div className="sectionHeading"><div><span>01</span><h2>Projelerim</h2></div><button type="button" onClick={() => setConfig({...config, projects:[...config.projects,{name:"Yeni proje",url:"https://"}]})}><Plus size={16}/> Ekle</button></div>
        <div className="editorGrid">{config.projects.map((project,index)=><article className="editorCard" key={index}>
          <input value={project.name} onChange={e=>{const a=[...config.projects];a[index]={...project,name:e.target.value};setConfig({...config,projects:a})}} placeholder="Proje adı"/>
          <input value={project.url} onChange={e=>{const a=[...config.projects];a[index]={...project,url:e.target.value};setConfig({...config,projects:a})}} placeholder="Canlı site URL"/>
          <input value={project.github||""} onChange={e=>{const a=[...config.projects];a[index]={...project,github:e.target.value};setConfig({...config,projects:a})}} placeholder="GitHub URL"/>
          <input value={project.vercel||""} onChange={e=>{const a=[...config.projects];a[index]={...project,vercel:e.target.value};setConfig({...config,projects:a})}} placeholder="Vercel URL"/>
          <input value={project.status||""} onChange={e=>{const a=[...config.projects];a[index]={...project,status:e.target.value};setConfig({...config,projects:a})}} placeholder="Durum"/>
          <button className="danger" type="button" onClick={()=>setConfig({...config,projects:config.projects.filter((_,i)=>i!==index)})}><Trash2 size={15}/> Sil</button>
        </article>)}</div>
      </section>

      <section className="adminSection">
        <div className="sectionHeading"><div><span>02</span><h2>Klasörler ve bağlantılar</h2></div><button type="button" onClick={()=>setConfig({...config,folders:[...config.folders,{title:"Yeni klasör",subtitle:"",links:[]}]})}><Plus size={16}/> Klasör</button></div>
        <div className="folderEditors">{config.folders.map((folder,fi)=><article className="folderEditor" key={fi}>
          <div className="folderEditorHead"><input value={folder.title} onChange={e=>{const a=[...config.folders];a[fi]={...folder,title:e.target.value};setConfig({...config,folders:a})}}/><button type="button" onClick={()=>setConfig({...config,folders:config.folders.filter((_,i)=>i!==fi)})}><Trash2 size={15}/></button></div>
          <input value={folder.subtitle} onChange={e=>{const a=[...config.folders];a[fi]={...folder,subtitle:e.target.value};setConfig({...config,folders:a})}} placeholder="Kısa açıklama"/>
          {folder.links.map((link,li)=><div className="linkEditor" key={li}><input value={link.name} onChange={e=>{const a=[...config.folders];const links=[...folder.links];links[li]={...link,name:e.target.value};a[fi]={...folder,links};setConfig({...config,folders:a})}}/><input value={link.url} onChange={e=>{const a=[...config.folders];const links=[...folder.links];links[li]={...link,url:e.target.value};a[fi]={...folder,links};setConfig({...config,folders:a})}}/><button type="button" onClick={()=>{const a=[...config.folders];a[fi]={...folder,links:folder.links.filter((_,i)=>i!==li)};setConfig({...config,folders:a})}}><Trash2 size={14}/></button></div>)}
          <button className="addLink" type="button" onClick={()=>{const a=[...config.folders];a[fi]={...folder,links:[...folder.links,{name:"Yeni bağlantı",url:"https://"}]};setConfig({...config,folders:a})}}><Plus size={15}/> Bağlantı ekle</button>
        </article>)}</div>
      </section>

      <section className="adminSection twoColAdmin">
        <div><div className="sectionHeading"><div><span>03</span><h2>Piyasalar</h2></div></div>{config.markets.map((item,i)=><div className="linkEditor" key={i}><input value={item.symbol} onChange={e=>{const a=[...config.markets];a[i]={...item,symbol:e.target.value.toUpperCase()};setConfig({...config,markets:a})}}/><input value={item.name} onChange={e=>{const a=[...config.markets];a[i]={...item,name:e.target.value};setConfig({...config,markets:a})}}/><button type="button" onClick={()=>setConfig({...config,markets:config.markets.filter((_,x)=>x!==i)})}><Trash2 size={14}/></button></div>)}<button className="addLink" type="button" onClick={()=>setConfig({...config,markets:[...config.markets,{symbol:"",name:"Yeni varlık",type:"stock"}]})}><Plus size={15}/> Varlık ekle</button></div>
        <div><div className="sectionHeading"><div><span>04</span><h2>Şehirler</h2></div></div>{config.cities.map((item,i)=><article className="editorCard" key={i}><div className="linkEditor"><input value={item.name} onChange={e=>{const a=[...config.cities];a[i]={...item,name:e.target.value};setConfig({...config,cities:a})}}/><input value={item.country} onChange={e=>{const a=[...config.cities];a[i]={...item,country:e.target.value};setConfig({...config,cities:a})}}/><button type="button" onClick={()=>setConfig({...config,cities:config.cities.filter((_,x)=>x!==i)})}><Trash2 size={14}/></button></div><input type="number" step="any" value={item.latitude} onChange={e=>{const a=[...config.cities];a[i]={...item,latitude:Number(e.target.value)};setConfig({...config,cities:a})}} placeholder="Enlem"/><input type="number" step="any" value={item.longitude} onChange={e=>{const a=[...config.cities];a[i]={...item,longitude:Number(e.target.value)};setConfig({...config,cities:a})}} placeholder="Boylam"/><input value={item.timezone} onChange={e=>{const a=[...config.cities];a[i]={...item,timezone:e.target.value};setConfig({...config,cities:a})}} placeholder="Europe/Malta"/></article>)}<button className="addLink" type="button" onClick={()=>setConfig({...config,cities:[...config.cities,{name:"Yeni şehir",country:"",latitude:0,longitude:0,timezone:"auto"}]})}><Plus size={15}/> Şehir ekle</button></div>
      </section>

      <div className="saveBar"><span>{saved ? "Kaydedildi" : storageStatus}</span><button type="submit" disabled={saving}><Save size={17}/> {saving ? "Kaydediliyor" : "Kaydet"}</button></div>
    </form>
  </main>;
}
