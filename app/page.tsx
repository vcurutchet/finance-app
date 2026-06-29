"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_S  = ["Jan","Fév","Mars","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const fmt = (n: number) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const fmtDate = (d: string) => { if(!d)return"—"; const p=d.split("-"); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d; };
const COLOR_PRESETS = ["#2563EB","#7C3AED","#DB2777","#DC2626","#EA580C","#D97706","#16A34A","#0D9488","#0EA5E9","#6366F1","#475569","#9CA3AF"];
const monthKey = (y: number, m: number) => `${y}-${String(m+1).padStart(2,"0")}`;

const EXPENSE_CATS   = ["🏠 Loyer","🚗 Transport","🛒 Courses","🍽️ Restaurant","📱 Abonnements","⚡ Énergie","💊 Santé","🎭 Loisirs","👕 Vêtements","🎓 Éducation","🐾 Animaux","🔧 Divers"];
const SAVINGS_TYPES  = ["Livret A","LDDS","PEL","Assurance Vie","PEA","Compte Titre","Crypto","Autre"];
const INCOME_TYPES   = ["CA 2026","CA 2025","Salaire","Freelance","Dividendes","Loyer perçu","Prime","Remboursement","Autre"];
const EXIT_CATS      = ["TVA","Impôt société","Frais pro","Salaire","PER / Assurance vie","Charges sociales","Divers"];
const FRAIS_TYPES    = ["Repas client","Transport","Hébergement","Matériel","Logiciel","Formation","Téléphone","Internet","Fournitures","Sous-traitance","Autre"];
const ENTRY_SUGGESTIONS = [
  ...MONTHS_FR.map(m=>`CA ${m} 2026`),
  "CA Novembre 2025","CA Décembre 2025",
  "Salaire exceptionnel","Dividendes","Remboursement TVA","Remboursement URSSAF","Autre",
];

const ocean="#1B4D6E", sage="#2A7A5A", basque="#C0622A", amber="#8F6018";
const text="#111827", text2="#4B5563", text3="#9CA3AF", border="#E5E7EB";
const serif="'DM Serif Display',serif";

const FRAIS_COLORS: Record<string,{bg:string,dot:string}> = {
  "Repas client":   {bg:"rgba(234,88,12,0.1)",  dot:"#EA580C"},
  "Transport":      {bg:"rgba(37,99,235,0.1)",  dot:"#2563EB"},
  "Hébergement":    {bg:"rgba(139,92,246,0.1)", dot:"#8B5CF6"},
  "Matériel":       {bg:"rgba(20,184,166,0.1)", dot:"#0D9488"},
  "Logiciel":       {bg:"rgba(99,102,241,0.1)", dot:"#6366F1"},
  "Formation":      {bg:"rgba(22,163,74,0.1)",  dot:"#16A34A"},
  "Téléphone":      {bg:"rgba(14,165,233,0.1)", dot:"#0EA5E9"},
  "Internet":       {bg:"rgba(14,165,233,0.1)", dot:"#0EA5E9"},
  "Fournitures":    {bg:"rgba(107,114,128,0.1)",dot:"#6B7280"},
  "Sous-traitance": {bg:"rgba(245,158,11,0.1)", dot:"#D97706"},
};
const fraisColor=(t:string, ov:Record<string,string>={})=>{
  const dot=ov[t]||FRAIS_COLORS[t]?.dot||"#9CA3AF";
  const r=parseInt(dot.slice(1,3),16)||156, g=parseInt(dot.slice(3,5),16)||163, b=parseInt(dot.slice(5,7),16)||175;
  return {bg:`rgba(${r},${g},${b},0.1)`,dot};
};
function TypePill({type,dot,bg}:{type:string,dot:string,bg:string}) {
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,background:bg,color:dot,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,whiteSpace:"nowrap",letterSpacing:"0.1px"}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:dot,flexShrink:0,display:"inline-block"}}/>
      {type}
    </span>
  );
}

