"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";

export type StartpageConfig = {
  projects: { name: string; url: string; github?: string; vercel?: string; status?: string }[];
  folders: { title: string; subtitle: string; links: { name: string; url: string; note?: string }[] }[];
  markets: { symbol: string; name: string; type: string }[];
  cities: { name: string; country: string; latitude: number; longitude: number; timezone: string }[];
};

export const defaultConfig: StartpageConfig = {
  projects: [
    { name: "omeryigitler.com", url: "https://omeryigitler.com", github: "https://github.com/omeryigitler/omeryigitler.com", status: "Aktif" },
    { name: "Built With Seyhan", url: "https://builtwithseyhan.com", status: "Aktif" },
    { name: "Berfin Akbaş", url: "https://berfinakbas.com", status: "Aktif" },
    { name: "Dawl Studio", url: "https://dawlstudio.com", status: "Geliştiriliyor" }
  ],
  folders: [
    { title: "Çalışma Araçları", subtitle: "Kod, yayın ve operasyon", links: [
      { name: "GitHub", url: "https://github.com", note: "Kod ve repository" },
      { name: "Vercel", url: "https://vercel.com", note: "Deploy ve domain" },
      { name: "Supabase", url: "https://supabase.com", note: "Veri ve storage" },
      { name: "Neon", url: "https://neon.tech", note: "PostgreSQL" }
    ]},
    { title: "Yapay Zekâ", subtitle: "Üretim ve araştırma", links: [
      { name: "ChatGPT", url: "https://chatgpt.com" }, { name: "Claude", url: "https://claude.ai" },
      { name: "Gemini", url: "https://gemini.google.com" }, { name: "Perplexity", url: "https://perplexity.ai" }
    ]},
    { title: "Tasarım Kaynakları", subtitle: "İlham, arayüz ve tipografi", links: [
      { name: "Awwwards", url: "https://awwwards.com" }, { name: "Mobbin", url: "https://mobbin.com" },
      { name: "Pinterest", url: "https://pinterest.com" }, { name: "Dribbble", url: "https://dribbble.com" }
    ]},
    { title: "Sosyal", subtitle: "İçerik ve iletişim", links: [
      { name: "Instagram", url: "https://instagram.com" }, { name: "LinkedIn", url: "https://linkedin.com" },
      { name: "X", url: "https://x.com" }, { name: "Reddit", url: "https://reddit.com" }
    ]}
  ],
  markets: [
    { symbol: "XAU", name: "Altın", type: "metal" }, { symbol: "BTC", name: "Bitcoin", type: "crypto" },
    { symbol: "EURTRY", name: "Euro / TL", type: "fx" }, { symbol: "NVDA", name: "NVIDIA", type: "stock" }
  ],
  cities: [
    { name: "Sliema", country: "Malta", latitude: 35.9122, longitude: 14.5042, timezone: "Europe/Malta" },
    { name: "Eskişehir", country: "Türkiye", latitude: 39.7767, longitude: 30.5206, timezone: "Europe/Istanbul" },
    { name: "Brüksel", country: "Belçika", latitude: 50.8503, longitude: 4.3517, timezone: "Europe/Brussels" }
  ]
};

const STORAGE_KEY = "startpage-config-v1";

export default function ManagementPage() {
  const [config, setConfig] = useState<StartpageConfig>(defaultConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) try { setConfig(JSON.parse(raw)); } catch {}
  }, []);

  function save(event: FormEvent) {
    event.preventDefault();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return <main className="adminPage">
    <header className="adminHeader">
      <div><p>STARTPAGE / YÖNETİM</p><h1>İçerik kontrolü</h1></div>
      <Link href="/"><ArrowLeft size={18}/> Ana sayfa</Link>
    </header>

    <form onSubmit={save} className="adminForm">
      <section className="adminSection">
        <div className="sectionHeading"><div><span>01</span><h2>Projelerim</h2></div><button type="button" onClick={() => setConfig({...config, projects:[...config.projects,{name:"Yeni proje",url:"https://"}]})}><Plus size={16}/> Ekle</button></div>
        <div className="editorGrid">{config.projects.map((project,index)=><article className="editorCard" key={index}>
          <input value={project.name} onChange={e=>{const a=[...config.projects];a[index]={...project,name:e.target.value};setConfig({...config,projects:a})}} placeholder="Proje adı"/>
          <input value={project.url} onChange={e=>{const a=[...config.projects];a[index]={...project,url:e.target.value};setConfig({...config,projects:a})}} placeholder="Canlı site URL"/>
          <input value={project.github||""} onChange={e=>{const a=[...config.projects];a[index]={...project,github:e.target.value};setConfig({...config,projects:a})}} placeholder="GitHub URL"/>
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
        <div><div className="sectionHeading"><div><span>03</span><h2>Piyasalar</h2></div></div>{config.markets.map((item,i)=><div className="linkEditor" key={i}><input value={item.symbol} onChange={e=>{const a=[...config.markets];a[i]={...item,symbol:e.target.value};setConfig({...config,markets:a})}}/><input value={item.name} onChange={e=>{const a=[...config.markets];a[i]={...item,name:e.target.value};setConfig({...config,markets:a})}}/><button type="button" onClick={()=>setConfig({...config,markets:config.markets.filter((_,x)=>x!==i)})}><Trash2 size={14}/></button></div>)}<button className="addLink" type="button" onClick={()=>setConfig({...config,markets:[...config.markets,{symbol:"",name:"Yeni varlık",type:"stock"}]})}><Plus size={15}/> Varlık ekle</button></div>
        <div><div className="sectionHeading"><div><span>04</span><h2>Şehirler</h2></div></div>{config.cities.map((item,i)=><div className="linkEditor" key={i}><input value={item.name} onChange={e=>{const a=[...config.cities];a[i]={...item,name:e.target.value};setConfig({...config,cities:a})}}/><input value={item.country} onChange={e=>{const a=[...config.cities];a[i]={...item,country:e.target.value};setConfig({...config,cities:a})}}/><button type="button" onClick={()=>setConfig({...config,cities:config.cities.filter((_,x)=>x!==i)})}><Trash2 size={14}/></button></div>)}</div>
      </section>

      <div className="saveBar"><span>{saved ? "Kaydedildi" : "Değişiklikler bu tarayıcıda saklanır"}</span><button type="submit"><Save size={17}/> Kaydet</button></div>
    </form>
  </main>;
}
