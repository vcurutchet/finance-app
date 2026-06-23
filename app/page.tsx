"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_S  = ["Jan","Fév","Mars","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const fmt = (n: number) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const monthKey = (y: number, m: number) => `${y}-${String(m+1).padStart(2,"0")}`;

const EXPENSE_CATS   = ["🏠 Loyer","🚗 Transport","🛒 Courses","🍽️ Restaurant","📱 Abonnements","⚡ Énergie","💊 Santé","🎭 Loisirs","👕 Vêtements","🎓 Éducation","🐾 Animaux","🔧 Divers"];
const SAVINGS_TYPES  = ["Livret A","LDDS","PEL","Assurance Vie","PEA","Compte Titre","Crypto","Autre"];
const INCOME_TYPES   = ["CA 2026","CA 2025","Salaire","Freelance","Dividendes","Loyer perçu","Prime","Remboursement","Autre"];
const EXIT_CATS      = ["TVA","Frais pro","Salaire","PER / Assurance vie","Charges sociales","Divers"];
const ENTRY_SUGGESTIONS = [
  ...MONTHS_FR.map(m=>`CA ${m} 2026`),
  "CA Novembre 2025","CA Décembre 2025",
  "Salaire exceptionnel","Dividendes","Remboursement TVA","Remboursement URSSAF","Autre",
];

const ocean="#1B4D6E", sage="#5B7B6A", basque="#C1443E", amber="#A0845C";
const text="#2D3436", text2="#7F8C9B", text3="#B0BEC5", border="#E8E4DC";
const serif="'DM Serif Display',serif";

