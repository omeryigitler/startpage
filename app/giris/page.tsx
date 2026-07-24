"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="adminPage" style={{display:"grid",placeItems:"center"}}>
      <section className="adminSection" style={{width:"min(520px,100%)",textAlign:"center"}}>
        <p style={{color:"#dfff00",letterSpacing:".16em",fontSize:11}}>STARTPAGE / GİRİŞ</p>
        <h1 style={{fontSize:42,margin:"10px 0 14px"}}>Yönetim erişimi</h1>
        <p style={{color:"#9ba4b2",lineHeight:1.6}}>Bu alan yalnızca yetkili Google hesabına açıktır.</p>
        <button onClick={() => signIn("google", { callbackUrl: "/yonetim" })} style={{marginTop:18,border:0,borderRadius:999,padding:"12px 18px",fontWeight:700,cursor:"pointer"}}>Google ile devam et</button>
      </section>
    </main>
  );
}
