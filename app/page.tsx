"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const fmt = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(n);
const monthKey = (y,m) => `${y}-${String(m+1).padStart(2,"0")}`;

const EXPENSE_CATEGORIES = ["🏠 Loyer","🚗 Transport","🛒 Courses","🍽️ Restaurant","📱 Abonnements","⚡ Énergie","💊 Santé","🎭 Loisirs","👕 Vêtements","🎓 Éducation","🐾 Animaux","🔧 Divers"];
const SAVINGS_TYPES = ["Livret A","LDDS","PEL","Assurance Vie","PEA","Compte Titre","Crypto","Autre"];
const INCOME_TYPES = ["CA 2026","CA 2025","Salaire","Freelance","Dividendes","Loyer perçu","Prime","Remboursement","Autre"];
const PRO_EXPENSE_CATS = ["💻 Matériel info","📱 Téléphone","🚗 Déplacement","🏢 Bureau","📚 Formation","⚖️ Comptable/Juridique","🌐 SaaS/Logiciels","📣 Marketing","🔧 Divers pro"];
const TVA_RATES = [0, 5.5, 10, 20];
const INVOICE_STATUSES = ["facturé","encaissé","en_attente"];
const STATUS_COLORS: Record<string,string> = {facturé:"#1B4D6E", encaissé:"#5B7B6A", en_attente:"#A0845C"};
const STATUS_LABELS: Record<string,string> = {facturé:"Facturé", encaissé:"Encaissé", en_attente:"En attente"};

const ocean  = "#1B4D6E";
const sage   = "#5B7B6A";
const basque = "#C1443E";
const amber  = "#A0845C";
const text   = "#2D3436";
const text2  = "#7F8C9B";
const text3  = "#B0BEC5";
const border = "#E8E4DC";
const serif  = "'DM Serif Display',serif";

const inp: React.CSSProperties = {
  background:"#FAFAF8", border:`1.5px solid ${border}`, borderRadius:10,
  padding:"12px 16px", color:text, fontSize:15, outline:"none",
  fontFamily:"'DM Sans',sans-serif", width:"100%", transition:"border-color 0.15s",
};
const sel: React.CSSProperties = {
  ...inp, appearance:"none" as const,
  backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%237F8C9B' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
  backgroundRepeat:"no-repeat", backgroundPosition:"right 16px center",
};
const btnP: React.CSSProperties = {
  background:ocean, color:"#fff", border:"none", borderRadius:50,
  padding:"10px 22px", fontSize:13, fontWeight:600, cursor:"pointer",
  fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.1px", whiteSpace:"nowrap",
};
const btnG: React.CSSProperties = {
  background:"transparent", border:`1.5px solid ${border}`, borderRadius:50,
  padding:"10px 22px", color:text2, fontSize:13, cursor:"pointer",
  fontFamily:"'DM Sans',sans-serif",
};
const card: React.CSSProperties = {
  background:"#FFF", border:"1px solid #EDEAE3", borderRadius:20,
  boxShadow:"0 1px 3px rgba(45,52,54,0.04),0 4px 20px rgba(45,52,54,0.06)",
};
const iconBtn = (danger=false): React.CSSProperties => ({
  background: danger ? "rgba(193,68,62,0.07)" : "rgba(45,52,54,0.04)",
  border:"none", borderRadius:8, width:34, height:34,
  color: danger ? basque : text2,
  cursor:"pointer", fontSize:15, display:"flex",
  alignItems:"center", justifyContent:"center", flexShrink:0,
});