const inp: React.CSSProperties = {background:"#F9FAFB",border:`1.5px solid ${border}`,borderRadius:10,padding:"12px 16px",color:text,fontSize:15,outline:"none",fontFamily:"'Inter',sans-serif",width:"100%",transition:"border-color 0.15s"};
const sel: React.CSSProperties = {...inp,appearance:"none" as const,backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%234B5563' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 16px center"};
const btnP: React.CSSProperties = {background:ocean,color:"#fff",border:"none",borderRadius:50,padding:"10px 22px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif",letterSpacing:"0.1px",whiteSpace:"nowrap"};
const btnG: React.CSSProperties = {background:"transparent",border:`1.5px solid ${border}`,borderRadius:50,padding:"10px 22px",color:text2,fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif"};
const card: React.CSSProperties = {background:"#FFF",border:`1px solid ${border}`,borderRadius:16,boxShadow:"0 1px 2px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.05)"};
const iconBtn = (danger=false): React.CSSProperties => ({background:danger?"rgba(192,98,42,0.08)":"rgba(75,85,99,0.07)",border:"none",borderRadius:8,width:34,height:34,color:danger?basque:text2,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0});

// ─── Shared UI ───
function Label({children}: {children:React.ReactNode}) {
  return <label style={{fontSize:12,color:text2,fontWeight:600,letterSpacing:"0.5px",textTransform:"uppercase",display:"block",marginBottom:6}}>{children}</label>;
}
function Field({label,children}: {label:string,children:React.ReactNode}) {
  return <div style={{display:"flex",flexDirection:"column",gap:0}}><Label>{label}</Label>{children}</div>;
}
function SectionHead({title,sub,action}: {title:string,sub?:string,action?:React.ReactNode}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
      <div>
        <h2 style={{margin:0,fontSize:24,fontFamily:serif,fontWeight:400,color:text,letterSpacing:"-0.2px"}}>{title}</h2>
        {sub&&<p style={{margin:"5px 0 0",fontSize:13,color:text3}}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
function Empty({label}: {label:string}) {
  return (
    <div style={{textAlign:"center",padding:"48px 24px"}}>
      <div style={{fontSize:28,opacity:0.15,marginBottom:10}}>—</div>
      <p style={{margin:0,fontSize:13,color:text3}}>{label}</p>
    </div>
  );
}
function Modal({title,onClose,children}: {title:string,onClose:()=>void,children:React.ReactNode}) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(45,52,54,0.4)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{...card,padding:"36px 32px",width:"100%",maxWidth:460,maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
          <h3 style={{margin:0,color:text,fontSize:20,fontFamily:serif,fontWeight:400}}>{title}</h3>
          <button onClick={onClose} style={{background:"#F2EFE9",border:"none",color:text2,borderRadius:50,width:32,height:32,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function FA({onClose,onSubmit,isEdit}: {onClose:()=>void,onSubmit:()=>void,isEdit:boolean}) {
  return (
    <div style={{display:"flex",gap:10,marginTop:12}}>
      <button onClick={onClose} style={btnG}>Annuler</button>
      <button onClick={onSubmit} style={btnP}>{isEdit?"Enregistrer":"Ajouter"}</button>
    </div>
  );
}

// ─── Perso Forms ───
function RecurringForm({initial,onSubmit,onClose,title}: any) {
  const [name,setName]=useState(initial?.name||"");
  const [amount,setAmt]=useState(initial?.amount||"");
  const [cat,setCat]=useState(initial?.category||EXPENSE_CATS[0]);
  const go=()=>{if(!name||!amount)return;onSubmit({...(initial||{}),name,amount:parseFloat(amount),category:cat})};
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Nom"><input value={name} onChange={e=>setName(e.target.value)} placeholder="ex : Loyer" style={inp}/></Field>
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
        <Field label="Catégorie"><select value={cat} onChange={e=>setCat(e.target.value)} style={sel}>{EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
        <FA onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function ExpenseForm({initial,onSubmit,onClose,title}: any) {
  const [name,setName]=useState(initial?.name||"");
  const [amount,setAmt]=useState(initial?.amount||"");
  const [cat,setCat]=useState(initial?.category||EXPENSE_CATS[0]);
  const [date,setDate]=useState(initial?.date||new Date().toISOString().slice(0,10));
  const go=()=>{if(!name||!amount)return;onSubmit({...(initial||{}),name,amount:parseFloat(amount),category:cat,date})};
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Nom"><input value={name} onChange={e=>setName(e.target.value)} placeholder="ex : Restaurant" style={inp}/></Field>
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
        <Field label="Catégorie"><select value={cat} onChange={e=>setCat(e.target.value)} style={sel}>{EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></Field>
        <FA onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function IncomeForm({initial,onSubmit,onClose,title}: any) {
  const [type,setType]=useState(initial?.type||INCOME_TYPES[0]);
  const [custom,setCustom]=useState("");
  const [amount,setAmt]=useState(initial?.amount||"");
  const go=()=>{if(!amount)return;onSubmit({...(initial||{}),type:type==="Autre"&&custom?custom:type,amount:parseFloat(amount)})};
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Source"><select value={type} onChange={e=>setType(e.target.value)} style={sel}>{INCOME_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
        {type==="Autre"&&<Field label="Préciser"><input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="ex : Bonus" style={inp}/></Field>}
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
        <FA onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function SavingForm({initial,onSubmit,onClose,title}: any) {
  const [name,setName]=useState(initial?.name||"");
  const [amount,setAmt]=useState(initial?.amount||"");
  const [type,setType]=useState(initial?.type||SAVINGS_TYPES[0]);
  const [loc,setLoc]=useState(initial?.location||"");
  const go=()=>{if(!name||!amount)return;onSubmit({...(initial||{}),name,amount:parseFloat(amount),type,location:loc})};
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Nom"><input value={name} onChange={e=>setName(e.target.value)} placeholder="ex : Épargne vacances" style={inp}/></Field>
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
        <Field label="Type"><select value={type} onChange={e=>setType(e.target.value)} style={sel}>{SAVINGS_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label="Emplacement"><input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="ex : Boursorama" style={inp}/></Field>
        <FA onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}

// ─── Pro Forms ───
function EntryForm({initial,onSubmit,onClose,title,defaultYear,caMonths=[]}: any) {
  const [type,setType]   = useState(initial?.type||"");
  const [amount,setAmt]  = useState(initial?.amount||"");
  const [date,setDate]   = useState(initial?.date||new Date().toISOString().slice(0,10));
  const [exYear,setExYear] = useState(initial?.exercise_year??defaultYear??2026);
  const [caMk,setCaMk]   = useState(initial?.ca_month_key||"");
  const go=()=>{if(!type||!amount)return;onSubmit({...(initial||{}),type,amount:parseFloat(amount),date,exercise_year:Number(exYear),ca_month_key:caMk||null})};
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Type / Origine">
          <input list="entry-type-list" value={type} onChange={e=>setType(e.target.value)} placeholder="ex : Paiement facture janvier" style={inp}/>
          <datalist id="entry-type-list">{ENTRY_SUGGESTIONS.map(t=><option key={t} value={t}/>)}</datalist>
        </Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Montant TTC (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
          <Field label="Exercice comptable">
            <select value={exYear} onChange={e=>setExYear(e.target.value)} style={sel}>
              {[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Date de réception"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></Field>
        <Field label="CA facturé correspondant">
          <select value={caMk} onChange={e=>setCaMk(e.target.value)} style={sel}>
            <option value="">— Encaissement non lié —</option>
            <option value={`exercice-${(defaultYear??2026)-1}`}>Exercice {(defaultYear??2026)-1} (précédent)</option>
            {caMonths.map((m:any)=><option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
        </Field>
        <FA onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function ExitForm({initial,onSubmit,onClose,title,defaultYear,defaultMk}: any) {
  const [cat,setCat]         = useState(initial?.category||EXIT_CATS[0]);
  const [label,setLabel]     = useState(initial?.label||"");
  const [amount,setAmt]      = useState(initial?.amount||"");
  const [date,setDate]       = useState(initial?.date||new Date().toISOString().slice(0,10));
  const [exYear,setExYear]   = useState(initial?.exercise_year??defaultYear??2026);
  const [imputMk,setImputMk] = useState(initial?.imputation_month_key||defaultMk||"");
  const go=()=>{
    if(!amount)return;
    onSubmit({...(initial||{}),category:cat,label,amount:parseFloat(amount),date,exercise_year:Number(exYear),imputation_month_key:imputMk||null});
  };
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Catégorie"><select value={cat} onChange={e=>setCat(e.target.value)} style={sel}>{EXIT_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Libellé (optionnel)"><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="ex : TVA novembre 2025" style={inp}/></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
          <Field label="Exercice comptable">
            <select value={exYear} onChange={e=>setExYear(e.target.value)} style={sel}>
              {[2025,2026,2027].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Date de paiement"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></Field>
          <Field label="Mois comptable">
            <input type="month" value={imputMk} onChange={e=>setImputMk(e.target.value)} style={inp} title="Mois auquel cette sortie est rattachée dans le bilan"/>
          </Field>
        </div>
        {imputMk&&imputMk!==defaultMk&&(
          <div style={{background:"rgba(160,132,92,0.08)",borderRadius:10,padding:"10px 14px",fontSize:12,color:amber}}>
            Imputée sur <strong>{imputMk}</strong> dans le bilan — payée le {date}
          </div>
        )}
        <FA onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function RecurringFraisForm({initial,onSubmit,onClose,title,fraisTypes=[]}: any) {
  const [type,setType]=useState(initial?.type||"");
  const [label,setLabel]=useState(initial?.label||"");
  const [amount,setAmt]=useState(initial?.amount_ttc||"");
  const [day,setDay]=useState(initial?.prelevement_day!=null?String(initial.prelevement_day):"");
  const go=()=>{if(!type||!amount)return;onSubmit({...(initial||{}),type,label,amount_ttc:parseFloat(amount),prelevement_day:day?parseInt(day):null})};
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Type">
          <input list="rec-frais-type-list" value={type} onChange={e=>setType(e.target.value)} placeholder="ex : Abonnement logiciel" style={inp}/>
          <datalist id="rec-frais-type-list">{fraisTypes.map((t:string)=><option key={t} value={t}/>)}</datalist>
        </Field>
        <Field label="Libellé"><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="ex : Notion Pro" style={inp}/></Field>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
          <Field label="Montant TTC mensuel (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
          <Field label="Jour de prélèvement"><input type="number" min="1" max="31" value={day} onChange={e=>setDay(e.target.value)} placeholder="ex : 5" style={inp}/></Field>
        </div>
        <FA onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function FraisForm({initial,onSubmit,onClose,title,fraisTypes=[]}: any) {
  const [type,setType]=useState(initial?.type||"");
  const [label,setLabel]=useState(initial?.label||"");
  const [amount,setAmt]=useState(initial?.amount_ttc||"");
  const [date,setDate]=useState(initial?.date||new Date().toISOString().slice(0,10));
  const go=()=>{if(!type||!amount)return;onSubmit({...(initial||{}),type,label,amount_ttc:parseFloat(amount),date})};
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Type">
          <input list="frais-type-list" value={type} onChange={e=>setType(e.target.value)} placeholder="ex : Repas client" style={inp}/>
          <datalist id="frais-type-list">{fraisTypes.map((t:string)=><option key={t} value={t}/>)}</datalist>
        </Field>
        <Field label="Libellé"><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="ex : Déjeuner avec M. Dupont" style={inp}/></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Montant TTC (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
          <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></Field>
        </div>
        <FA onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function InitBalanceModal({current,onSubmit,onClose}: any) {
  const [bal,setBal]=useState(current?.initial_balance!=null?String(current.initial_balance):"");
  const go=()=>onSubmit(parseFloat(bal)||0);
  return (
    <Modal title="Solde initial" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <p style={{margin:0,fontSize:14,color:text2,lineHeight:1.6}}>Saisissez le solde total de vos comptes professionnels au <strong>01/01/2026</strong>. Ce montant sert de point de départ au calcul de la trésorerie.</p>
        <Field label="Solde au 01/01/2026 (€)"><input type="number" value={bal} onChange={e=>setBal(e.target.value)} placeholder="ex : 25000" style={inp}/></Field>
        <FA onClose={onClose} onSubmit={go} isEdit={true}/>
      </div>
    </Modal>
  );
}


// ─── Login ───
function LoginScreen({onLogin}: any) {
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [loginMode,setLM]=useState<"login"|"register">("login");
  const [err,setErr]=useState("");
  const [msg,setMsg]=useState("");
  const [busy,setBusy]=useState(false);
  const submit=async()=>{
    if(!email||!pass){setErr("Remplissez tous les champs");return}
    setBusy(true);setErr("");setMsg("");
    if(loginMode==="register"){
      const {error}=await supabase.auth.signUp({email,password:pass});
      if(error){setErr(error.message);setBusy(false);return}
      setMsg("Vérifiez votre email pour confirmer votre inscription.");
    }else{
      const {data,error}=await supabase.auth.signInWithPassword({email,password:pass});
      if(error){setErr(error.message);setBusy(false);return}
      onLogin(data.session);
    }
    setBusy(false);
  };
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:13,color:text3,fontWeight:500,letterSpacing:"2px",textTransform:"uppercase",marginBottom:16}}>Kontu</div>
          <h1 style={{fontFamily:serif,fontSize:36,color:text,margin:0,fontWeight:400,letterSpacing:"-0.5px",lineHeight:1.15}}>{loginMode==="login"?"Bon retour.":"Créer un compte."}</h1>
          <p style={{color:text3,fontSize:14,marginTop:10}}>{loginMode==="login"?"Connectez-vous à votre espace":"Commencez à suivre vos finances"}</p>
        </div>
        <div style={{...card,padding:"36px 32px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Adresse e-mail" type="email" onKeyDown={e=>e.key==="Enter"&&submit()} style={inp}/>
            <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="Mot de passe" type="password" onKeyDown={e=>e.key==="Enter"&&submit()} style={inp}/>
            {err&&<p style={{color:basque,fontSize:13,margin:0}}>{err}</p>}
            {msg&&<p style={{color:sage,fontSize:13,margin:0}}>{msg}</p>}
            <button onClick={submit} disabled={busy} style={{...btnP,padding:"13px",fontSize:15,width:"100%",marginTop:4,opacity:busy?0.6:1,borderRadius:12}}>{busy?"...":(loginMode==="login"?"Se connecter":"Créer le compte")}</button>
          </div>
        </div>
        <button onClick={()=>{setLM(loginMode==="login"?"register":"login");setErr("");setMsg("")}} style={{background:"none",border:"none",color:text2,fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif",padding:"16px 0",width:"100%",textAlign:"center"}}>
          {loginMode==="login"?"Pas encore de compte ? Inscrivez-vous →":"Déjà un compte ? Connectez-vous"}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ───
export default function Home() {
  const [session,setSession]   = useState<any>(null);
  const [loading,setLoading]   = useState(true);
  const [year,setYear]         = useState(new Date().getFullYear());
  const [month,setMonth]       = useState(new Date().getMonth());
  const [tab,setTab]           = useState("dashboard");
  const [proTab,setProTab]     = useState("pro-mouvements");
  const [modal,setModal]       = useState<string|null>(null);
  const [editItem,setEditItem] = useState<any>(null);
  const [caDeclareDraft,setCaDeclareDraft] = useState<string>("");
  const [appMode,setAppMode]   = useState<"perso"|"pro">("perso");
  const [fraisColorOverrides,setFraisColorOverrides] = useState<Record<string,string>>(()=>{
    try{return JSON.parse(localStorage.getItem("fraisColors")||"{}")}catch{return{}}
  });
  const updateFraisColor=(type:string,color:string)=>{
    const next={...fraisColorOverrides,[type]:color};
    setFraisColorOverrides(next);
    localStorage.setItem("fraisColors",JSON.stringify(next));
  };

  // Perso data
  const [recurring,setRecurring] = useState<any[]>([]);
  const [expenses,setExpenses]   = useState<any[]>([]);
  const [incomes,setIncomes]     = useState<any[]>([]);
  const [savings,setSavings]     = useState<any[]>([]);

  // Pro data
  const [proEntries,setProEntries]   = useState<any[]>([]);
  const [proExits,setProExits]       = useState<any[]>([]);
  const [allEntries,setAllEntries]   = useState<any[]>([]);
  const [allExits,setAllExits]       = useState<any[]>([]);
  const [proTreasury,setProTreasury] = useState<any>(null);
  const [proForecast,setProForecast] = useState<any[]>([]);
  const [proFrais,setProFrais]             = useState<any[]>([]);
  const [proRecurringFrais,setProRecurringFrais]       = useState<any[]>([]);
  const [proRecurringFraisSkips,setProRecurringFraisSkips] = useState<any[]>([]);

  const mk     = monthKey(year,month);
  const userId = session?.user?.id;

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setLoading(false)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  const loadPrefs=useCallback(async()=>{
    if(!userId)return;
    const {data}=await supabase.from("user_preferences").select("mode").eq("user_id",userId).maybeSingle();
    if(data?.mode)setAppMode(data.mode);
  },[userId]);

  const loadData=useCallback(async()=>{
    if(!userId)return;
    const [{data:rec},{data:exp},{data:inc},{data:sav}]=await Promise.all([
      supabase.from("recurring_expenses").select("*").eq("user_id",userId).order("created_at"),
      supabase.from("one_time_expenses").select("*").eq("user_id",userId).eq("month_key",mk).order("date"),
      supabase.from("income").select("*").eq("user_id",userId).eq("month_key",mk).order("created_at"),
      supabase.from("savings").select("*").eq("user_id",userId).order("created_at"),
    ]);
    setRecurring(rec||[]);setExpenses(exp||[]);setIncomes(inc||[]);setSavings(sav||[]);
  },[userId,mk]);

  const loadProData=useCallback(async()=>{
    if(!userId)return;
    const yearKeys=Array.from({length:12},(_,i)=>monthKey(year,i));
    const [{data:ent},{data:ext},{data:aEnt},{data:aExt},{data:trea},{data:fcast},{data:frais},{data:recFrais},{data:recSkips}]=await Promise.all([
      supabase.from("pro_entries").select("*").eq("user_id",userId).eq("month_key",mk).order("date"),
      supabase.from("pro_exits").select("*").eq("user_id",userId).eq("month_key",mk).order("date"),
      supabase.from("pro_entries").select("*").eq("user_id",userId).in("month_key",yearKeys),
      supabase.from("pro_exits").select("*").eq("user_id",userId).in("month_key",yearKeys),
      supabase.from("pro_treasury").select("*").eq("user_id",userId).maybeSingle(),
      supabase.from("pro_forecast").select("*").eq("user_id",userId).in("month_key",yearKeys),
      supabase.from("pro_frais").select("*").eq("user_id",userId).in("month_key",yearKeys).order("date"),
      supabase.from("pro_recurring_frais").select("*").eq("user_id",userId).order("created_at"),
      supabase.from("pro_recurring_frais_skips").select("*").eq("user_id",userId).in("month_key",yearKeys),
    ]);
    setProEntries(ent||[]);setProExits(ext||[]);
    setAllEntries(aEnt||[]);setAllExits(aExt||[]);
    setProTreasury(trea||null);
    setProForecast((fcast as any)||[]);
    setProFrais((frais as any)||[]);
    setProRecurringFrais((recFrais as any)||[]);
    setProRecurringFraisSkips((recSkips as any)||[]);
  },[userId,mk,year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{
    if(!userId)return;
    loadPrefs();loadData();loadProData();
  },[userId,mk]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{
    const fc=proForecast.find((f:any)=>f.month_key===mk);
    setCaDeclareDraft(fc?.ca_declare?String(fc.ca_declare):"");
  },[mk,proForecast]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMode=async(m:"perso"|"pro")=>{
    setAppMode(m);
    if(m==="pro"){setYear(2026);setMonth(0);}
    await supabase.from("user_preferences").upsert({user_id:userId,mode:m},{onConflict:"user_id"});
  };

  // Perso computed
  const persoC=useMemo(()=>{
    const totalRecurring=recurring.reduce((s,r)=>s+Number(r.amount),0);
    const totalOneTime=expenses.reduce((s,e)=>s+Number(e.amount),0);
    const totalSpent=totalRecurring+totalOneTime;
    const totalSavings=savings.reduce((s,e)=>s+Number(e.amount),0);
    const budget=incomes.reduce((s,i)=>s+Number(i.amount),0);
    return {totalRecurring,totalOneTime,totalSpent,totalSavings,budget,remaining:budget-totalSpent};
  },[recurring,expenses,incomes,savings]);

  // Pro monthly computed
  const proC=useMemo(()=>{
    const currentEntries=proEntries.filter(e=>!e.exercise_year||e.exercise_year===year);
    const currentExits=proExits.filter(e=>!e.exercise_year||e.exercise_year===year);
    const bycat=(cat: string)=>currentExits.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.amount),0);
    const totalEntrees=currentEntries.reduce((s,e)=>s+Number(e.amount),0);
    const totalSorties=currentExits.reduce((s,e)=>s+Number(e.amount),0);
    const tvaCalc=totalEntrees/6;
    const tvaReelle=bycat("TVA");
    const frais=bycat("Frais pro");
    const salaire=bycat("Salaire");
    const per=bycat("PER / Assurance vie");
    const chargesPay=bycat("Charges sociales");
    const chargesCalc=0.45*(salaire+per);
    const divers=bycat("Divers");
    const isReel=bycat("Impôt société");
    const totalDepenses=frais+salaire+per+chargesPay+divers+isReel;
    const benefice=totalEntrees/1.2-frais-chargesPay-salaire;
    return {totalEntrees,totalSorties,netMois:totalEntrees-totalSorties,tvaCalc,tvaReelle,frais,salaire,per,chargesPay,chargesCalc,totalDepenses,benefice,is:Math.max(0,benefice*0.15)};
  },[proEntries,proExits]);

  // Helper pour construire les lignes annuelles
  const buildAnnual=(filterExercise: boolean)=>{
    const initBal=filterExercise?0:(proTreasury?.initial_balance||0);
    let cum=initBal;
    return Array.from({length:12},(_,i)=>{
      const k=monthKey(year,i);
      const ents=allEntries.filter(e=>e.month_key===k&&(!filterExercise||!e.exercise_year||e.exercise_year===year));
      const exts=allExits.filter(e=>{
        const effMk=filterExercise?(e.imputation_month_key||e.month_key):e.month_key;
        const exOk=!filterExercise||!e.exercise_year||e.exercise_year===year;
        return effMk===k&&exOk;
      });
      const bycat=(cat: string)=>exts.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.amount),0);
      const caTTC=filterExercise
        ?(proForecast.find((f:any)=>f.month_key===k)?.ca_declare||0)
        :ents.reduce((s,e)=>s+Number(e.amount),0);
      const tvaCalc=caTTC/6;
      const tvaReelle=bycat("TVA");
      const frais=bycat("Frais pro");
      const salaire=bycat("Salaire");
      const per=bycat("PER / Assurance vie");
      const chargesPay=bycat("Charges sociales");
      const chargesCalc=0.45*(salaire+per);
      const divers=bycat("Divers");
      const isReel=bycat("Impôt société");
      const totalDepenses=frais+salaire+per+chargesPay+divers+isReel;
      const benefice=caTTC/1.2-frais-chargesPay-salaire;
      const is=Math.max(0,benefice*0.15);
      const totalSorties=exts.reduce((s,e)=>s+Number(e.amount),0);
      const tresoMois=caTTC-totalSorties;
      cum+=tresoMois;
      const hasData=filterExercise?(caTTC>0||exts.length>0):(ents.length>0||exts.length>0);
      return {label:MONTHS_S[i],k,caTTC,tvaCalc,tvaReelle,frais,salaire,per,chargesPay,chargesCalc,totalDepenses,benefice,is,isReel,tresoMois,tresoTotale:cum,hasData};
    });
  };
  // Bilan annuel : filtré par exercice comptable, CA = facturé (pro_forecast.ca_declare)
  const proAnnual=useMemo(()=>buildAnnual(true),[allEntries,allExits,proTreasury,proForecast,year]); // eslint-disable-line react-hooks/exhaustive-deps
  // Trésorerie : tous les mouvements réels (sans filtre exercice)
  const proTresoAnnual=useMemo(()=>buildAnnual(false),[allEntries,allExits,proTreasury,year]); // eslint-disable-line react-hooks/exhaustive-deps


  // ─── Perso CRUD ───
  const addRecurring  = async(i: any)=>{await supabase.from("recurring_expenses").insert({user_id:userId,name:i.name,amount:i.amount,category:i.category});loadData();setModal(null)};
  const editRecurring = async(i: any)=>{await supabase.from("recurring_expenses").update({name:i.name,amount:i.amount,category:i.category}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delRecurring  = async(id: string)=>{await supabase.from("recurring_expenses").delete().eq("id",id);loadData()};
  const addExpense    = async(i: any)=>{await supabase.from("one_time_expenses").insert({user_id:userId,month_key:mk,name:i.name,amount:i.amount,category:i.category,date:i.date});loadData();setModal(null)};
  const editExpense   = async(i: any)=>{await supabase.from("one_time_expenses").update({name:i.name,amount:i.amount,category:i.category,date:i.date}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delExpense    = async(id: string)=>{await supabase.from("one_time_expenses").delete().eq("id",id);loadData()};
  const addIncome     = async(i: any)=>{await supabase.from("income").insert({user_id:userId,month_key:mk,type:i.type,amount:i.amount});loadData();setModal(null)};
  const editIncome    = async(i: any)=>{await supabase.from("income").update({type:i.type,amount:i.amount}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delIncome     = async(id: string)=>{await supabase.from("income").delete().eq("id",id);loadData()};
  const addSaving     = async(i: any)=>{await supabase.from("savings").insert({user_id:userId,name:i.name,amount:i.amount,type:i.type,location:i.location});loadData();setModal(null)};
  const editSaving    = async(i: any)=>{await supabase.from("savings").update({name:i.name,amount:i.amount,type:i.type,location:i.location}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delSaving     = async(id: string)=>{await supabase.from("savings").delete().eq("id",id);loadData()};

  // ─── Pro CRUD ───
  const addEntry    = async(i: any)=>{
    const {error}=await supabase.from("pro_entries").insert({user_id:userId,month_key:mk,type:i.type,amount:i.amount,date:i.date,exercise_year:i.exercise_year,ca_month_key:i.ca_month_key||null});
    if(error){console.error("addEntry:",error.message);alert("Erreur: "+error.message);return;}
    loadProData();setModal(null);
  };
  const editEntry   = async(i: any)=>{
    const {error}=await supabase.from("pro_entries").update({type:i.type,amount:i.amount,date:i.date,exercise_year:i.exercise_year,ca_month_key:i.ca_month_key||null}).eq("id",i.id);
    if(error){console.error("editEntry:",error.message);alert("Erreur: "+error.message);return;}
    loadProData();setModal(null);setEditItem(null);
  };
  const delEntry    = async(id: string)=>{await supabase.from("pro_entries").delete().eq("id",id);loadProData()};
  const addExit     = async(i: any)=>{await supabase.from("pro_exits").insert({user_id:userId,month_key:mk,category:i.category,label:i.label,amount:i.amount,date:i.date,exercise_year:i.exercise_year,imputation_month_key:i.imputation_month_key||mk});loadProData();setModal(null)};
  const editExit    = async(i: any)=>{await supabase.from("pro_exits").update({category:i.category,label:i.label,amount:i.amount,date:i.date,exercise_year:i.exercise_year,imputation_month_key:i.imputation_month_key||i.month_key}).eq("id",i.id);loadProData();setModal(null);setEditItem(null)};
  const delExit     = async(id: string)=>{await supabase.from("pro_exits").delete().eq("id",id);loadProData()};
  const saveInitBal = async(bal: number)=>{
    await supabase.from("pro_treasury").upsert({user_id:userId,initial_balance:bal,balance:bal,alert_threshold:proTreasury?.alert_threshold||0},{onConflict:"user_id"});
    loadProData();setModal(null);
  };
  const saveCaDeclare=async()=>{
    if(!userId)return;
    const existing=proForecast.find((f:any)=>f.month_key===mk)||{};
    const {id:_i,created_at:_c,...rest}=existing as any;
    const {error}=await supabase.from("pro_forecast").upsert({...rest,user_id:userId,month_key:mk,ca_declare:parseFloat(caDeclareDraft)||0},{onConflict:"user_id,month_key"});
    if(error){console.error("saveCaDeclare error:",error.message);return;}
    loadProData();
  };
  const syncFraisExit=async(targetMk: string)=>{
    if(!userId)return;
    const [{data:fraisData},{data:recFraisData},{data:skipsData}]=await Promise.all([
      supabase.from("pro_frais").select("amount_ttc").eq("user_id",userId).eq("month_key",targetMk),
      supabase.from("pro_recurring_frais").select("id,amount_ttc").eq("user_id",userId),
      supabase.from("pro_recurring_frais_skips").select("recurring_frais_id").eq("user_id",userId).eq("month_key",targetMk),
    ]);
    const totalOneTime=(fraisData||[]).reduce((s:number,f:any)=>s+Number(f.amount_ttc),0);
    const skippedIds=new Set((skipsData||[]).map((s:any)=>s.recurring_frais_id));
    const totalRecurring=(recFraisData||[]).filter((r:any)=>!skippedIds.has(r.id)).reduce((s:number,r:any)=>s+Number(r.amount_ttc),0);
    const total=totalOneTime+totalRecurring;
    await supabase.from("pro_exits").delete().eq("user_id",userId).eq("month_key",targetMk).eq("label","__frais_auto__");
    if(total>0){
      const yr=parseInt(targetMk.split("-")[0]);
      await supabase.from("pro_exits").insert({user_id:userId,month_key:targetMk,category:"Frais pro",label:"__frais_auto__",amount:total,date:`${targetMk}-01`,exercise_year:yr,imputation_month_key:targetMk});
    }
  };
  const syncAllMonths=async()=>{
    await Promise.all(Array.from({length:12},(_,i)=>monthKey(year,i)).map(k=>syncFraisExit(k)));
  };
  const addFrais=async(i: any)=>{
    const {error}=await supabase.from("pro_frais").insert({user_id:userId,month_key:mk,type:i.type,label:i.label||"",amount_ttc:i.amount_ttc,date:i.date});
    if(error){console.error("addFrais:",error.message);alert("Erreur: "+error.message);return;}
    await syncFraisExit(mk);
    loadProData();setModal(null);
  };
  const editFrais=async(i: any)=>{
    const {error}=await supabase.from("pro_frais").update({type:i.type,label:i.label||"",amount_ttc:i.amount_ttc,date:i.date}).eq("id",i.id);
    if(error){console.error("editFrais:",error.message);alert("Erreur: "+error.message);return;}
    await syncFraisExit(i.month_key||mk);
    loadProData();setModal(null);setEditItem(null);
  };
  const delFrais=async(id: string,targetMk: string)=>{
    await supabase.from("pro_frais").delete().eq("id",id);
    await syncFraisExit(targetMk);
    loadProData();
  };
  const addRecurringFrais=async(i: any)=>{
    const {error}=await supabase.from("pro_recurring_frais").insert({user_id:userId,type:i.type,label:i.label||"",amount_ttc:i.amount_ttc,prelevement_day:i.prelevement_day??null});
    if(error){console.error("addRecurringFrais:",error.message);alert("Erreur: "+error.message);return;}
    await syncAllMonths();
    loadProData();setModal(null);
  };
  const editRecurringFrais=async(i: any)=>{
    const {error}=await supabase.from("pro_recurring_frais").update({type:i.type,label:i.label||"",amount_ttc:i.amount_ttc,prelevement_day:i.prelevement_day??null}).eq("id",i.id);
    if(error){console.error("editRecurringFrais:",error.message);alert("Erreur: "+error.message);return;}
    await syncAllMonths();
    loadProData();setModal(null);setEditItem(null);
  };
  const delRecurringFrais=async(id: string)=>{
    await supabase.from("pro_recurring_frais").delete().eq("id",id);
    await supabase.from("pro_recurring_frais_skips").delete().eq("recurring_frais_id",id);
    await syncAllMonths();
    loadProData();
  };
  const skipRecurringFrais=async(recurringId: string)=>{
    await supabase.from("pro_recurring_frais_skips").insert({user_id:userId,recurring_frais_id:recurringId,month_key:mk});
    await syncFraisExit(mk);
    loadProData();
  };
  const unskipRecurringFrais=async(recurringId: string)=>{
    await supabase.from("pro_recurring_frais_skips").delete().eq("user_id",userId).eq("recurring_frais_id",recurringId).eq("month_key",mk);
    await syncFraisExit(mk);
    loadProData();
  };
  const closeModal=()=>{setModal(null);setEditItem(null)};
  const prevMonth=()=>{
    if(appMode==="pro"&&year===2026&&month===0)return;
    if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1);
  };
  const nextMonth=()=>{if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1)};

  if(loading)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:text3}}>Chargement…</div>;
  if(!session)return<LoginScreen onLogin={setSession}/>;

  const persoTabs=[
    {id:"dashboard", label:"Vue d'ensemble"},
    {id:"income",    label:"Revenus"},
    {id:"recurring", label:"Récurrentes"},
    {id:"expenses",  label:"Ponctuelles"},
    {id:"savings",   label:"Épargne"},
  ];
  const proTabs=[
    {id:"pro-mouvements",       label:"Suivi mensuel"},
    {id:"pro-annual",           label:"Bilan annuel"},
    {id:"pro-tresorerie",       label:"Trésorerie"},
    {id:"pro-frais-recurrents", label:"Frais récurrents"},
  ];
  const activeTabs   = appMode==="perso"?persoTabs:proTabs;
  const activeTab    = appMode==="perso"?tab:proTab;
  const setActiveTab = appMode==="perso"?setTab:setProTab;

  const kpis=[
    {label:"Revenus du mois",  value:fmt(persoC.budget),       color:ocean,                           sub:incomes.length?`${incomes.length} source${incomes.length>1?"s":""}` :"Aucun revenu saisi"},
    {label:"Total dépensé",    value:fmt(persoC.totalSpent),    color:basque,                          sub:`Récurrent ${fmt(persoC.totalRecurring)} · Ponctuel ${fmt(persoC.totalOneTime)}`},
    {label:"Reste disponible", value:fmt(persoC.remaining),     color:persoC.remaining>=0?sage:basque, sub:persoC.remaining>=0?"En bonne voie":"Dépassement"},
    {label:"Épargne totale",   value:fmt(persoC.totalSavings),  color:amber,                           sub:`${savings.length} placement${savings.length>1?"s":""}`},
  ];

  // Helper for small icon buttons
  const sm = (danger=false): React.CSSProperties => ({...iconBtn(danger),width:28,height:28,fontSize:12});
  // TypePill helper with user color overrides
  const pill = (type:string) => { const c=fraisColor(type,fraisColorOverrides); return <TypePill type={type} dot={c.dot} bg={c.bg}/>; };

  return (
    <div style={{minHeight:"100vh"}}>

      {/* ── Header ── */}
      <header style={{padding:"0 24px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(247,245,240,0.92)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${border}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:serif,fontSize:17,fontWeight:400,color:text,letterSpacing:"-0.2px"}}>Kontu</span>
          {appMode==="pro"&&<span style={{fontSize:11,color:text3,fontWeight:500,letterSpacing:"0.5px",borderLeft:`1px solid ${border}`,paddingLeft:12}}>Curutchet Consulting</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{display:"flex",background:"#EDEAE3",borderRadius:50,padding:3,gap:2}}>
            {(["perso","pro"] as const).map(m=>(
              <button key={m} onClick={()=>toggleMode(m)} style={{background:appMode===m?ocean:"transparent",color:appMode===m?"#fff":text2,border:"none",borderRadius:50,padding:"6px 14px",fontSize:12,fontWeight:appMode===m?600:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.15s",textTransform:"capitalize"}}>{m}</button>
            ))}
          </div>
          <span style={{fontSize:12,color:text3,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{session.user.email}</span>
          <button onClick={async()=>{await supabase.auth.signOut();setSession(null)}} style={{background:"none",border:"none",color:text2,fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif",padding:0}}>Déconnexion</button>
        </div>
      </header>

      {/* ── Month selector — perso only ── */}
      {appMode==="perso"&&(
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:28,padding:"36px 24px 20px"}}>
        <button onClick={prevMonth} style={{background:"none",border:"none",color:text3,fontSize:22,cursor:"pointer",padding:"6px 10px",lineHeight:1}}>‹</button>
        <div style={{textAlign:"center",minWidth:200}}>
          <div style={{fontFamily:serif,fontSize:30,fontWeight:400,color:text,lineHeight:1}}>{MONTHS_FR[month]}</div>
          <div style={{fontSize:13,color:text3,marginTop:6,letterSpacing:"0.5px"}}>{year}</div>
        </div>
        <button onClick={nextMonth} style={{background:"none",border:"none",color:text3,fontSize:22,cursor:"pointer",padding:"6px 10px",lineHeight:1}}>›</button>
      </div>
      )}

      {/* ── Tab nav — perso only ── */}
      {appMode==="perso"&&(
      <div className="tab-scroll" style={{overflowX:"auto",padding:"0 24px 20px",scrollbarWidth:"none"}}>
        <div style={{display:"flex",justifyContent:"center"}}>
          <div style={{display:"flex",gap:4,background:"#EDEAE3",borderRadius:50,padding:"5px",flexShrink:0}}>
            {persoTabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?ocean:"transparent",color:tab===t.id?"#fff":text2,border:"none",borderRadius:50,padding:"9px 18px",fontSize:13,fontWeight:tab===t.id?600:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.15s"}}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* ── Content ── */}
      <div style={appMode==="perso"?{padding:"0 20px 64px",maxWidth:1500,margin:"0 auto"}:{display:"flex",alignItems:"flex-start",minHeight:"calc(100vh - 60px)"}}>
        {/* Pro sidebar */}
        {appMode==="pro"&&(
          <nav style={{width:220,flexShrink:0,background:"#FAFAF7",borderRight:`1px solid ${border}`,position:"sticky",top:60,height:"calc(100vh - 60px)",overflowY:"auto",padding:"28px 0",display:"flex",flexDirection:"column",gap:1}}>
            <div style={{padding:"0 20px 14px",fontSize:10,color:text3,fontWeight:700,letterSpacing:"0.8px",textTransform:"uppercase"}}>Curutchet Consulting</div>
            {[
              {id:"pro-mouvements",       label:"Suivi mensuel"},
              {id:"pro-annual",           label:"Bilan annuel"},
              {id:"pro-tresorerie",       label:"Trésorerie"},
              {id:"pro-frais-recurrents", label:"Frais récurrents"},
            ].map(item=>(
              <button key={item.id} onClick={()=>setProTab(item.id)} style={{display:"block",width:"100%",textAlign:"left",padding:"12px 20px",border:"none",borderLeft:`3px solid ${proTab===item.id?ocean:"transparent"}`,background:proTab===item.id?"rgba(27,77,110,0.06)":"transparent",color:proTab===item.id?ocean:text2,fontWeight:proTab===item.id?600:400,fontSize:14,cursor:"pointer",fontFamily:"inherit",transition:"all 0.12s"}}>
                {item.label}
              </button>
            ))}
          </nav>
        )}
        {/* Inner content area */}
        <div style={appMode==="pro"?{flex:1,minWidth:0,padding:"32px 40px 64px"}:{}}>

        {/* ══ PERSO ══ */}
        {appMode==="perso"&&tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:32}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14}}>
              {kpis.map((k,i)=>(
                <div key={i} style={{...card,padding:"26px 22px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:k.color}}/>
                  <div style={{fontSize:11,color:text2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>{k.label}</div>
                  <div style={{fontSize:28,fontWeight:400,color:k.color,fontFamily:serif,lineHeight:1,letterSpacing:"-0.3px"}}>{k.value}</div>
                  <div style={{fontSize:12,color:text3,marginTop:10,lineHeight:1.5}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{...card,padding:"28px 26px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:20}}>
                <h3 style={{margin:0,fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>Revenus de {MONTHS_FR[month]}</h3>
                <button onClick={()=>setTab("income")} style={{background:"none",border:"none",color:ocean,fontSize:13,cursor:"pointer",fontFamily:"'Inter',sans-serif",fontWeight:500,padding:0}}>Gérer les revenus →</button>
              </div>
              {incomes.length===0?<p style={{margin:0,fontSize:14,color:text3}}>Aucun revenu enregistré ce mois-ci.</p>:
                <div style={{display:"flex",flexDirection:"column",gap:0}}>
                  {incomes.map((inc,i)=>(
                    <div key={inc.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<incomes.length-1?`1px solid #F2EFE9`:"none"}}>
                      <span style={{fontSize:14,color:text2}}>{inc.type}</span>
                      <span style={{fontSize:15,fontWeight:600,color:sage}}>{fmt(inc.amount)}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:14,marginTop:4}}>
                    <span style={{fontSize:13,color:text3,fontWeight:500}}>Total</span>
                    <span style={{fontSize:18,fontWeight:400,color:ocean,fontFamily:serif}}>{fmt(persoC.budget)}</span>
                  </div>
                </div>
              }
            </div>
            <div style={{...card,padding:"28px 26px"}}>
              <h3 style={{margin:"0 0 20px",fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>Répartition du budget</h3>
              {persoC.budget>0?(
                <>
                  <div style={{background:"#EDEAE3",borderRadius:50,height:8,overflow:"hidden",display:"flex",marginBottom:16}}>
                    <div style={{width:`${Math.min((persoC.totalRecurring/persoC.budget)*100,100)}%`,background:ocean,height:"100%",transition:"width 0.5s"}}/>
                    <div style={{width:`${Math.min((persoC.totalOneTime/persoC.budget)*100,100)}%`,background:basque,height:"100%",transition:"width 0.5s"}}/>
                  </div>
                  <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                    {[{color:ocean,label:"Récurrent",pct:(persoC.totalRecurring/persoC.budget)*100},{color:basque,label:"Ponctuel",pct:(persoC.totalOneTime/persoC.budget)*100},{color:"#D5E8C8",label:"Disponible",pct:Math.max(0,(persoC.remaining/persoC.budget)*100)}].map(l=>(
                      <div key={l.label} style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{width:10,height:10,borderRadius:2,background:l.color,display:"inline-block",flexShrink:0}}/>
                        <span style={{fontSize:12,color:text2}}>{l.label}</span>
                        <span style={{fontSize:12,color:text3,fontWeight:600}}>{l.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ):<p style={{margin:0,fontSize:14,color:text3}}>Ajoutez un revenu pour voir la répartition.</p>}
            </div>
            <div style={{...card,padding:"28px 26px"}}>
              <h3 style={{margin:"0 0 20px",fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>Dépenses par catégorie</h3>
              {(()=>{
                const all=[...recurring,...expenses];
                const cats:{[k:string]:number}={};
                all.forEach(e=>{cats[e.category]=(cats[e.category]||0)+Number(e.amount)});
                const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
                if(!sorted.length)return<p style={{margin:0,fontSize:14,color:text3}}>Aucune dépense ce mois.</p>;
                const max=sorted[0][1];
                return sorted.map(([cat,amt])=>(
                  <div key={cat} style={{marginBottom:16}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
                      <span style={{color:text}}>{cat}</span>
                      <span style={{color:text2,fontWeight:600}}>{fmt(amt)}</span>
                    </div>
                    <div style={{background:"#EDEAE3",borderRadius:50,height:5,overflow:"hidden"}}>
                      <div style={{width:`${(amt/max)*100}%`,background:ocean,height:"100%",borderRadius:50,transition:"width 0.5s"}}/>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {appMode==="perso"&&tab==="income"&&(
          <div>
            <SectionHead title="Revenus" sub={`${MONTHS_FR[month]} ${year} · Total : ${fmt(persoC.budget)}`} action={<button onClick={()=>setModal("addIncome")} style={btnP}>+ Ajouter</button>}/>
            {incomes.length===0?<Empty label="Aucun revenu ce mois"/>:
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {incomes.map(inc=>(
                  <div key={inc.id} className="row" style={{...card,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:3,height:28,borderRadius:2,background:sage,flexShrink:0}}/>
                      <span style={{fontSize:15,fontWeight:500,color:text}}>{inc.type}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16,fontWeight:600,color:sage,marginRight:8}}>{fmt(inc.amount)}</span>
                      <button onClick={()=>{setEditItem(inc);setModal("editIncome")}} style={iconBtn()}>✏</button>
                      <button onClick={()=>delIncome(inc.id)} style={iconBtn(true)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {appMode==="perso"&&tab==="recurring"&&(
          <div>
            <SectionHead title="Dépenses récurrentes" sub={`${fmt(persoC.totalRecurring)} / mois`} action={<button onClick={()=>setModal("addRecurring")} style={btnP}>+ Ajouter</button>}/>
            {recurring.length===0?<Empty label="Aucune dépense récurrente"/>:
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {recurring.map(r=>(
                  <div key={r.id} className="row" style={{...card,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:3,height:28,borderRadius:2,background:ocean,flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:15,fontWeight:500,color:text}}>{r.name}</div>
                        <div style={{fontSize:12,color:text3,marginTop:2}}>{r.category}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16,fontWeight:600,color:basque,marginRight:8}}>{fmt(r.amount)}</span>
                      <button onClick={()=>{setEditItem(r);setModal("editRecurring")}} style={iconBtn()}>✏</button>
                      <button onClick={()=>delRecurring(r.id)} style={iconBtn(true)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {appMode==="perso"&&tab==="expenses"&&(
          <div>
            <SectionHead title="Dépenses ponctuelles" sub={`${MONTHS_FR[month]} ${year} · ${fmt(persoC.totalOneTime)}`} action={<button onClick={()=>setModal("addExpense")} style={btnP}>+ Ajouter</button>}/>
            {expenses.length===0?<Empty label="Aucune dépense ponctuelle ce mois"/>:
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {expenses.map(e=>(
                  <div key={e.id} className="row" style={{...card,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:3,height:28,borderRadius:2,background:basque,flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:15,fontWeight:500,color:text}}>{e.name}</div>
                        <div style={{fontSize:12,color:text3,marginTop:2}}>{e.category}{e.date?` · ${fmtDate(e.date)}`:""}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:16,fontWeight:600,color:amber,marginRight:8}}>{fmt(e.amount)}</span>
                      <button onClick={()=>{setEditItem(e);setModal("editExpense")}} style={iconBtn()}>✏</button>
                      <button onClick={()=>delExpense(e.id)} style={iconBtn(true)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {appMode==="perso"&&tab==="savings"&&(
          <div>
            <SectionHead title="Épargne" sub={`Total : ${fmt(persoC.totalSavings)}`} action={<button onClick={()=>setModal("addSaving")} style={btnP}>+ Ajouter</button>}/>
            {savings.length===0?<Empty label="Aucune épargne enregistrée"/>:
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
                {savings.map(s=>(
                  <div key={s.id} style={{...card,padding:"24px 22px",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:amber}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:11,color:text3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>{s.type}</div>
                        <div style={{fontSize:26,fontWeight:400,color:amber,fontFamily:serif,lineHeight:1}}>{fmt(s.amount)}</div>
                        <div style={{fontSize:14,color:text,marginTop:10,fontWeight:500}}>{s.name}</div>
                        <div style={{fontSize:12,color:text3,marginTop:4}}>{s.location}</div>
                      </div>
                      <div style={{display:"flex",gap:6,flexShrink:0}}>
                        <button onClick={()=>{setEditItem(s);setModal("editSaving")}} style={iconBtn()}>✏</button>
                        <button onClick={()=>delSaving(s.id)} style={iconBtn(true)}>✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {/* ══ PRO — Suivi mensuel ══ */}
        {appMode==="pro"&&proTab==="pro-mouvements"&&(()=>{
          const caMois=proForecast.find((f:any)=>f.month_key===mk)?.ca_declare||0;
          const tresoMois=proAnnual[month]?.tresoTotale||0;
          const fraisAutoAmt=proExits.find((e:any)=>e.label==="__frais_auto__")?.amount||0;
          const rowLine=(label:string,val:number,color:string)=>(
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${border}`}}>
              <span style={{fontSize:13,color:text2}}>{label}</span>
              <span style={{fontSize:14,fontWeight:600,color}}>{fmt(val)}</span>
            </div>
          );
          return (
          <div style={{display:"flex",flexDirection:"column",gap:24}}>

            {/* Sélecteur de mois */}
            <div style={{display:"flex",alignItems:"center",gap:20}}>
              <button onClick={prevMonth} disabled={year===2026&&month===0} style={{background:border,border:"none",color:text2,fontSize:18,cursor:year===2026&&month===0?"default":"pointer",width:38,height:38,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",opacity:year===2026&&month===0?0.3:1}}>‹</button>
              <div>
                <div style={{fontFamily:serif,fontSize:30,fontWeight:400,color:text,lineHeight:1.1,letterSpacing:"-0.3px"}}>{MONTHS_FR[month]}</div>
                <div style={{fontSize:13,color:text3,marginTop:2,fontWeight:500}}>{year}</div>
              </div>
              <button onClick={nextMonth} style={{background:border,border:"none",color:text2,fontSize:18,cursor:"pointer",width:38,height:38,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
            </div>

            {/* KPI Strip */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              {[
                {label:"CA Facturé",    val:caMois,            color:ocean,                               sub:"engagement comptable"},
                {label:"Encaissé",      val:proC.totalEntrees, color:sage,                                sub:`${proEntries.length} mouvement${proEntries.length!==1?"s":""}`},
                {label:"Décaissé",      val:proC.totalSorties, color:basque,                              sub:`${proExits.filter((e:any)=>e.label!=="__frais_auto__").length} sortie${proExits.length!==1?"s":""}`},
                {label:"Net du mois",   val:proC.netMois,      color:proC.netMois>=0?sage:basque,         sub:"encaissé − décaissé"},
              ].map((k,i)=>(
                <div key={i} style={{...card,padding:"18px 20px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:k.color,borderRadius:"16px 16px 0 0"}}/>
                  <div style={{fontSize:11,color:text3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:10}}>{k.label}</div>
                  <div style={{fontSize:24,fontWeight:400,color:k.color,fontFamily:serif,lineHeight:1,letterSpacing:"-0.2px"}}>{fmt(k.val)}</div>
                  <div style={{fontSize:11,color:text3,marginTop:8,lineHeight:1.4}}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* CA Facturé — édition compacte */}
            <div style={{background:"#F8FAFC",border:`1px solid ${border}`,borderRadius:12,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
              <div>
                <span style={{fontSize:12,color:text2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px"}}>CA Facturé — {MONTHS_FR[month]} {year}</span>
                <span style={{fontSize:12,color:text3,marginLeft:12}}>Engagement comptable, indépendant des encaissements</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="number" value={caDeclareDraft} onChange={e=>setCaDeclareDraft(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveCaDeclare()} placeholder="0" style={{...inp,width:140,textAlign:"right",padding:"9px 14px",fontSize:14}}/>
                <span style={{fontSize:13,color:text3}}>€</span>
                <button onClick={saveCaDeclare} style={{...btnP,fontSize:12,padding:"9px 18px"}}>OK</button>
              </div>
            </div>

            {/* Solde initial — janvier uniquement */}
            {year===2026&&month===0&&(
              <div style={{...card,padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:12,color:text2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>Solde initial — 01/01/2026</div>
                  <div style={{fontSize:28,fontWeight:400,fontFamily:serif,color:proTreasury?.initial_balance!=null&&proTreasury.initial_balance>0?ocean:text3}}>
                    {proTreasury?.initial_balance!=null?fmt(proTreasury.initial_balance):"Non défini"}
                  </div>
                </div>
                <button onClick={()=>setModal("initBalance")} style={{...btnG,fontSize:12,padding:"9px 18px"}}>
                  {proTreasury?.initial_balance!=null?"Modifier":"Définir →"}
                </button>
              </div>
            )}

            {/* Entrées / Sorties grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

              {/* Entrées */}
              <div style={{...card,padding:"22px 24px",borderTop:`3px solid ${sage}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div>
                    <h3 style={{margin:0,fontSize:16,fontFamily:serif,fontWeight:400,color:text}}>Entrées</h3>
                    {proEntries.length>0&&<div style={{fontSize:12,color:text3,marginTop:2}}>{fmt(proC.totalEntrees)} encaissé</div>}
                  </div>
                  <button onClick={()=>setModal("addEntry")} style={{...btnP,padding:"7px 16px",fontSize:12}}>+ Ajouter</button>
                </div>
                {proEntries.length===0?<p style={{margin:0,fontSize:14,color:text3}}>Aucune entrée ce mois</p>:
                  <div style={{display:"flex",flexDirection:"column"}}>
                    {proEntries.map((e,i)=>{
                      const offYear=e.exercise_year&&e.exercise_year!==year;
                      return (
                      <div key={e.id} className="row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:i<proEntries.length-1?`1px solid ${border}`:"none",opacity:offYear?0.5:1}}>
                        <div style={{flex:1,minWidth:0,marginRight:12}}>
                          <div style={{fontSize:14,fontWeight:500,color:text,lineHeight:1.3,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                            {e.type}
                            {offYear&&<span style={{fontSize:10,fontWeight:700,background:"rgba(143,96,24,0.1)",color:amber,borderRadius:4,padding:"2px 6px"}}>Ex. {e.exercise_year}</span>}
                          </div>
                          <div style={{fontSize:12,color:text3,marginTop:2}}>{fmtDate(e.date)}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                          <span style={{fontSize:15,fontWeight:700,color:offYear?text3:sage}}>{fmt(e.amount)}</span>
                          <button onClick={()=>{setEditItem(e);setModal("editEntry")}} style={sm()}>✏</button>
                          <button onClick={()=>delEntry(e.id)} style={sm(true)}>✕</button>
                        </div>
                      </div>
                      );
                    })}
                    <div style={{display:"flex",justifyContent:"space-between",paddingTop:12,marginTop:4}}>
                      <span style={{fontSize:12,color:text3,fontWeight:500}}>Total exercice {year}</span>
                      <span style={{fontSize:16,fontWeight:700,color:sage}}>{fmt(proC.totalEntrees)}</span>
                    </div>
                  </div>
                }
              </div>

              {/* Sorties */}
              <div style={{...card,padding:"22px 24px",borderTop:`3px solid ${basque}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                  <div>
                    <h3 style={{margin:0,fontSize:16,fontFamily:serif,fontWeight:400,color:text}}>Sorties</h3>
                    {proExits.length>0&&<div style={{fontSize:12,color:text3,marginTop:2}}>{fmt(proC.totalSorties)} décaissé</div>}
                  </div>
                  <button onClick={()=>setModal("addExit")} style={{...btnP,padding:"7px 16px",fontSize:12,background:basque}}>+ Ajouter</button>
                </div>
                {(()=>{
                  const manualExits=proExits.filter((e:any)=>e.label!=="__frais_auto__");
                  const fraisAutoExit=proExits.find((e:any)=>e.label==="__frais_auto__");
                  if(proExits.length===0)return<p style={{margin:0,fontSize:14,color:text3}}>Aucune sortie ce mois</p>;
                  return (
                    <div style={{display:"flex",flexDirection:"column"}}>
                      {manualExits.map((e:any,i:number)=>{
                        const offYear=e.exercise_year&&e.exercise_year!==year;
                        return (
                        <div key={e.id} className="row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${border}`,opacity:offYear?0.5:1}}>
                          <div style={{flex:1,minWidth:0,marginRight:12}}>
                            <div style={{fontSize:14,fontWeight:500,color:text,lineHeight:1.3,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                              {e.label||e.category}
                              {offYear&&<span style={{fontSize:10,fontWeight:700,background:"rgba(143,96,24,0.1)",color:amber,borderRadius:4,padding:"2px 6px"}}>Ex. {e.exercise_year}</span>}
                              {e.imputation_month_key&&e.imputation_month_key!==mk&&<span style={{fontSize:10,fontWeight:700,background:"rgba(27,77,110,0.08)",color:ocean,borderRadius:4,padding:"2px 6px"}}>{e.imputation_month_key}</span>}
                            </div>
                            <div style={{fontSize:12,color:text3,marginTop:2}}>{e.label?`${e.category} · `:""}{fmtDate(e.date)}</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                            <span style={{fontSize:15,fontWeight:700,color:offYear?text3:basque}}>{fmt(e.amount)}</span>
                            <button onClick={()=>{setEditItem(e);setModal("editExit")}} style={sm()}>✏</button>
                            <button onClick={()=>delExit(e.id)} style={sm(true)}>✕</button>
                          </div>
                        </div>
                        );
                      })}
                      {fraisAutoExit&&(
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${border}`,opacity:0.7}}>
                          <div>
                            <div style={{fontSize:14,fontWeight:500,color:text2,fontStyle:"italic"}}>Frais pro (auto)</div>
                            <div style={{fontSize:12,color:text3,marginTop:2}}>Calculé depuis l'onglet Frais</div>
                          </div>
                          <span style={{fontSize:15,fontWeight:700,color:basque,marginRight:52}}>{fmt(fraisAutoExit.amount)}</span>
                        </div>
                      )}
                      <div style={{display:"flex",justifyContent:"space-between",paddingTop:12,marginTop:4}}>
                        <span style={{fontSize:12,color:text3,fontWeight:500}}>Total</span>
                        <span style={{fontSize:16,fontWeight:700,color:basque}}>{fmt(proC.totalSorties)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Frais */}
            {(()=>{
              const fraisMois=proFrais.filter((f:any)=>f.month_key===mk).sort((a:any,b:any)=>a.date.localeCompare(b.date));
              const activeRecurrings=proRecurringFrais.filter(r=>!proRecurringFraisSkips.some(s=>s.recurring_frais_id===r.id&&s.month_key===mk));
              const skippedRecurrings=proRecurringFrais.filter(r=>proRecurringFraisSkips.some(s=>s.recurring_frais_id===r.id&&s.month_key===mk));
              const totalFrais=fraisMois.reduce((s:number,f:any)=>s+Number(f.amount_ttc),0)+activeRecurrings.reduce((s:number,r:any)=>s+Number(r.amount_ttc),0);
              const hasAny=fraisMois.length>0||activeRecurrings.length>0;
              const thS: React.CSSProperties={padding:"10px 14px",textAlign:"left",fontSize:11,color:text2,fontWeight:700,letterSpacing:"0.6px",textTransform:"uppercase",borderBottom:`2px solid ${border}`,whiteSpace:"nowrap",background:"#F8FAFC"};
              const tdS: React.CSSProperties={padding:"13px 14px",verticalAlign:"middle",borderBottom:`1px solid ${border}`};
              return (
                <div style={{...card,overflow:"hidden"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px 16px"}}>
                    <div>
                      <h3 style={{margin:0,fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>Frais professionnels</h3>
                      <div style={{fontSize:13,color:text3,marginTop:3}}>{hasAny?`${fmt(totalFrais)} TTC ce mois`:"Aucun frais ce mois"}</div>
                    </div>
                    <button onClick={()=>setModal("addFrais")} style={{...btnP,padding:"8px 18px",fontSize:13}}>+ Ajouter</button>
                  </div>
                  {hasAny&&(
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead>
                          <tr>
                            <th style={{...thS,width:120}}>Date</th>
                            <th style={thS}>Type</th>
                            <th style={thS}>Libellé</th>
                            <th style={{...thS,textAlign:"right"}}>Montant TTC</th>
                            <th style={{...thS,width:72}}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeRecurrings.map((r:any)=>{
                            const dsRaw=r.prelevement_day?`${year}-${String(month+1).padStart(2,"0")}-${String(r.prelevement_day).padStart(2,"0")}`:null;
                            return (
                            <tr key={r.id} className="row" style={{background:"rgba(42,122,90,0.025)"}}>
                              <td style={tdS}>
                                <span style={{color:sage,fontWeight:700,fontSize:11,marginRight:4}}>↻</span>
                                <span style={{fontSize:12,color:text2,fontWeight:500}}>{dsRaw?fmtDate(dsRaw):"Mensuel"}</span>
                              </td>
                              <td style={tdS}>{pill(r.type)}</td>
                              <td style={{...tdS,fontSize:13,color:r.label?text:text3}}>{r.label||"—"}</td>
                              <td style={{...tdS,textAlign:"right",fontWeight:700,fontSize:15,color:ocean,letterSpacing:"-0.2px"}}>{fmt(r.amount_ttc)}</td>
                              <td style={{...tdS,textAlign:"right"}}>
                                <button onClick={()=>skipRecurringFrais(r.id)} style={{...sm(),background:"rgba(143,96,24,0.08)",color:amber}} title="Désactiver ce mois">⊘</button>
                              </td>
                            </tr>
                            );
                          })}
                          {fraisMois.map((f:any)=>(
                            <tr key={f.id} className="row">
                              <td style={{...tdS,fontSize:12,color:text2,fontWeight:500}}>{fmtDate(f.date)}</td>
                              <td style={tdS}>{pill(f.type)}</td>
                              <td style={{...tdS,fontSize:13,color:f.label?text:text3}}>{f.label||"—"}</td>
                              <td style={{...tdS,textAlign:"right",fontWeight:700,fontSize:15,color:ocean,letterSpacing:"-0.2px"}}>{fmt(f.amount_ttc)}</td>
                              <td style={{...tdS,textAlign:"right"}}>
                                <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                                  <button onClick={()=>{setEditItem(f);setModal("editFrais")}} style={sm()}>✏</button>
                                  <button onClick={()=>delFrais(f.id,f.month_key)} style={sm(true)}>✕</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{background:"#F8FAFC",borderTop:`2px solid ${border}`}}>
                            <td colSpan={3} style={{padding:"13px 14px",fontSize:12,fontWeight:700,color:text2,textTransform:"uppercase",letterSpacing:"0.5px"}}>Total TTC</td>
                            <td style={{padding:"13px 14px",textAlign:"right",fontWeight:700,fontSize:16,color:ocean,letterSpacing:"-0.3px"}}>{fmt(totalFrais)}</td>
                            <td/>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  {skippedRecurrings.length>0&&(
                    <div style={{padding:"12px 24px",borderTop:`1px dashed ${border}`,background:"#FAFAFA"}}>
                      <div style={{fontSize:11,color:text3,fontWeight:700,letterSpacing:"0.6px",textTransform:"uppercase",marginBottom:8}}>Désactivés ce mois</div>
                      {skippedRecurrings.map((r:any)=>(
                        <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",opacity:0.4}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            {pill(r.type)}
                            <span style={{fontSize:13,color:text,textDecoration:"line-through"}}>{r.label||r.type}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:13,color:ocean,fontWeight:600}}>{fmt(r.amount_ttc)}</span>
                            <button onClick={()=>unskipRecurringFrais(r.id)} style={{...sm(),background:"rgba(42,122,90,0.08)",color:sage,opacity:1}} title="Réactiver ce mois">↺</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Récapitulatif */}
            <div style={{...card,padding:"24px 26px"}}>
              <h3 style={{margin:"0 0 20px",fontSize:16,fontFamily:serif,fontWeight:400,color:text}}>Récapitulatif — {MONTHS_FR[month]} {year}</h3>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
                {[
                  {label:"Net du mois",          val:proC.netMois,  color:proC.netMois>=0?sage:basque,  bg:proC.netMois>=0?"rgba(42,122,90,0.06)":"rgba(192,98,42,0.06)", brd:proC.netMois>=0?"rgba(42,122,90,0.2)":"rgba(192,98,42,0.2)"},
                  {label:"Trésorerie cumulée",   val:tresoMois,     color:ocean,                          bg:"rgba(27,77,110,0.06)",                                         brd:"rgba(27,77,110,0.18)"},
                ].map(k=>(
                  <div key={k.label} style={{background:k.bg,border:`1px solid ${k.brd}`,borderRadius:12,padding:"18px 20px"}}>
                    <div style={{fontSize:11,color:k.color,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8,opacity:0.75}}>{k.label}</div>
                    <div style={{fontSize:28,fontWeight:400,fontFamily:serif,color:k.color,lineHeight:1,letterSpacing:"-0.3px"}}>{fmt(k.val)}</div>
                  </div>
                ))}
              </div>
              {rowLine("Total entrées",proC.totalEntrees,sage)}
              {rowLine("Total sorties",proC.totalSorties,basque)}
              {fraisAutoAmt>0&&rowLine("dont Frais pro",fraisAutoAmt,text2)}
            </div>

            {/* Détail sorties par catégorie */}
            {proExits.length>0&&(
              <div style={{...card,padding:"24px 26px"}}>
                <h3 style={{margin:"0 0 16px",fontSize:16,fontFamily:serif,fontWeight:400,color:text}}>Détail des sorties</h3>
                {EXIT_CATS.map(cat=>{
                  const total=proExits.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.amount),0);
                  if(!total)return null;
                  return (
                    <div key={cat} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${border}`}}>
                      <span style={{fontSize:14,color:text}}>{cat}</span>
                      <span style={{fontSize:14,fontWeight:600,color:text2}}>{fmt(total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          );
        })()}

        {/* ══ PRO — Bilan annuel ══ */}
        {appMode==="pro"&&proTab==="pro-annual"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <SectionHead title={`Bilan ${year}`} sub="Curutchet Consulting — CA facturé, charges imputées"/>
            <div style={{overflowX:"auto",borderRadius:16,border:`1px solid ${border}`,background:"#FFF",boxShadow:"0 1px 3px rgba(45,52,54,0.04)"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:1160}}>
                <thead>
                  <tr style={{background:"#F7F5F0"}}>
                    {[
                      {h:"Mois",          w:72,  note:""},
                      {h:"CA Facturé",    w:100, note:"déclaré"},
                      {h:"TVA calc.",     w:90,  note:"÷ 6"},
                      {h:"Frais pro",     w:90,  note:""},
                      {h:"Salaire",       w:90,  note:""},
                      {h:"PER / AV",      w:90,  note:""},
                      {h:"Charges pay.",  w:96,  note:"payées"},
                      {h:"Charges calc.", w:96,  note:"45%"},
                      {h:"Diff. charge",  w:96,  note:"calc − payé"},
                      {h:"Tot. dép.",     w:90,  note:"HT"},
                      {h:"IS calc.",      w:85,  note:"15%"},
                      {h:"À conserver",   w:100, note:"charges + IS"},
                      {h:"Tréso mois",    w:100, note:""},
                      {h:"Tréso tot.",    w:100, note:"cumulé"},
                      {h:"Tréso réelle",  w:110, note:"disponible"},
                    ].map((h,i)=>(
                      <th key={i} style={{padding:"12px 10px",textAlign:i===0?"left":"right",fontWeight:600,fontSize:11,color:text2,letterSpacing:"0.4px",textTransform:"uppercase",whiteSpace:"nowrap",width:h.w,minWidth:h.w,borderBottom:`1px solid ${border}`}}>
                        {h.h}
                        {h.note&&<span style={{display:"block",fontSize:10,fontWeight:400,color:text3,textTransform:"none",letterSpacing:0}}>{h.note}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proAnnual.map((row,i)=>{
                    const isCurrent=i===month;
                    const isPast=i<month;
                    const dim=!row.hasData&&!isPast&&!isCurrent;
                    return (
                      <tr key={row.k} style={{borderBottom:i<11?`1px solid #F2EFE9`:"none",background:isCurrent?"rgba(27,77,110,0.04)":"transparent",opacity:dim?0.35:1}}>
                        <td style={{padding:"12px 10px",fontWeight:isCurrent?700:500,color:isCurrent?ocean:text,fontSize:13}}>{row.label}</td>
                        {(()=>{
                          const diffCharge=row.salaire?(row.chargesCalc-row.chargesPay):0;
                          const aConserver=diffCharge+row.is;
                          const tresoReelle=row.tresoTotale-aConserver;
                          return [
                            {v:row.caTTC,     c:row.caTTC?ocean:text3},
                            {v:row.tvaCalc,   c:text2},
                            {v:row.frais,     c:row.frais?basque:text3},
                            {v:row.salaire,   c:row.salaire?text:text3},
                            {v:row.per,       c:row.per?amber:text3},
                            {v:row.chargesPay,c:row.chargesPay?basque:text3},
                            {v:row.chargesCalc,c:text2, italic:true},
                            {v:diffCharge,    c:diffCharge>0?amber:sage, bold:true},
                            {v:row.totalDepenses,c:row.totalDepenses?basque:text3},
                            {v:row.is,        c:row.is?basque:text3, italic:true},
                            {v:aConserver,    c:aConserver>0?amber:sage, bold:true},
                            {v:row.tresoMois, c:row.tresoMois>0?sage:row.tresoMois<0?basque:text3, bold:true},
                            {v:row.tresoTotale,c:row.tresoTotale>0?ocean:basque, bold:true},
                            {v:tresoReelle,   c:tresoReelle>0?ocean:basque, bold:true},
                          ];
                        })().map((cell,j)=>(
                          <td key={j} style={{padding:"12px 10px",textAlign:"right",fontWeight:cell.bold?600:400,color:cell.v===0&&!cell.bold?text3:cell.c,fontStyle:cell.italic?"italic":"normal"}}>
                            {cell.v!==0?fmt(cell.v):<span style={{color:text3,opacity:0.3}}>—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  {(()=>{
                    const T=(fn: (r: typeof proAnnual[0])=>number)=>proAnnual.reduce((s,r)=>s+fn(r),0);
                    const cols=[
                      T(r=>r.caTTC),
                      T(r=>r.tvaCalc),
                      T(r=>r.frais),
                      T(r=>r.salaire),
                      T(r=>r.per),
                      T(r=>r.chargesPay),
                      T(r=>r.chargesCalc),
                      T(r=>r.salaire?(r.chargesCalc-r.chargesPay):0),
                      T(r=>r.totalDepenses),
                      T(r=>r.is),
                      T(r=>{const d=r.salaire?(r.chargesCalc-r.chargesPay):0;return d+r.is;}),
                      T(r=>r.tresoMois),
                      proAnnual[11]?.tresoTotale||0,
                      (()=>{const r=proAnnual[11];if(!r)return 0;const d=r.salaire?(r.chargesCalc-r.chargesPay):0;return r.tresoTotale-(d+r.is);})(),
                    ];
                    return (
                      <tr style={{background:"#F2F0EB",borderTop:`2px solid ${border}`}}>
                        <td style={{padding:"13px 10px",fontWeight:700,fontSize:13,color:text}}>Total</td>
                        {cols.map((v,j)=>(
                          <td key={j} style={{padding:"13px 10px",textAlign:"right",fontWeight:600,fontSize:13,color:v>0?ocean:v<0?basque:text3}}>{v?fmt(v):"—"}</td>
                        ))}
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            <p style={{margin:0,fontSize:12,color:text3,textAlign:"center",lineHeight:1.8}}>
              TVA calc. = CA TTC ÷ 6 &nbsp;·&nbsp; Charges calc. = 45% × (Salaire + PER/AV) &nbsp;·&nbsp; IS = 15% × (CA HT − Frais pro − Charges payées − Salaire)
            </p>
          </div>
        )}

        {/* ══ PRO — Trésorerie (flux réels) ══ */}
        {appMode==="pro"&&proTab==="pro-tresorerie"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <SectionHead title={`Trésorerie ${year}`} sub="Tous les mouvements — sans filtre exercice comptable"/>
            <div style={{...card,padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:11,color:text2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Solde initial — 01/01/2026</div>
                <div style={{fontSize:22,fontWeight:400,fontFamily:serif,color:proTreasury?.initial_balance!=null&&proTreasury.initial_balance>0?ocean:text3}}>
                  {proTreasury?.initial_balance!=null?fmt(proTreasury.initial_balance):"Non défini"}
                </div>
              </div>
              <button onClick={()=>setModal("initBalance")} style={{...btnG,fontSize:12,padding:"8px 16px"}}>
                {proTreasury?.initial_balance!=null?"Modifier":"Définir →"}
              </button>
            </div>
            <div style={{overflowX:"auto",borderRadius:16,border:`1px solid ${border}`,background:"#FFF",boxShadow:"0 1px 3px rgba(45,52,54,0.04)"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:1160}}>
                <thead>
                  <tr style={{background:"#F7F5F0"}}>
                    {[
                      {h:"Mois",         w:72,  note:""},
                      {h:"CA TTC",       w:100, note:""},
                      {h:"TVA réelle",   w:90,  note:"payée"},
                      {h:"Frais pro",    w:90,  note:""},
                      {h:"Salaire",      w:90,  note:""},
                      {h:"PER / AV",     w:90,  note:""},
                      {h:"Charges pay.", w:96,  note:"payées"},
                      {h:"Tot. dép.",    w:90,  note:"HT"},
                      {h:"IS réel",      w:85,  note:"payé"},
                      {h:"Tréso mois",   w:100, note:""},
                      {h:"Tréso tot.",   w:100, note:"cumulé"},
                    ].map((h,i)=>(
                      <th key={i} style={{padding:"12px 10px",textAlign:i===0?"left":"right",fontWeight:600,fontSize:11,color:text2,letterSpacing:"0.4px",textTransform:"uppercase",whiteSpace:"nowrap",width:h.w,minWidth:h.w,borderBottom:`1px solid ${border}`}}>
                        {h.h}
                        {h.note&&<span style={{display:"block",fontSize:10,fontWeight:400,color:text3,textTransform:"none",letterSpacing:0}}>{h.note}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proTresoAnnual.map((row,i)=>{
                    const isCurrent=i===month;
                    const isPast=i<month;
                    const dim=!row.hasData&&!isPast&&!isCurrent;
                    return (
                      <tr key={row.k} style={{borderBottom:i<11?`1px solid #F2EFE9`:"none",background:isCurrent?"rgba(27,77,110,0.04)":"transparent",opacity:dim?0.35:1}}>
                        <td style={{padding:"12px 10px",fontWeight:isCurrent?700:500,color:isCurrent?ocean:text,fontSize:13}}>{row.label}</td>
                        {[
                          {v:row.caTTC,         c:row.caTTC?ocean:text3},
                          {v:row.tvaReelle,     c:row.tvaReelle?basque:text3},
                          {v:row.frais,         c:row.frais?basque:text3},
                          {v:row.salaire,       c:row.salaire?text:text3},
                          {v:row.per,           c:row.per?amber:text3},
                          {v:row.chargesPay,    c:row.chargesPay?basque:text3},
                          {v:row.totalDepenses, c:row.totalDepenses?basque:text3},
                          {v:row.isReel,        c:row.isReel?basque:text3},
                          {v:row.tresoMois,     c:row.tresoMois>0?sage:row.tresoMois<0?basque:text3, bold:true},
                          {v:row.tresoTotale,   c:row.tresoTotale>0?ocean:basque, bold:true},
                        ].map((cell,j)=>(
                          <td key={j} style={{padding:"12px 10px",textAlign:"right",fontWeight:cell.bold?600:400,color:cell.v===0&&!cell.bold?text3:cell.c}}>
                            {cell.v!==0?fmt(cell.v):<span style={{color:text3,opacity:0.3}}>—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {(()=>{
                    const T=(fn: (r: typeof proTresoAnnual[0])=>number)=>proTresoAnnual.reduce((s,r)=>s+fn(r),0);
                    const cols=[T(r=>r.caTTC),T(r=>r.tvaReelle),T(r=>r.frais),T(r=>r.salaire),T(r=>r.per),T(r=>r.chargesPay),T(r=>r.totalDepenses),T(r=>r.isReel),T(r=>r.tresoMois),proTresoAnnual[11]?.tresoTotale||0];
                    return (
                      <tr style={{background:"#F2F0EB",borderTop:`2px solid ${border}`}}>
                        <td style={{padding:"13px 10px",fontWeight:700,fontSize:13,color:text}}>Total</td>
                        {cols.map((v,j)=>(
                          <td key={j} style={{padding:"13px 10px",textAlign:"right",fontWeight:600,fontSize:13,color:v>0?ocean:v<0?basque:text3}}>{v?fmt(v):"—"}</td>
                        ))}
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            <p style={{margin:0,fontSize:12,color:text3,textAlign:"center",lineHeight:1.8}}>
              Inclut tous les mouvements quelle que soit leur imputation comptable &nbsp;·&nbsp; TVA calc. = CA TTC ÷ 6 &nbsp;·&nbsp; IS = 15% × (CA HT − Frais pro − Charges payées − Salaire)
            </p>
          </div>
        )}

        {/* ══ PRO — Frais récurrents ══ */}
        {appMode==="pro"&&proTab==="pro-frais-recurrents"&&(()=>{
          const totalMensuel=proRecurringFrais.reduce((s,r)=>s+Number(r.amount_ttc),0);
          const allTypes=[...new Set([...FRAIS_TYPES,...proRecurringFrais.map((r:any)=>r.type),...proFrais.map((f:any)=>f.type)].filter(Boolean))];
          const thS: React.CSSProperties={padding:"10px 14px",textAlign:"left",fontSize:11,color:text2,fontWeight:700,letterSpacing:"0.6px",textTransform:"uppercase",borderBottom:`2px solid ${border}`,background:"#F8FAFC",whiteSpace:"nowrap"};
          const tdS: React.CSSProperties={padding:"13px 14px",verticalAlign:"middle",borderBottom:`1px solid ${border}`};
          return (
            <div style={{display:"flex",flexDirection:"column",gap:20}}>
              <SectionHead
                title="Frais récurrents"
                sub={`${proRecurringFrais.length} frais · ${fmt(totalMensuel)} / mois`}
                action={<button onClick={()=>setModal("addRecurringFrais")} style={btnP}>+ Ajouter</button>}
              />
              <div style={{background:"rgba(27,77,110,0.05)",borderRadius:12,padding:"14px 18px",fontSize:13,color:ocean,border:`1px solid rgba(27,77,110,0.12)`,lineHeight:1.6}}>
                Ces frais s'appliquent automatiquement à chaque mois. Depuis <strong>Suivi mensuel</strong>, utilisez <strong>⊘</strong> pour désactiver un frais un mois donné, et <strong>↺</strong> pour le réactiver.
              </div>

              {/* Liste des frais récurrents */}
              {proRecurringFrais.length===0
                ?<Empty label="Aucun frais récurrent défini"/>
                :(
                  <div style={{...card,overflow:"hidden"}}>
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead>
                          <tr>
                            <th style={thS}>Type</th>
                            <th style={thS}>Libellé</th>
                            <th style={thS}>Prélèvement</th>
                            <th style={{...thS,textAlign:"right"}}>Montant / mois</th>
                            <th style={{...thS,width:80}}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {proRecurringFrais.map((r:any)=>(
                            <tr key={r.id} className="row">
                              <td style={tdS}>{pill(r.type)}</td>
                              <td style={{...tdS,fontSize:13,color:r.label?text:text3}}>{r.label||"—"}</td>
                              <td style={{...tdS,fontSize:13,color:text2}}>{r.prelevement_day?`Le ${r.prelevement_day} du mois`:"Mensuel"}</td>
                              <td style={{...tdS,textAlign:"right",fontWeight:700,fontSize:15,color:ocean}}>{fmt(r.amount_ttc)}</td>
                              <td style={{...tdS,textAlign:"right"}}>
                                <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                                  <button onClick={()=>{setEditItem(r);setModal("editRecurringFrais")}} style={sm()}>✏</button>
                                  <button onClick={()=>delRecurringFrais(r.id)} style={sm(true)}>✕</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{background:"#F8FAFC",borderTop:`2px solid ${border}`}}>
                            <td colSpan={3} style={{padding:"13px 14px",fontSize:12,fontWeight:700,color:text2,textTransform:"uppercase",letterSpacing:"0.5px"}}>Total mensuel</td>
                            <td style={{padding:"13px 14px",textAlign:"right",fontWeight:700,fontSize:16,color:ocean}}>{fmt(totalMensuel)}</td>
                            <td/>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )
              }

              {/* Couleurs des catégories */}
              <div style={{...card,padding:"24px 26px"}}>
                <h3 style={{margin:"0 0 6px",fontSize:16,fontFamily:serif,fontWeight:400,color:text}}>Couleurs des catégories</h3>
                <p style={{margin:"0 0 20px",fontSize:13,color:text3}}>Cliquez sur une pastille pour modifier sa couleur.</p>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {allTypes.map(type=>{
                    const c=fraisColor(type,fraisColorOverrides);
                    const isCustom=!!fraisColorOverrides[type];
                    return (
                      <div key={type} style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
                        <div style={{width:160,flexShrink:0}}><TypePill type={type} dot={c.dot} bg={c.bg}/></div>
                        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                          {COLOR_PRESETS.map(color=>(
                            <button key={color} onClick={()=>updateFraisColor(type,color)} style={{width:24,height:24,borderRadius:"50%",background:color,border:c.dot===color?`3px solid ${text}`:`2px solid transparent`,cursor:"pointer",padding:0,transition:"transform 0.1s",flexShrink:0}} title={color}/>
                          ))}
                          <input type="color" value={c.dot} onChange={e=>updateFraisColor(type,e.target.value)} style={{width:24,height:24,borderRadius:"50%",border:`2px solid ${border}`,cursor:"pointer",padding:0,background:"none",flexShrink:0}} title="Couleur personnalisée"/>
                          {isCustom&&(
                            <button onClick={()=>updateFraisColor(type,FRAIS_COLORS[type]?.dot||"#9CA3AF")} style={{fontSize:11,color:text3,background:"none",border:"none",cursor:"pointer",padding:"2px 4px",textDecoration:"underline"}}>Réinitialiser</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        </div>{/* /inner content */}
      </div>{/* /content wrapper */}

      {/* ── Perso modals ── */}
      {(modal==="addIncome"||modal==="editIncome")&&<IncomeForm initial={editItem} onSubmit={modal==="editIncome"?editIncome:addIncome} onClose={closeModal} title={modal==="editIncome"?"Modifier le revenu":"Nouveau revenu"}/>}
      {(modal==="addRecurring"||modal==="editRecurring")&&<RecurringForm initial={editItem} onSubmit={modal==="editRecurring"?editRecurring:addRecurring} onClose={closeModal} title={modal==="editRecurring"?"Modifier":"Nouvelle dépense récurrente"}/>}
      {(modal==="addExpense"||modal==="editExpense")&&<ExpenseForm initial={editItem} onSubmit={modal==="editExpense"?editExpense:addExpense} onClose={closeModal} title={modal==="editExpense"?"Modifier":"Nouvelle dépense ponctuelle"}/>}
      {(modal==="addSaving"||modal==="editSaving")&&<SavingForm initial={editItem} onSubmit={modal==="editSaving"?editSaving:addSaving} onClose={closeModal} title={modal==="editSaving"?"Modifier l'épargne":"Nouvelle épargne"}/>}

      {/* ── Pro modals ── */}
      {(modal==="addEntry"||modal==="editEntry")&&<EntryForm initial={editItem} onSubmit={modal==="editEntry"?editEntry:addEntry} onClose={closeModal} title={modal==="editEntry"?"Modifier l'entrée":"Nouvelle entrée"} defaultYear={year} caMonths={proForecast.filter((f:any)=>(f.ca_declare||0)>0).map((f:any)=>{const p=f.month_key.split('-');return {key:f.month_key,label:`${MONTHS_FR[parseInt(p[1])-1]} ${p[0]}`}}).sort((a:any,b:any)=>a.key.localeCompare(b.key))}/>}
      {(modal==="addExit"||modal==="editExit")&&<ExitForm initial={editItem} onSubmit={modal==="editExit"?editExit:addExit} onClose={closeModal} title={modal==="editExit"?"Modifier la sortie":"Nouvelle sortie"} defaultYear={year} defaultMk={mk}/>}
      {modal==="initBalance"&&<InitBalanceModal current={proTreasury} onSubmit={saveInitBal} onClose={closeModal}/>}
      {(modal==="addFrais"||modal==="editFrais")&&<FraisForm initial={editItem} onSubmit={modal==="editFrais"?editFrais:addFrais} onClose={closeModal} title={modal==="editFrais"?"Modifier le frais":"Nouveau frais"} fraisTypes={[...new Set([...FRAIS_TYPES,...proFrais.map((f:any)=>f.type).filter(Boolean)])]}/>}
      {(modal==="addRecurringFrais"||modal==="editRecurringFrais")&&<RecurringFraisForm initial={editItem} onSubmit={modal==="editRecurringFrais"?editRecurringFrais:addRecurringFrais} onClose={closeModal} title={modal==="editRecurringFrais"?"Modifier le frais récurrent":"Nouveau frais récurrent"} fraisTypes={[...new Set([...FRAIS_TYPES,...proRecurringFrais.map((r:any)=>r.type).filter(Boolean)])]}/>}
    </div>
  );
}