const inp: React.CSSProperties = {background:"#FAFAF8",border:`1.5px solid ${border}`,borderRadius:10,padding:"12px 16px",color:text,fontSize:15,outline:"none",fontFamily:"'DM Sans',sans-serif",width:"100%",transition:"border-color 0.15s"};
const sel: React.CSSProperties = {...inp,appearance:"none" as const,backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%237F8C9B' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 16px center"};
const btnP: React.CSSProperties = {background:ocean,color:"#fff",border:"none",borderRadius:50,padding:"10px 22px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.1px",whiteSpace:"nowrap"};
const btnG: React.CSSProperties = {background:"transparent",border:`1.5px solid ${border}`,borderRadius:50,padding:"10px 22px",color:text2,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"};
const card: React.CSSProperties = {background:"#FFF",border:"1px solid #EDEAE3",borderRadius:20,boxShadow:"0 1px 3px rgba(45,52,54,0.04),0 4px 20px rgba(45,52,54,0.06)"};
const iconBtn = (danger=false): React.CSSProperties => ({background:danger?"rgba(193,68,62,0.07)":"rgba(45,52,54,0.04)",border:"none",borderRadius:8,width:34,height:34,color:danger?basque:text2,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0});

// ─── Shared UI ───
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
function EntryForm({initial,onSubmit,onClose,title}: any) {
  const [type,setType]=useState(initial?.type||"");
  const [amount,setAmt]=useState(initial?.amount||"");
  const [date,setDate]=useState(initial?.date||new Date().toISOString().slice(0,10));
  const go=()=>{if(!type||!amount)return;onSubmit({...(initial||{}),type,amount:parseFloat(amount),date})};
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Type / Origine">
          <input list="entry-type-list" value={type} onChange={e=>setType(e.target.value)} placeholder="ex : CA Janvier 2026" style={inp}/>
          <datalist id="entry-type-list">{ENTRY_SUGGESTIONS.map(t=><option key={t} value={t}/>)}</datalist>
        </Field>
        <Field label="Montant TTC (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
        <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></Field>
        <FA onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}
function ExitForm({initial,onSubmit,onClose,title}: any) {
  const [cat,setCat]=useState(initial?.category||EXIT_CATS[0]);
  const [label,setLabel]=useState(initial?.label||"");
  const [amount,setAmt]=useState(initial?.amount||"");
  const [date,setDate]=useState(initial?.date||new Date().toISOString().slice(0,10));
  const go=()=>{if(!amount)return;onSubmit({...(initial||{}),category:cat,label,amount:parseFloat(amount),date})};
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Catégorie"><select value={cat} onChange={e=>setCat(e.target.value)} style={sel}>{EXIT_CATS.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Libellé (optionnel)"><input value={label} onChange={e=>setLabel(e.target.value)} placeholder="ex : Acompte TVA T1" style={inp}/></Field>
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
        <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/></Field>
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
        <button onClick={()=>{setLM(loginMode==="login"?"register":"login");setErr("");setMsg("")}} style={{background:"none",border:"none",color:text2,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:"16px 0",width:"100%",textAlign:"center"}}>
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
  const [proTab,setProTab]     = useState("pro-cashflow");
  const [modal,setModal]       = useState<string|null>(null);
  const [editItem,setEditItem] = useState<any>(null);
  const [appMode,setAppMode]   = useState<"perso"|"pro">("perso");

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
    const [{data:ent},{data:ext},{data:aEnt},{data:aExt},{data:trea}]=await Promise.all([
      supabase.from("pro_entries").select("*").eq("user_id",userId).eq("month_key",mk).order("date"),
      supabase.from("pro_exits").select("*").eq("user_id",userId).eq("month_key",mk).order("date"),
      supabase.from("pro_entries").select("*").eq("user_id",userId).in("month_key",yearKeys),
      supabase.from("pro_exits").select("*").eq("user_id",userId).in("month_key",yearKeys),
      supabase.from("pro_treasury").select("*").eq("user_id",userId).maybeSingle(),
    ]);
    setProEntries(ent||[]);setProExits(ext||[]);
    setAllEntries(aEnt||[]);setAllExits(aExt||[]);
    setProTreasury(trea||null);
  },[userId,mk,year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(()=>{
    if(!userId)return;
    loadPrefs();loadData();loadProData();
  },[userId,mk]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMode=async(m:"perso"|"pro")=>{
    setAppMode(m);
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
    const bycat=(cat: string)=>proExits.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.amount),0);
    const totalEntrees=proEntries.reduce((s,e)=>s+Number(e.amount),0);
    const totalSorties=proExits.reduce((s,e)=>s+Number(e.amount),0);
    const tvaCalc=totalEntrees/6;
    const tvaReelle=bycat("TVA");
    const frais=bycat("Frais pro");
    const salaire=bycat("Salaire");
    const per=bycat("PER / Assurance vie");
    const chargesPay=bycat("Charges sociales");
    const chargesCalc=0.45*(salaire+per);
    const divers=bycat("Divers");
    const totalDepenses=frais+salaire+per+chargesPay+divers;
    const benefice=totalEntrees/1.2-totalDepenses;
    return {totalEntrees,totalSorties,netMois:totalEntrees-totalSorties,tvaCalc,tvaReelle,frais,salaire,per,chargesPay,chargesCalc,totalDepenses,benefice,is:Math.max(0,benefice*0.15)};
  },[proEntries,proExits]);

  // Pro annual table (all 12 months of current year)
  const proAnnual=useMemo(()=>{
    const initBal=proTreasury?.initial_balance||0;
    let cum=initBal;
    return Array.from({length:12},(_,i)=>{
      const k=monthKey(year,i);
      const ents=allEntries.filter(e=>e.month_key===k);
      const exts=allExits.filter(e=>e.month_key===k);
      const bycat=(cat: string)=>exts.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.amount),0);
      const caTTC=ents.reduce((s,e)=>s+Number(e.amount),0);
      const tvaCalc=caTTC/6;
      const tvaReelle=bycat("TVA");
      const frais=bycat("Frais pro");
      const salaire=bycat("Salaire");
      const per=bycat("PER / Assurance vie");
      const chargesPay=bycat("Charges sociales");
      const chargesCalc=0.45*(salaire+per);
      const divers=bycat("Divers");
      const totalDepenses=frais+salaire+per+chargesPay+divers;
      const benefice=caTTC/1.2-totalDepenses;
      const is=Math.max(0,benefice*0.15);
      const totalSorties=exts.reduce((s,e)=>s+Number(e.amount),0);
      const tresoMois=caTTC-totalSorties;
      cum+=tresoMois;
      return {label:MONTHS_S[i],k,caTTC,tvaCalc,tvaReelle,frais,salaire,per,chargesPay,chargesCalc,totalDepenses,benefice,is,tresoMois,tresoTotale:cum,hasData:ents.length>0||exts.length>0};
    });
  },[allEntries,allExits,proTreasury,year]);

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
  const addEntry    = async(i: any)=>{await supabase.from("pro_entries").insert({user_id:userId,month_key:mk,type:i.type,amount:i.amount,date:i.date});loadProData();setModal(null)};
  const editEntry   = async(i: any)=>{await supabase.from("pro_entries").update({type:i.type,amount:i.amount,date:i.date}).eq("id",i.id);loadProData();setModal(null);setEditItem(null)};
  const delEntry    = async(id: string)=>{await supabase.from("pro_entries").delete().eq("id",id);loadProData()};
  const addExit     = async(i: any)=>{await supabase.from("pro_exits").insert({user_id:userId,month_key:mk,category:i.category,label:i.label,amount:i.amount,date:i.date});loadProData();setModal(null)};
  const editExit    = async(i: any)=>{await supabase.from("pro_exits").update({category:i.category,label:i.label,amount:i.amount,date:i.date}).eq("id",i.id);loadProData();setModal(null);setEditItem(null)};
  const delExit     = async(id: string)=>{await supabase.from("pro_exits").delete().eq("id",id);loadProData()};
  const saveInitBal = async(bal: number)=>{
    await supabase.from("pro_treasury").upsert({user_id:userId,initial_balance:bal,balance:bal,alert_threshold:proTreasury?.alert_threshold||0},{onConflict:"user_id"});
    loadProData();setModal(null);
  };

  const closeModal=()=>{setModal(null);setEditItem(null)};
  const prevMonth=()=>{if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1)};
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
    {id:"pro-cashflow", label:"Trésorerie"},
    {id:"pro-annual",   label:"Bilan annuel"},
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
          <button onClick={async()=>{await supabase.auth.signOut();setSession(null)}} style={{background:"none",border:"none",color:text2,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0}}>Déconnexion</button>
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
              <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{background:activeTab===t.id?ocean:"transparent",color:activeTab===t.id?"#fff":text2,border:"none",borderRadius:50,padding:"9px 18px",fontSize:13,fontWeight:activeTab===t.id?600:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.15s"}}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{padding:"0 24px 64px",maxWidth:1100,margin:"0 auto"}}>

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
                <button onClick={()=>setTab("income")} style={{background:"none",border:"none",color:ocean,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:500,padding:0}}>Gérer les revenus →</button>
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

        {/* ══ PRO — Trésorerie mensuelle ══ */}
        {appMode==="pro"&&proTab==="pro-cashflow"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>

            {/* Solde initial */}
            <div style={{...card,padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:11,color:text2,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:4}}>Solde initial — 01/01/2026</div>
                <div style={{fontSize:26,fontWeight:400,fontFamily:serif,color:proTreasury?.initial_balance!=null&&proTreasury.initial_balance>0?ocean:text3}}>
                  {proTreasury?.initial_balance!=null?fmt(proTreasury.initial_balance):"Non défini"}
                </div>
              </div>
              <button onClick={()=>setModal("initBalance")} style={{...btnG,fontSize:12,padding:"8px 16px"}}>
                {proTreasury?.initial_balance!=null?"Modifier":"Définir →"}
              </button>
            </div>

            {/* Entrées / Sorties grid */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

              {/* Entrées */}
              <div style={{...card,padding:"22px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <h3 style={{margin:0,fontSize:15,fontFamily:serif,fontWeight:400,color:text}}>Entrées</h3>
                  <button onClick={()=>setModal("addEntry")} style={{...btnP,padding:"6px 14px",fontSize:12}}>+</button>
                </div>
                {proEntries.length===0?<p style={{margin:0,fontSize:13,color:text3}}>Aucune entrée</p>:
                  <div style={{display:"flex",flexDirection:"column"}}>
                    {proEntries.map((e,i)=>(
                      <div key={e.id} className="row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 4px",borderBottom:i<proEntries.length-1?`1px solid #F2EFE9`:"none"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:500,color:text,lineHeight:1.3}}>{e.type}</div>
                          <div style={{fontSize:11,color:text3}}>{e.date}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontSize:13,fontWeight:600,color:sage,marginRight:4}}>{fmt(e.amount)}</span>
                          <button onClick={()=>{setEditItem(e);setModal("editEntry")}} style={sm()}>✏</button>
                          <button onClick={()=>delEntry(e.id)} style={sm(true)}>✕</button>
                        </div>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid #F2EFE9`}}>
                      <span style={{fontSize:12,color:text3}}>Total</span>
                      <span style={{fontSize:15,fontWeight:600,color:sage}}>{fmt(proC.totalEntrees)}</span>
                    </div>
                  </div>
                }
              </div>

              {/* Sorties */}
              <div style={{...card,padding:"22px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <h3 style={{margin:0,fontSize:15,fontFamily:serif,fontWeight:400,color:text}}>Sorties</h3>
                  <button onClick={()=>setModal("addExit")} style={{...btnP,padding:"6px 14px",fontSize:12,background:basque}}>+</button>
                </div>
                {proExits.length===0?<p style={{margin:0,fontSize:13,color:text3}}>Aucune sortie</p>:
                  <div style={{display:"flex",flexDirection:"column"}}>
                    {proExits.map((e,i)=>(
                      <div key={e.id} className="row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 4px",borderBottom:i<proExits.length-1?`1px solid #F2EFE9`:"none"}}>
                        <div>
                          <div style={{fontSize:13,fontWeight:500,color:text,lineHeight:1.3}}>{e.label||e.category}</div>
                          <div style={{fontSize:11,color:text3}}>{e.label?`${e.category} · `:""}{e.date}</div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:4}}>
                          <span style={{fontSize:13,fontWeight:600,color:basque,marginRight:4}}>{fmt(e.amount)}</span>
                          <button onClick={()=>{setEditItem(e);setModal("editExit")}} style={sm()}>✏</button>
                          <button onClick={()=>delExit(e.id)} style={sm(true)}>✕</button>
                        </div>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:`1px solid #F2EFE9`}}>
                      <span style={{fontSize:12,color:text3}}>Total</span>
                      <span style={{fontSize:15,fontWeight:600,color:basque}}>{fmt(proC.totalSorties)}</span>
                    </div>
                  </div>
                }
              </div>
            </div>

            {/* Récap mensuel */}
            <div style={{...card,padding:"26px"}}>
              <h3 style={{margin:"0 0 18px",fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>Récapitulatif — {MONTHS_FR[month]} {year}</h3>
              {[
                {label:"Total entrées",             val:proC.totalEntrees,              color:sage,  bold:false},
                {label:"Total sorties",              val:proC.totalSorties,              color:basque,bold:false},
                {label:"Différence du mois",         val:proC.netMois,                   color:proC.netMois>=0?sage:basque, bold:true},
                {label:"Trésorerie totale cumulée",  val:proAnnual[month]?.tresoTotale||0, color:ocean, bold:true},
              ].map((row,i,arr)=>(
                <div key={row.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:i<arr.length-1?`1px solid #F2EFE9`:"none"}}>
                  <span style={{fontSize:14,color:text2,fontWeight:row.bold?600:400}}>{row.label}</span>
                  <span style={{fontSize:row.bold?22:15,fontWeight:row.bold?400:600,color:row.color,fontFamily:row.bold?serif:"inherit"}}>{fmt(row.val)}</span>
                </div>
              ))}
            </div>

            {/* Détail sorties par catégorie */}
            {proExits.length>0&&(
              <div style={{...card,padding:"26px"}}>
                <h3 style={{margin:"0 0 16px",fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>Détail des sorties</h3>
                {EXIT_CATS.map(cat=>{
                  const total=proExits.filter(e=>e.category===cat).reduce((s,e)=>s+Number(e.amount),0);
                  if(!total)return null;
                  return (
                    <div key={cat} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid #F2EFE9`}}>
                      <span style={{fontSize:13,color:text}}>{cat}</span>
                      <span style={{fontSize:13,fontWeight:600,color:text2}}>{fmt(total)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ PRO — Bilan annuel ══ */}
        {appMode==="pro"&&proTab==="pro-annual"&&(
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <SectionHead
              title={`Bilan ${year}`}
              sub="Curutchet Consulting — récapitulatif annuel"
              action={
                <div style={{fontSize:12,color:text3,textAlign:"right"}}>
                  Solde initial<br/>
                  <strong style={{color:ocean,fontSize:14}}>{proTreasury?.initial_balance!=null?fmt(proTreasury.initial_balance):"—"}</strong>
                </div>
              }
            />
            <div style={{overflowX:"auto",borderRadius:16,border:`1px solid ${border}`,background:"#FFF",boxShadow:"0 1px 3px rgba(45,52,54,0.04)"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:980}}>
                <thead>
                  <tr style={{background:"#F7F5F0"}}>
                    {[
                      {h:"Mois",         w:60, note:""},
                      {h:"CA TTC",       w:80, note:""},
                      {h:"TVA calc.",    w:72, note:"÷ 6"},
                      {h:"TVA réelle",   w:72, note:"payée"},
                      {h:"Frais pro",    w:72, note:""},
                      {h:"Salaire",      w:72, note:""},
                      {h:"PER / AV",     w:72, note:""},
                      {h:"Charges pay.", w:78, note:"payées"},
                      {h:"Charges calc.",w:78, note:"45%"},
                      {h:"Tot. dép.",    w:72, note:"HT"},
                      {h:"IS calc.",     w:65, note:"15%"},
                      {h:"Tréso mois",   w:80, note:""},
                      {h:"Tréso tot.",   w:80, note:"cumulé"},
                    ].map((h,i)=>(
                      <th key={i} style={{padding:"10px 8px",textAlign:i===0?"left":"right",fontWeight:600,fontSize:10,color:text2,letterSpacing:"0.4px",textTransform:"uppercase",whiteSpace:"nowrap",width:h.w,minWidth:h.w,borderBottom:`1px solid ${border}`}}>
                        {h.h}
                        {h.note&&<span style={{display:"block",fontSize:9,fontWeight:400,color:text3,textTransform:"none",letterSpacing:0}}>{h.note}</span>}
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
                        <td style={{padding:"10px 8px",fontWeight:isCurrent?700:500,color:isCurrent?ocean:text,fontSize:12}}>{row.label}</td>
                        {[
                          {v:row.caTTC,         c:row.caTTC?ocean:text3},
                          {v:row.tvaCalc,       c:text2},
                          {v:row.tvaReelle,     c:row.tvaReelle?basque:text3},
                          {v:row.frais,         c:row.frais?basque:text3},
                          {v:row.salaire,       c:row.salaire?text:text3},
                          {v:row.per,           c:row.per?amber:text3},
                          {v:row.chargesPay,    c:row.chargesPay?basque:text3},
                          {v:row.chargesCalc,   c:text2, italic:true},
                          {v:row.totalDepenses, c:row.totalDepenses?basque:text3},
                          {v:row.is,            c:row.is?basque:text3, italic:true},
                          {v:row.tresoMois,     c:row.tresoMois>0?sage:row.tresoMois<0?basque:text3, bold:true},
                          {v:row.tresoTotale,   c:row.tresoTotale>0?ocean:basque, bold:true},
                        ].map((cell,j)=>(
                          <td key={j} style={{padding:"10px 8px",textAlign:"right",fontWeight:cell.bold?600:400,color:cell.v===0&&!cell.bold?text3:cell.c,fontStyle:cell.italic?"italic":"normal"}}>
                            {cell.v!==0?fmt(cell.v):<span style={{color:text3,opacity:0.3}}>—</span>}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {/* Total row */}
                  {(()=>{
                    const T=(fn: (r: typeof proAnnual[0])=>number)=>proAnnual.reduce((s,r)=>s+fn(r),0);
                    const cols=[T(r=>r.caTTC),T(r=>r.tvaCalc),T(r=>r.tvaReelle),T(r=>r.frais),T(r=>r.salaire),T(r=>r.per),T(r=>r.chargesPay),T(r=>r.chargesCalc),T(r=>r.totalDepenses),T(r=>r.is),T(r=>r.tresoMois)];
                    return (
                      <tr style={{background:"#F2F0EB",borderTop:`2px solid ${border}`}}>
                        <td style={{padding:"11px 8px",fontWeight:700,fontSize:11,color:text}}>Total</td>
                        {cols.map((v,j)=>(
                          <td key={j} style={{padding:"11px 8px",textAlign:"right",fontWeight:600,fontSize:11,color:v?ocean:text3}}>{v?fmt(v):"—"}</td>
                        ))}
                        <td style={{padding:"11px 8px",textAlign:"right",fontWeight:700,fontSize:11,color:proAnnual[11]?.tresoTotale>0?ocean:basque}}>
                          {proAnnual[11]?.tresoTotale?fmt(proAnnual[11].tresoTotale):"—"}
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
            <p style={{margin:0,fontSize:11,color:text3,textAlign:"center",lineHeight:1.8}}>
              TVA calc. = CA TTC ÷ 6 &nbsp;·&nbsp; Charges calc. = 45% × (Salaire + PER/AV) &nbsp;·&nbsp; IS = 15% × (CA HT − charges déductibles)
            </p>
          </div>
        )}
      </div>

      {/* ── Perso modals ── */}
      {(modal==="addIncome"||modal==="editIncome")&&<IncomeForm initial={editItem} onSubmit={modal==="editIncome"?editIncome:addIncome} onClose={closeModal} title={modal==="editIncome"?"Modifier le revenu":"Nouveau revenu"}/>}
      {(modal==="addRecurring"||modal==="editRecurring")&&<RecurringForm initial={editItem} onSubmit={modal==="editRecurring"?editRecurring:addRecurring} onClose={closeModal} title={modal==="editRecurring"?"Modifier":"Nouvelle dépense récurrente"}/>}
      {(modal==="addExpense"||modal==="editExpense")&&<ExpenseForm initial={editItem} onSubmit={modal==="editExpense"?editExpense:addExpense} onClose={closeModal} title={modal==="editExpense"?"Modifier":"Nouvelle dépense ponctuelle"}/>}
      {(modal==="addSaving"||modal==="editSaving")&&<SavingForm initial={editItem} onSubmit={modal==="editSaving"?editSaving:addSaving} onClose={closeModal} title={modal==="editSaving"?"Modifier l'épargne":"Nouvelle épargne"}/>}

      {/* ── Pro modals ── */}
      {(modal==="addEntry"||modal==="editEntry")&&<EntryForm initial={editItem} onSubmit={modal==="editEntry"?editEntry:addEntry} onClose={closeModal} title={modal==="editEntry"?"Modifier l'entrée":"Nouvelle entrée"}/>}
      {(modal==="addExit"||modal==="editExit")&&<ExitForm initial={editItem} onSubmit={modal==="editExit"?editExit:addExit} onClose={closeModal} title={modal==="editExit"?"Modifier la sortie":"Nouvelle sortie"}/>}
      {modal==="initBalance"&&<InitBalanceModal current={proTreasury} onSubmit={saveInitBal} onClose={closeModal}/>}
    </div>
  );
}