function Label({children}: {children:React.ReactNode}) {
  return <label style={{fontSize:11,color:text2,fontWeight:600,letterSpacing:"0.7px",textTransform:"uppercase",display:"block",marginBottom:6}}>{children}</label>;
}
function Field({label,children}: {label:string,children:React.ReactNode}) {
  return <div style={{display:"flex",flexDirection:"column",gap:0}}><Label>{label}</Label>{children}</div>;
}
function SectionHead({title,sub,action}: {title:string,sub?:string,action?:React.ReactNode}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
      <div>
        <h2 style={{margin:0,fontSize:24,fontFamily:serif,fontWeight:400,color:text,letterSpacing:"-0.2px"}}>{title}</h2>
        {sub && <p style={{margin:"5px 0 0",fontSize:13,color:text3}}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
function Empty({label}: {label:string}) {
  return (
    <div style={{textAlign:"center",padding:"56px 24px"}}>
      <div style={{fontSize:32,opacity:0.2,marginBottom:12}}>—</div>
      <p style={{margin:0,fontSize:14,color:text3}}>{label}</p>
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
function FormActions({onClose,onSubmit,isEdit}: {onClose:()=>void,onSubmit:()=>void,isEdit:boolean}) {
  return (
    <div style={{display:"flex",gap:10,marginTop:12}}>
      <button onClick={onClose} style={btnG}>Annuler</button>
      <button onClick={onSubmit} style={btnP}>{isEdit?"Enregistrer":"Ajouter"}</button>
    </div>
  );
}

// ─── Perso Forms ───
function RecurringForm({initial,onSubmit,onClose,title}: any) {
  const [name,setName]  = useState(initial?.name||"");
  const [amount,setAmt] = useState(initial?.amount||"");
  const [cat,setCat]    = useState(initial?.category||EXPENSE_CATEGORIES[0]);
  const go = () => { if(!name||!amount) return; onSubmit({...(initial||{}),name,amount:parseFloat(amount),category:cat}); };
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Nom"><input value={name} onChange={e=>setName(e.target.value)} placeholder="ex : Loyer" style={inp}/></Field>
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
        <Field label="Catégorie"><select value={cat} onChange={e=>setCat(e.target.value)} style={sel}>{EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
        <FormActions onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function ExpenseForm({initial,onSubmit,onClose,title}: any) {
  const [name,setName]  = useState(initial?.name||"");
  const [amount,setAmt] = useState(initial?.amount||"");
  const [cat,setCat]    = useState(initial?.category||EXPENSE_CATEGORIES[0]);
  const [date,setDate]  = useState(initial?.date||new Date().toISOString().slice(0,10));
  const go = () => { if(!name||!amount) return; onSubmit({...(initial||{}),name,amount:parseFloat(amount),category:cat,date}); };
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Nom"><input value={name} onChange={e=>setName(e.target.value)} placeholder="ex : Restaurant" style={inp}/></Field>
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
        <Field label="Catégorie"><select value={cat} onChange={e=>setCat(e.target.value)} style={sel}>{EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></Field>
        <FormActions onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function IncomeForm({initial,onSubmit,onClose,title}: any) {
  const [type,setType]     = useState(initial?.type||INCOME_TYPES[0]);
  const [custom,setCustom] = useState("");
  const [amount,setAmt]    = useState(initial?.amount||"");
  const go = () => {
    if(!amount) return;
    onSubmit({...(initial||{}),type:type==="Autre"&&custom?custom:type,amount:parseFloat(amount)});
  };
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Source de revenu"><select value={type} onChange={e=>setType(e.target.value)} style={sel}>{INCOME_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
        {type==="Autre" && <Field label="Préciser"><input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="ex : Bonus" style={inp}/></Field>}
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
        <FormActions onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function SavingForm({initial,onSubmit,onClose,title}: any) {
  const [name,setName]  = useState(initial?.name||"");
  const [amount,setAmt] = useState(initial?.amount||"");
  const [type,setType]  = useState(initial?.type||SAVINGS_TYPES[0]);
  const [loc,setLoc]    = useState(initial?.location||"");
  const go = () => { if(!name||!amount) return; onSubmit({...(initial||{}),name,amount:parseFloat(amount),type,location:loc}); };
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Nom"><input value={name} onChange={e=>setName(e.target.value)} placeholder="ex : Épargne vacances" style={inp}/></Field>
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
        <Field label="Type"><select value={type} onChange={e=>setType(e.target.value)} style={sel}>{SAVINGS_TYPES.map(t=><option key={t}>{t}</option>)}</select></Field>
        <Field label="Emplacement"><input value={loc} onChange={e=>setLoc(e.target.value)} placeholder="ex : Boursorama" style={inp}/></Field>
        <FormActions onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}

// ─── Pro Forms ───
function InvoiceForm({initial,onSubmit,onClose,title}: any) {
  const [client,setClient]   = useState(initial?.client||"");
  const [desc,setDesc]       = useState(initial?.description||"");
  const [amtHT,setAmtHT]     = useState(initial?.amount_ht||"");
  const [tvaRate,setTvaRate] = useState(initial?.tva_rate??20);
  const [status,setStatus]   = useState(initial?.status||"facturé");
  const [date,setDate]       = useState(initial?.date||new Date().toISOString().slice(0,10));
  const tvaAmt = amtHT ? parseFloat(amtHT)*Number(tvaRate)/100 : 0;
  const ttc    = amtHT ? parseFloat(amtHT)+tvaAmt : 0;
  const go = () => {
    if(!client||!amtHT) return;
    const ht = parseFloat(amtHT);
    const tva_amount = ht*Number(tvaRate)/100;
    onSubmit({...(initial||{}),client,description:desc,amount_ht:ht,tva_rate:Number(tvaRate),tva_amount,amount_ttc:ht+tva_amount,status,date});
  };
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Client"><input value={client} onChange={e=>setClient(e.target.value)} placeholder="ex : Acme Corp" style={inp}/></Field>
        <Field label="Désignation"><input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="ex : Dev web — Juillet" style={inp}/></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Montant HT (€)"><input type="number" value={amtHT} onChange={e=>setAmtHT(e.target.value)} placeholder="0" style={inp}/></Field>
          <Field label="TVA (%)"><select value={tvaRate} onChange={e=>setTvaRate(e.target.value)} style={sel}>{TVA_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></Field>
        </div>
        {amtHT && (
          <div style={{background:"rgba(27,77,110,0.05)",borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:12,color:text2}}>TVA : {fmt(tvaAmt)}</div>
            <div style={{fontSize:16,fontWeight:600,color:ocean,fontFamily:serif}}>TTC : {fmt(ttc)}</div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Statut"><select value={status} onChange={e=>setStatus(e.target.value)} style={sel}>{INVOICE_STATUSES.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}</select></Field>
          <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></Field>
        </div>
        <FormActions onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function ProExpenseForm({initial,onSubmit,onClose,title}: any) {
  const [name,setName]       = useState(initial?.name||"");
  const [cat,setCat]         = useState(initial?.category||PRO_EXPENSE_CATS[0]);
  const [amtHT,setAmtHT]     = useState(initial?.amount_ht||"");
  const [tvaRate,setTvaRate] = useState(initial?.tva_rate??20);
  const [date,setDate]       = useState(initial?.date||new Date().toISOString().slice(0,10));
  const tvaAmt = amtHT ? parseFloat(amtHT)*Number(tvaRate)/100 : 0;
  const ttc    = amtHT ? parseFloat(amtHT)+tvaAmt : 0;
  const go = () => {
    if(!name||!amtHT) return;
    const ht = parseFloat(amtHT);
    const tva_amount = ht*Number(tvaRate)/100;
    onSubmit({...(initial||{}),name,category:cat,amount_ht:ht,tva_rate:Number(tvaRate),tva_amount,amount_ttc:ht+tva_amount,date});
  };
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Libellé"><input value={name} onChange={e=>setName(e.target.value)} placeholder="ex : Abonnement Notion" style={inp}/></Field>
        <Field label="Catégorie"><select value={cat} onChange={e=>setCat(e.target.value)} style={sel}>{PRO_EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Field label="Montant HT (€)"><input type="number" value={amtHT} onChange={e=>setAmtHT(e.target.value)} placeholder="0" style={inp}/></Field>
          <Field label="TVA (%)"><select value={tvaRate} onChange={e=>setTvaRate(e.target.value)} style={sel}>{TVA_RATES.map(r=><option key={r} value={r}>{r}%</option>)}</select></Field>
        </div>
        {amtHT && (
          <div style={{background:"rgba(193,68,62,0.05)",borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:12,color:text2}}>TVA : {fmt(tvaAmt)}</div>
            <div style={{fontSize:16,fontWeight:600,color:basque,fontFamily:serif}}>TTC : {fmt(ttc)}</div>
          </div>
        )}
        <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></Field>
        <FormActions onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function TreasuryModal({current,onSubmit,onClose}: any) {
  const [balance,setBalance]     = useState(current?.balance||"");
  const [threshold,setThreshold] = useState(current?.alert_threshold||"");
  const go = () => onSubmit({balance:parseFloat(balance)||0,alert_threshold:parseFloat(threshold)||0});
  return (
    <Modal title="Trésorerie" onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Solde actuel (€)"><input type="number" value={balance} onChange={e=>setBalance(e.target.value)} placeholder="0" style={inp}/></Field>
        <Field label="Seuil d'alerte (€)"><input type="number" value={threshold} onChange={e=>setThreshold(e.target.value)} placeholder="ex : 5000" style={inp}/></Field>
        <FormActions onClose={onClose} onSubmit={go} isEdit={true}/>
      </div>
    </Modal>
  );
}

// ─── Login ───
function LoginScreen({onLogin}: any) {
  const [email,setEmail]     = useState("");
  const [pass,setPass]       = useState("");
  const [loginMode,setLM]    = useState<"login"|"register">("login");
  const [err,setErr]         = useState("");
  const [msg,setMsg]         = useState("");
  const [busy,setBusy]       = useState(false);
  const submit = async () => {
    if(!email||!pass){setErr("Remplissez tous les champs");return}
    setBusy(true);setErr("");setMsg("");
    if(loginMode==="register"){
      const {error}=await supabase.auth.signUp({email,password:pass});
      if(error){setErr(error.message);setBusy(false);return}
      setMsg("Vérifiez votre email pour confirmer votre inscription.");
    } else {
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
          <h1 style={{fontFamily:serif,fontSize:36,color:text,margin:0,fontWeight:400,letterSpacing:"-0.5px",lineHeight:1.15}}>
            {loginMode==="login"?"Bon retour.":"Créer un compte."}
          </h1>
          <p style={{color:text3,fontSize:14,marginTop:10}}>
            {loginMode==="login"?"Connectez-vous à votre espace":"Commencez à suivre vos finances"}
          </p>
        </div>
        <div style={{...card,padding:"36px 32px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Adresse e-mail" type="email" onKeyDown={e=>e.key==="Enter"&&submit()} style={inp}/>
            <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="Mot de passe" type="password" onKeyDown={e=>e.key==="Enter"&&submit()} style={inp}/>
            {err && <p style={{color:basque,fontSize:13,margin:0}}>{err}</p>}
            {msg && <p style={{color:sage,fontSize:13,margin:0}}>{msg}</p>}
            <button onClick={submit} disabled={busy} style={{...btnP,padding:"13px",fontSize:15,width:"100%",marginTop:4,opacity:busy?0.6:1,borderRadius:12}}>
              {busy?"...":(loginMode==="login"?"Se connecter":"Créer le compte")}
            </button>
          </div>
        </div>
        <button onClick={()=>{setLM(loginMode==="login"?"register":"login");setErr("");setMsg("")}}
          style={{background:"none",border:"none",color:text2,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:"16px 0",width:"100%",textAlign:"center"}}>
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
  const [modal,setModal]       = useState<string|null>(null);
  const [editItem,setEditItem] = useState<any>(null);
  const [appMode,setAppMode]   = useState<"perso"|"pro">("perso");
  const [proTab,setProTab]     = useState("pro-dashboard");
  const [tvaView,setTvaView]   = useState<"mois"|"trimestre">("mois");

  const [recurring,setRecurring] = useState<any[]>([]);
  const [expenses,setExpenses]   = useState<any[]>([]);
  const [incomes,setIncomes]     = useState<any[]>([]);
  const [savings,setSavings]     = useState<any[]>([]);

  const [proInvoices,setProInvoices]   = useState<any[]>([]);
  const [proExpenses,setProExpenses]   = useState<any[]>([]);
  const [proTreasury,setProTreasury]   = useState<any>(null);
  const [proQInvoices,setProQInvoices] = useState<any[]>([]);
  const [proQExpenses,setProQExpenses] = useState<any[]>([]);

  const mk     = monthKey(year,month);
  const userId = session?.user?.id;
  const qStart = Math.floor(month/3)*3;
  const qKeys  = [0,1,2].map(i=>monthKey(year,qStart+i));

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setLoading(false)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  const loadPrefs = useCallback(async()=>{
    if(!userId) return;
    const {data}=await supabase.from("user_preferences").select("mode").eq("user_id",userId).maybeSingle();
    if(data?.mode) setAppMode(data.mode);
  },[userId]);

  const loadData = useCallback(async()=>{
    if(!userId) return;
    const [{data:rec},{data:exp},{data:inc},{data:sav}]=await Promise.all([
      supabase.from("recurring_expenses").select("*").eq("user_id",userId).order("created_at"),
      supabase.from("one_time_expenses").select("*").eq("user_id",userId).eq("month_key",mk).order("date"),
      supabase.from("income").select("*").eq("user_id",userId).eq("month_key",mk).order("created_at"),
      supabase.from("savings").select("*").eq("user_id",userId).order("created_at"),
    ]);
    setRecurring(rec||[]);setExpenses(exp||[]);setIncomes(inc||[]);setSavings(sav||[]);
  },[userId,mk]);

  const loadProData = useCallback(async()=>{
    if(!userId) return;
    const qS = Math.floor(month/3)*3;
    const qK = [0,1,2].map(i=>monthKey(year,qS+i));
    const [{data:inv},{data:exp},{data:qInv},{data:qExp},{data:trea}]=await Promise.all([
      supabase.from("pro_invoices").select("*").eq("user_id",userId).eq("month_key",mk).order("date"),
      supabase.from("pro_expenses").select("*").eq("user_id",userId).eq("month_key",mk).order("date"),
      supabase.from("pro_invoices").select("*").eq("user_id",userId).in("month_key",qK).order("date"),
      supabase.from("pro_expenses").select("*").eq("user_id",userId).in("month_key",qK).order("date"),
      supabase.from("pro_treasury").select("*").eq("user_id",userId).maybeSingle(),
    ]);
    setProInvoices(inv||[]);setProExpenses(exp||[]);setProQInvoices(qInv||[]);setProQExpenses(qExp||[]);setProTreasury(trea||null);
  },[userId,mk]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{
    if(!userId) return;
    loadPrefs();loadData();loadProData();
  },[userId,mk]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMode = async(m:"perso"|"pro")=>{
    setAppMode(m);
    await supabase.from("user_preferences").upsert({user_id:userId,mode:m},{onConflict:"user_id"});
  };

  const persoC = useMemo(()=>{
    const totalRecurring = recurring.reduce((s,r)=>s+Number(r.amount),0);
    const totalOneTime   = expenses.reduce((s,e)=>s+Number(e.amount),0);
    const totalSpent     = totalRecurring+totalOneTime;
    const totalSavings   = savings.reduce((s,e)=>s+Number(e.amount),0);
    const budget         = incomes.reduce((s,i)=>s+Number(i.amount),0);
    const remaining      = budget-totalSpent;
    return {totalRecurring,totalOneTime,totalSpent,totalSavings,budget,remaining};
  },[recurring,expenses,incomes,savings]);

  const proC = useMemo(()=>{
    const caTotal    = proInvoices.reduce((s,i)=>s+Number(i.amount_ht),0);
    const caHT       = proInvoices.filter(i=>i.status==="encaissé").reduce((s,i)=>s+Number(i.amount_ht),0);
    const chargesHT  = proExpenses.reduce((s,e)=>s+Number(e.amount_ht),0);
    const tvaC       = proInvoices.filter(i=>i.status==="encaissé").reduce((s,i)=>s+Number(i.tva_amount),0);
    const tvaD       = proExpenses.reduce((s,e)=>s+Number(e.tva_amount),0);
    const tvaDue     = tvaC-tvaD;
    const resultat   = caHT-chargesHT;
    const qCaHT      = proQInvoices.filter(i=>i.status==="encaissé").reduce((s,i)=>s+Number(i.amount_ht),0);
    const qChargesHT = proQExpenses.reduce((s,e)=>s+Number(e.amount_ht),0);
    const qTvaC      = proQInvoices.filter(i=>i.status==="encaissé").reduce((s,i)=>s+Number(i.tva_amount),0);
    const qTvaD      = proQExpenses.reduce((s,e)=>s+Number(e.tva_amount),0);
    return {caTotal,caHT,chargesHT,tvaC,tvaD,tvaDue,resultat,qCaHT,qChargesHT,qTvaC,qTvaD,qTvaDue:qTvaC-qTvaD};
  },[proInvoices,proExpenses,proQInvoices,proQExpenses]);

  // ─── Perso CRUD ───
  const addRecurring  = async(i)=>{await supabase.from("recurring_expenses").insert({user_id:userId,name:i.name,amount:i.amount,category:i.category});loadData();setModal(null)};
  const editRecurring = async(i)=>{await supabase.from("recurring_expenses").update({name:i.name,amount:i.amount,category:i.category}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delRecurring  = async(id)=>{await supabase.from("recurring_expenses").delete().eq("id",id);loadData()};
  const addExpense    = async(i)=>{await supabase.from("one_time_expenses").insert({user_id:userId,name:i.name,amount:i.amount,category:i.category,date:i.date,month_key:mk});loadData();setModal(null)};
  const editExpense   = async(i)=>{await supabase.from("one_time_expenses").update({name:i.name,amount:i.amount,category:i.category,date:i.date}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delExpense    = async(id)=>{await supabase.from("one_time_expenses").delete().eq("id",id);loadData()};
  const addIncome     = async(i)=>{await supabase.from("income").insert({user_id:userId,month_key:mk,type:i.type,amount:i.amount});loadData();setModal(null)};
  const editIncome    = async(i)=>{await supabase.from("income").update({type:i.type,amount:i.amount}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delIncome     = async(id)=>{await supabase.from("income").delete().eq("id",id);loadData()};
  const addSaving     = async(i)=>{await supabase.from("savings").insert({user_id:userId,name:i.name,amount:i.amount,type:i.type,location:i.location});loadData();setModal(null)};
  const editSaving    = async(i)=>{await supabase.from("savings").update({name:i.name,amount:i.amount,type:i.type,location:i.location}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delSaving     = async(id)=>{await supabase.from("savings").delete().eq("id",id);loadData()};

  // ─── Pro CRUD ───
  const addInvoice     = async(i)=>{await supabase.from("pro_invoices").insert({user_id:userId,month_key:mk,...i});loadProData();setModal(null)};
  const editInvoice    = async(i)=>{await supabase.from("pro_invoices").update({client:i.client,description:i.description,amount_ht:i.amount_ht,tva_rate:i.tva_rate,tva_amount:i.tva_amount,amount_ttc:i.amount_ttc,status:i.status,date:i.date}).eq("id",i.id);loadProData();setModal(null);setEditItem(null)};
  const delInvoice     = async(id)=>{await supabase.from("pro_invoices").delete().eq("id",id);loadProData()};
  const addProExpense  = async(i)=>{await supabase.from("pro_expenses").insert({user_id:userId,month_key:mk,...i});loadProData();setModal(null)};
  const editProExpense = async(i)=>{await supabase.from("pro_expenses").update({name:i.name,category:i.category,amount_ht:i.amount_ht,tva_rate:i.tva_rate,tva_amount:i.tva_amount,amount_ttc:i.amount_ttc,date:i.date}).eq("id",i.id);loadProData();setModal(null);setEditItem(null)};
  const delProExpense  = async(id)=>{await supabase.from("pro_expenses").delete().eq("id",id);loadProData()};
  const saveTreasury   = async(i)=>{await supabase.from("pro_treasury").upsert({user_id:userId,...i},{onConflict:"user_id"});loadProData();setModal(null)};

  const closeModal = ()=>{setModal(null);setEditItem(null)};
  const prevMonth  = ()=>{if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1)};
  const nextMonth  = ()=>{if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1)};

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:text3}}>Chargement…</div>;
  if(!session) return <LoginScreen onLogin={setSession}/>;

  const persoTabs = [
    {id:"dashboard",label:"Vue d'ensemble"},
    {id:"income",   label:"Revenus"},
    {id:"recurring",label:"Récurrentes"},
    {id:"expenses", label:"Ponctuelles"},
    {id:"savings",  label:"Épargne"},
  ];
  const proTabs = [
    {id:"pro-dashboard",label:"Vue d'ensemble"},
    {id:"pro-invoices", label:"Facturation"},
    {id:"pro-expenses", label:"Charges"},
    {id:"pro-treasury", label:"Trésorerie"},
    {id:"pro-tva",      label:"TVA"},
  ];
  const activeTabs   = appMode==="perso" ? persoTabs : proTabs;
  const activeTab    = appMode==="perso" ? tab : proTab;
  const setActiveTab = appMode==="perso" ? setTab : setProTab;

  const kpis = [
    {label:"Revenus du mois", value:fmt(persoC.budget), color:ocean, sub:incomes.length?`${incomes.length} source${incomes.length>1?"s":""}` : "Aucun revenu saisi"},
    {label:"Total dépensé",   value:fmt(persoC.totalSpent), color:basque, sub:`Récurrent ${fmt(persoC.totalRecurring)} · Ponctuel ${fmt(persoC.totalOneTime)}`},
    {label:"Reste disponible",value:fmt(persoC.remaining), color:persoC.remaining>=0?sage:basque, sub:persoC.remaining>=0?"En bonne voie":"Dépassement"},
    {label:"Épargne totale",  value:fmt(persoC.totalSavings), color:amber, sub:`${savings.length} placement${savings.length>1?"s":""}`},
  ];
  const proKpis = [
    {label:"CA HT facturé",   value:fmt(proC.caTotal),   color:ocean,   sub:`${proInvoices.length} facture${proInvoices.length>1?"s":""}`},
    {label:"CA HT encaissé",  value:fmt(proC.caHT),      color:sage,    sub:"Factures encaissées"},
    {label:"Charges HT",      value:fmt(proC.chargesHT), color:basque,  sub:`${proExpenses.length} charge${proExpenses.length>1?"s":""}`},
    {label:"Résultat estimé", value:fmt(proC.resultat),  color:proC.resultat>=0?sage:basque, sub:proC.resultat>=0?"Bénéfice":"Déficit"},
    {label:"TVA collectée",   value:fmt(proC.tvaC),      color:amber,   sub:"Sur factures payées"},
    {label:"TVA à reverser",  value:fmt(proC.tvaDue),    color:proC.tvaDue>0?basque:sage, sub:"Collectée − déductible"},
  ];

  return (
    <div style={{minHeight:"100vh"}}>

      {/* ── Header ── */}
      <header style={{padding:"0 32px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(247,245,240,0.92)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${border}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontFamily:serif,fontSize:17,fontWeight:400,color:text,letterSpacing:"-0.2px"}}>Kontu</span>
          {appMode==="pro" && (
            <span style={{fontSize:11,color:text3,fontWeight:500,letterSpacing:"0.5px",borderLeft:`1px solid ${border}`,paddingLeft:12}}>
              Curutchet Consulting
            </span>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{display:"flex",background:"#EDEAE3",borderRadius:50,padding:3,gap:2}}>
            {(["perso","pro"] as const).map(m=>(
              <button key={m} onClick={()=>toggleMode(m)} style={{background:appMode===m?ocean:"transparent",color:appMode===m?"#fff":text2,border:"none",borderRadius:50,padding:"6px 14px",fontSize:12,fontWeight:appMode===m?600:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.15s",textTransform:"capitalize"}}>
                {m}
              </button>
            ))}
          </div>
          <span style={{fontSize:12,color:text3,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{session.user.email}</span>
          <button onClick={async()=>{await supabase.auth.signOut();setSession(null)}} style={{background:"none",border:"none",color:text2,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0}}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── Month selector ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:28,padding:"36px 24px 20px"}}>
        <button onClick={prevMonth} style={{background:"none",border:"none",color:text3,fontSize:22,cursor:"pointer",padding:"6px 10px",lineHeight:1}}>‹</button>
        <div style={{textAlign:"center",minWidth:200}}>
          <div style={{fontFamily:serif,fontSize:30,fontWeight:400,color:text,lineHeight:1}}>{MONTHS_FR[month]}</div>
          <div style={{fontSize:13,color:text3,marginTop:6,letterSpacing:"0.5px"}}>{year}</div>
        </div>
        <button onClick={nextMonth} style={{background:"none",border:"none",color:text3,fontSize:22,cursor:"pointer",padding:"6px 10px",lineHeight:1}}>›</button>
      </div>

      {/* ── Tab nav ── */}
      <div className="tab-scroll" style={{overflowX:"auto",padding:"0 24px 20px",scrollbarWidth:"none"}}>
        <div style={{display:"flex",justifyContent:"center"}}>
          <div style={{display:"flex",gap:4,background:"#EDEAE3",borderRadius:50,padding:"5px",flexShrink:0}}>
            {activeTabs.map(t=>(
              <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{background:activeTab===t.id?ocean:"transparent",color:activeTab===t.id?"#fff":text2,border:"none",borderRadius:50,padding:"9px 18px",fontSize:13,fontWeight:activeTab===t.id?600:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.15s"}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{padding:"0 24px 64px",maxWidth:880,margin:"0 auto"}}>

        {/* ═══ PERSO ═══ */}
        {appMode==="perso" && tab==="dashboard" && (
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
                <button onClick={()=>setTab("income")} style={{background:"none",border:"none",color:ocean,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:500,padding:0}}>Gérer les revenus →</button>
              </div>
              {incomes.length===0 ? <p style={{margin:0,fontSize:14,color:text3}}>Aucun revenu enregistré ce mois-ci.</p> :
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
              {persoC.budget>0 ? (
                <>
                  <div style={{background:"#EDEAE3",borderRadius:50,height:8,overflow:"hidden",display:"flex",marginBottom:16}}>
                    <div style={{width:`${Math.min((persoC.totalRecurring/persoC.budget)*100,100)}%`,background:ocean,height:"100%",transition:"width 0.5s"}}/>
                    <div style={{width:`${Math.min((persoC.totalOneTime/persoC.budget)*100,100)}%`,background:basque,height:"100%",transition:"width 0.5s"}}/>
                  </div>
                  <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                    {[
                      {color:ocean,   label:"Récurrent",  pct:(persoC.totalRecurring/persoC.budget)*100},
                      {color:basque,  label:"Ponctuel",   pct:(persoC.totalOneTime/persoC.budget)*100},
                      {color:"#D5E8C8",label:"Disponible",pct:Math.max(0,(persoC.remaining/persoC.budget)*100)},
                    ].map(l=>(
                      <div key={l.label} style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{width:10,height:10,borderRadius:2,background:l.color,display:"inline-block",flexShrink:0}}/>
                        <span style={{fontSize:12,color:text2}}>{l.label}</span>
                        <span style={{fontSize:12,color:text3,fontWeight:600}}>{l.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p style={{margin:0,fontSize:14,color:text3}}>Ajoutez un revenu pour voir la répartition.</p>}
            </div>
            <div style={{...card,padding:"28px 26px"}}>
              <h3 style={{margin:"0 0 20px",fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>Dépenses par catégorie</h3>
              {(()=>{
                const all=[...recurring,...expenses];
                const cats:{[k:string]:number}={};
                all.forEach(e=>{cats[e.category]=(cats[e.category]||0)+Number(e.amount)});
                const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
                if(!sorted.length) return <p style={{margin:0,fontSize:14,color:text3}}>Aucune dépense ce mois.</p>;
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

        {appMode==="perso" && tab==="income" && (
          <div>
            <SectionHead title="Revenus" sub={`${MONTHS_FR[month]} ${year} · Total : ${fmt(persoC.budget)}`} action={<button onClick={()=>setModal("addIncome")} style={btnP}>+ Ajouter</button>}/>
            {incomes.length===0 ? <Empty label="Aucun revenu ce mois"/> :
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
                <div style={{...card,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",borderColor:"rgba(91,123,106,0.2)",background:"rgba(91,123,106,0.04)"}}>
                  <span style={{fontSize:13,color:text2,fontWeight:600}}>Total revenus</span>
                  <span style={{fontSize:22,fontWeight:400,color:sage,fontFamily:serif}}>{fmt(persoC.budget)}</span>
                </div>
              </div>
            }
          </div>
        )}

        {appMode==="perso" && tab==="recurring" && (
          <div>
            <SectionHead title="Dépenses récurrentes" sub={`${fmt(persoC.totalRecurring)} / mois`} action={<button onClick={()=>setModal("addRecurring")} style={btnP}>+ Ajouter</button>}/>
            {recurring.length===0 ? <Empty label="Aucune dépense récurrente"/> :
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

        {appMode==="perso" && tab==="expenses" && (
          <div>
            <SectionHead title="Dépenses ponctuelles" sub={`${MONTHS_FR[month]} ${year} · ${fmt(persoC.totalOneTime)}`} action={<button onClick={()=>setModal("addExpense")} style={btnP}>+ Ajouter</button>}/>
            {expenses.length===0 ? <Empty label="Aucune dépense ponctuelle ce mois"/> :
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {expenses.map(e=>(
                  <div key={e.id} className="row" style={{...card,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:3,height:28,borderRadius:2,background:basque,flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:15,fontWeight:500,color:text}}>{e.name}</div>
                        <div style={{fontSize:12,color:text3,marginTop:2}}>{e.category}{e.date?` · ${e.date}`:""}</div>
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

        {appMode==="perso" && tab==="savings" && (
          <div>
            <SectionHead title="Épargne" sub={`Total : ${fmt(persoC.totalSavings)}`} action={<button onClick={()=>setModal("addSaving")} style={btnP}>+ Ajouter</button>}/>
            {savings.length===0 ? <Empty label="Aucune épargne enregistrée"/> :
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
                {savings.map(s=>(
                  <div key={s.id} style={{...card,padding:"24px 22px",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:amber}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:11,color:text3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>{s.type}</div>
                        <div style={{fontSize:26,fontWeight:400,color:amber,fontFamily:serif,lineHeight:1,letterSpacing:"-0.3px"}}>{fmt(s.amount)}</div>
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

        {/* ═══ PRO ═══ */}
        {appMode==="pro" && proTab==="pro-dashboard" && (
          <div style={{display:"flex",flexDirection:"column",gap:24}}>
            {proTreasury && proTreasury.alert_threshold>0 && proTreasury.balance<proTreasury.alert_threshold && (
              <div style={{background:"rgba(193,68,62,0.08)",border:`1px solid rgba(193,68,62,0.2)`,borderRadius:14,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:basque,fontWeight:500}}>⚠ Trésorerie en dessous du seuil d'alerte ({fmt(proTreasury.alert_threshold)})</span>
                <span style={{fontSize:15,fontWeight:700,color:basque}}>{fmt(proTreasury.balance)}</span>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14}}>
              {proKpis.map((k,i)=>(
                <div key={i} style={{...card,padding:"26px 22px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:k.color}}/>
                  <div style={{fontSize:11,color:text2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>{k.label}</div>
                  <div style={{fontSize:28,fontWeight:400,color:k.color,fontFamily:serif,lineHeight:1,letterSpacing:"-0.3px"}}>{k.value}</div>
                  <div style={{fontSize:12,color:text3,marginTop:10,lineHeight:1.5}}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{...card,padding:"28px 26px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <h3 style={{margin:0,fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>Trésorerie</h3>
                <button onClick={()=>setModal("treasury")} style={{background:"none",border:"none",color:ocean,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:500,padding:0}}>Mettre à jour →</button>
              </div>
              {proTreasury ? (
                <div style={{display:"flex",alignItems:"baseline",gap:16}}>
                  <span style={{fontSize:36,fontWeight:400,fontFamily:serif,color:proTreasury.alert_threshold>0&&proTreasury.balance<proTreasury.alert_threshold?basque:sage}}>{fmt(proTreasury.balance)}</span>
                  {proTreasury.alert_threshold>0 && <span style={{fontSize:13,color:text3}}>seuil : {fmt(proTreasury.alert_threshold)}</span>}
                </div>
              ) : <p style={{margin:0,fontSize:14,color:text3}}>Aucun solde enregistré.</p>}
            </div>
            <div style={{...card,padding:"28px 26px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:20}}>
                <h3 style={{margin:0,fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>Dernières factures — {MONTHS_FR[month]}</h3>
                <button onClick={()=>setProTab("pro-invoices")} style={{background:"none",border:"none",color:ocean,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:500,padding:0}}>Gérer →</button>
              </div>
              {proInvoices.length===0 ? <p style={{margin:0,fontSize:14,color:text3}}>Aucune facture ce mois.</p> :
                proInvoices.slice(0,5).map((inv,i)=>(
                  <div key={inv.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<Math.min(proInvoices.length,5)-1?`1px solid #F2EFE9`:"none"}}>
                    <div>
                      <span style={{fontSize:14,fontWeight:500,color:text}}>{inv.client}</span>
                      {inv.description && <span style={{fontSize:12,color:text3,marginLeft:8}}>{inv.description}</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:50,background:`${STATUS_COLORS[inv.status]}22`,color:STATUS_COLORS[inv.status]}}>{STATUS_LABELS[inv.status]||inv.status}</span>
                      <span style={{fontSize:15,fontWeight:600,color:ocean}}>{fmt(inv.amount_ht)} HT</span>
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {appMode==="pro" && proTab==="pro-invoices" && (
          <div>
            <SectionHead title="Facturation" sub={`${MONTHS_FR[month]} ${year} · CA HT : ${fmt(proC.caTotal)}`} action={<button onClick={()=>setModal("addInvoice")} style={btnP}>+ Facture</button>}/>
            {proInvoices.length===0 ? <Empty label="Aucune facture ce mois"/> :
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {proInvoices.map(inv=>(
                  <div key={inv.id} className="row" style={{...card,padding:"20px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                        <span style={{fontSize:15,fontWeight:600,color:text}}>{inv.client}</span>
                        <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:50,background:`${STATUS_COLORS[inv.status]}22`,color:STATUS_COLORS[inv.status]}}>{STATUS_LABELS[inv.status]||inv.status}</span>
                      </div>
                      {inv.description && <div style={{fontSize:13,color:text2,marginBottom:2}}>{inv.description}</div>}
                      <div style={{fontSize:12,color:text3}}>{inv.date}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <div style={{textAlign:"right",marginRight:8}}>
                        <div style={{fontSize:16,fontWeight:700,color:ocean}}>{fmt(inv.amount_ht)} HT</div>
                        <div style={{fontSize:12,color:text3}}>TVA {inv.tva_rate}% · {fmt(inv.amount_ttc)} TTC</div>
                      </div>
                      <button onClick={()=>{setEditItem(inv);setModal("editInvoice")}} style={iconBtn()}>✏</button>
                      <button onClick={()=>delInvoice(inv.id)} style={iconBtn(true)}>✕</button>
                    </div>
                  </div>
                ))}
                <div style={{...card,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(27,77,110,0.04)"}}>
                  <span style={{fontSize:13,color:text2,fontWeight:600}}>Total facturé HT</span>
                  <span style={{fontSize:22,fontWeight:400,color:ocean,fontFamily:serif}}>{fmt(proC.caTotal)}</span>
                </div>
              </div>
            }
          </div>
        )}

        {appMode==="pro" && proTab==="pro-expenses" && (
          <div>
            <SectionHead title="Charges" sub={`${MONTHS_FR[month]} ${year} · Total HT : ${fmt(proC.chargesHT)}`} action={<button onClick={()=>setModal("addProExpense")} style={btnP}>+ Charge</button>}/>
            {proExpenses.length===0 ? <Empty label="Aucune charge ce mois"/> :
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {proExpenses.map(e=>(
                  <div key={e.id} className="row" style={{...card,padding:"20px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:15,fontWeight:600,color:text,marginBottom:3}}>{e.name}</div>
                      <div style={{fontSize:12,color:text3}}>{e.category} · {e.date}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <div style={{textAlign:"right",marginRight:8}}>
                        <div style={{fontSize:16,fontWeight:700,color:basque}}>{fmt(e.amount_ht)} HT</div>
                        <div style={{fontSize:12,color:text3}}>TVA {e.tva_rate}% · {fmt(e.amount_ttc)} TTC</div>
                      </div>
                      <button onClick={()=>{setEditItem(e);setModal("editProExpense")}} style={iconBtn()}>✏</button>
                      <button onClick={()=>delProExpense(e.id)} style={iconBtn(true)}>✕</button>
                    </div>
                  </div>
                ))}
                <div style={{...card,padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(193,68,62,0.04)"}}>
                  <span style={{fontSize:13,color:text2,fontWeight:600}}>Total charges HT</span>
                  <span style={{fontSize:22,fontWeight:400,color:basque,fontFamily:serif}}>{fmt(proC.chargesHT)}</span>
                </div>
              </div>
            }
          </div>
        )}

        {appMode==="pro" && proTab==="pro-treasury" && (
          <div>
            <SectionHead title="Trésorerie" sub="Solde du compte professionnel" action={<button onClick={()=>setModal("treasury")} style={btnP}>Mettre à jour</button>}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
              <div style={{...card,padding:"32px 28px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:proTreasury?.alert_threshold&&proTreasury.balance<proTreasury.alert_threshold?basque:sage}}/>
                <div style={{fontSize:11,color:text2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>Solde actuel</div>
                <div style={{fontSize:36,fontWeight:400,fontFamily:serif,lineHeight:1,color:proTreasury?.alert_threshold&&proTreasury.balance<proTreasury.alert_threshold?basque:sage}}>
                  {proTreasury ? fmt(proTreasury.balance) : "—"}
                </div>
              </div>
              <div style={{...card,padding:"32px 28px",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:amber}}/>
                <div style={{fontSize:11,color:text2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>Seuil d'alerte</div>
                <div style={{fontSize:36,fontWeight:400,fontFamily:serif,lineHeight:1,color:amber}}>
                  {proTreasury?.alert_threshold ? fmt(proTreasury.alert_threshold) : "—"}
                </div>
              </div>
            </div>
            {!proTreasury && <Empty label="Aucun solde enregistré. Cliquez sur «Mettre à jour» pour commencer."/>}
          </div>
        )}

        {appMode==="pro" && proTab==="pro-tva" && (
          <div>
            <SectionHead
              title="TVA"
              sub={tvaView==="mois" ? `${MONTHS_FR[month]} ${year}` : `T${Math.floor(month/3)+1} ${year}`}
              action={
                <div style={{display:"flex",gap:4,background:"#EDEAE3",borderRadius:50,padding:3}}>
                  {(["mois","trimestre"] as const).map(v=>(
                    <button key={v} onClick={()=>setTvaView(v)} style={{background:tvaView===v?ocean:"transparent",color:tvaView===v?"#fff":text2,border:"none",borderRadius:50,padding:"7px 14px",fontSize:12,fontWeight:tvaView===v?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                      {v==="mois"?"Mois":"Trimestre"}
                    </button>
                  ))}
                </div>
              }
            />
            {(()=>{
              const collectee  = tvaView==="mois" ? proC.tvaC      : proC.qTvaC;
              const deductible = tvaView==="mois" ? proC.tvaD      : proC.qTvaD;
              const due        = tvaView==="mois" ? proC.tvaDue    : proC.qTvaDue;
              const caHT       = tvaView==="mois" ? proC.caHT      : proC.qCaHT;
              const chargesHT  = tvaView==="mois" ? proC.chargesHT : proC.qChargesHT;
              return (
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14}}>
                    {[
                      {label:"TVA collectée",  value:collectee,  color:ocean,              sub:"Sur factures payées"},
                      {label:"TVA déductible", value:deductible, color:sage,               sub:"Sur charges"},
                      {label:"TVA à reverser", value:due,        color:due>0?basque:sage,  sub:due>0?"À régler":"Crédit TVA"},
                    ].map((k,i)=>(
                      <div key={i} style={{...card,padding:"26px 22px",position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:k.color}}/>
                        <div style={{fontSize:11,color:text2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>{k.label}</div>
                        <div style={{fontSize:28,fontWeight:400,color:k.color,fontFamily:serif,lineHeight:1}}>{fmt(k.value)}</div>
                        <div style={{fontSize:12,color:text3,marginTop:10}}>{k.sub}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{...card,padding:"28px 26px"}}>
                    <h3 style={{margin:"0 0 20px",fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>Détail</h3>
                    {[
                      {label:"CA HT encaissé",  value:caHT,       color:ocean},
                      {label:"Charges HT",       value:chargesHT,  color:basque},
                      {label:"TVA collectée",    value:collectee,  color:ocean},
                      {label:"TVA déductible",   value:deductible, color:sage},
                      {label:"Net à reverser",   value:due,        color:due>0?basque:sage},
                    ].map((row,i,arr)=>(
                      <div key={row.label} style={{display:"flex",justifyContent:"space-between",padding:"12px 0",borderBottom:i<arr.length-1?`1px solid #F2EFE9`:"none"}}>
                        <span style={{fontSize:14,color:text2}}>{row.label}</span>
                        <span style={{fontSize:15,fontWeight:i===arr.length-1?700:500,color:row.color}}>{fmt(row.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Perso Modals ── */}
      {(modal==="addIncome"||modal==="editIncome") && <IncomeForm initial={editItem} onSubmit={modal==="editIncome"?editIncome:addIncome} onClose={closeModal} title={modal==="editIncome"?"Modifier le revenu":"Nouveau revenu"}/>}
      {(modal==="addRecurring"||modal==="editRecurring") && <RecurringForm initial={editItem} onSubmit={modal==="editRecurring"?editRecurring:addRecurring} onClose={closeModal} title={modal==="editRecurring"?"Modifier la dépense":"Nouvelle dépense récurrente"}/>}
      {(modal==="addExpense"||modal==="editExpense") && <ExpenseForm initial={editItem} onSubmit={modal==="editExpense"?editExpense:addExpense} onClose={closeModal} title={modal==="editExpense"?"Modifier la dépense":"Nouvelle dépense ponctuelle"}/>}
      {(modal==="addSaving"||modal==="editSaving") && <SavingForm initial={editItem} onSubmit={modal==="editSaving"?editSaving:addSaving} onClose={closeModal} title={modal==="editSaving"?"Modifier l'épargne":"Nouvelle épargne"}/>}

      {/* ── Pro Modals ── */}
      {(modal==="addInvoice"||modal==="editInvoice") && <InvoiceForm initial={editItem} onSubmit={modal==="editInvoice"?editInvoice:addInvoice} onClose={closeModal} title={modal==="editInvoice"?"Modifier la facture":"Nouvelle facture"}/>}
      {(modal==="addProExpense"||modal==="editProExpense") && <ProExpenseForm initial={editItem} onSubmit={modal==="editProExpense"?editProExpense:addProExpense} onClose={closeModal} title={modal==="editProExpense"?"Modifier la charge":"Nouvelle charge"}/>}
      {modal==="treasury" && <TreasuryModal current={proTreasury} onSubmit={saveTreasury} onClose={closeModal}/>}
    </div>
  );
}
