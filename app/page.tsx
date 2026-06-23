"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const fmt = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(n);
const monthKey = (y,m) => `${y}-${String(m+1).padStart(2,"0")}`;

const EXPENSE_CATEGORIES = ["🏠 Loyer","🚗 Transport","🛒 Courses","🍽️ Restaurant","📱 Abonnements","⚡ Énergie","💊 Santé","🎭 Loisirs","👕 Vêtements","🎓 Éducation","🐾 Animaux","🔧 Divers"];
const SAVINGS_TYPES = ["Livret A","LDDS","PEL","Assurance Vie","PEA","Compte Titre","Crypto","Autre"];
const INCOME_TYPES = ["CA 2026","CA 2025","Salaire","Freelance","Dividendes","Loyer perçu","Prime","Remboursement","Autre"];

// ─── Palette ───
const ocean  = "#1B4D6E";
const sage   = "#5B7B6A";
const basque = "#C1443E";
const amber  = "#A0845C";
const text   = "#2D3436";
const text2  = "#7F8C9B";
const text3  = "#B0BEC5";
const border = "#E8E4DC";
const serif  = "'DM Serif Display',serif";

// ─── Base styles ───
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

// ─── Shared sub-components ───
function Label({children}: {children: React.ReactNode}) {
  return (
    <label style={{fontSize:11,color:text2,fontWeight:600,letterSpacing:"0.7px",
      textTransform:"uppercase",display:"block",marginBottom:6}}>
      {children}
    </label>
  );
}

function Field({label,children}: {label:string,children:React.ReactNode}) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>
      <Label>{label}</Label>
      {children}
    </div>
  );
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
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(45,52,54,0.4)",
      backdropFilter:"blur(6px)",display:"flex",alignItems:"center",
      justifyContent:"center",zIndex:1000,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{...card,padding:"36px 32px",
        width:"100%",maxWidth:460,maxHeight:"88vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
          <h3 style={{margin:0,color:text,fontSize:20,fontFamily:serif,fontWeight:400}}>{title}</h3>
          <button onClick={onClose} style={{background:"#F2EFE9",border:"none",
            color:text2,borderRadius:50,width:32,height:32,cursor:"pointer",fontSize:16,
            display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
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

// ─── Forms ───
function RecurringForm({initial,onSubmit,onClose,title}) {
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

function ExpenseForm({initial,onSubmit,onClose,title}) {
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

function IncomeForm({initial,onSubmit,onClose,title}) {
  const [type,setType]       = useState(initial?.type||INCOME_TYPES[0]);
  const [custom,setCustom]   = useState("");
  const [amount,setAmt]      = useState(initial?.amount||"");
  const go = () => {
    if(!amount) return;
    onSubmit({...(initial||{}),type:type==="Autre"&&custom?custom:type,amount:parseFloat(amount)});
  };
  return (
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <Field label="Source de revenu">
          <select value={type} onChange={e=>setType(e.target.value)} style={sel}>
            {INCOME_TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </Field>
        {type==="Autre" && <Field label="Préciser"><input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="ex : Bonus" style={inp}/></Field>}
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmt(e.target.value)} placeholder="0" style={inp}/></Field>
        <FormActions onClose={onClose} onSubmit={go} isEdit={!!initial?.id}/>
      </div>
    </Modal>
  );
}

function SavingForm({initial,onSubmit,onClose,title}) {
  const [name,setName]   = useState(initial?.name||"");
  const [amount,setAmt]  = useState(initial?.amount||"");
  const [type,setType]   = useState(initial?.type||SAVINGS_TYPES[0]);
  const [loc,setLoc]     = useState(initial?.location||"");
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

// ─── Login ───
function LoginScreen({onLogin}) {
  const [email,setEmail] = useState("");
  const [pass,setPass]   = useState("");
  const [mode,setMode]   = useState<"login"|"register">("login");
  const [err,setErr]     = useState("");
  const [msg,setMsg]     = useState("");
  const [busy,setBusy]   = useState(false);

  const submit = async () => {
    if(!email||!pass){setErr("Remplissez tous les champs");return}
    setBusy(true);setErr("");setMsg("");
    if(mode==="register"){
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
          <div style={{fontSize:13,color:text3,fontWeight:500,letterSpacing:"2px",textTransform:"uppercase",marginBottom:16}}>FinanceFlow</div>
          <h1 style={{fontFamily:serif,fontSize:36,color:text,margin:0,fontWeight:400,letterSpacing:"-0.5px",lineHeight:1.15}}>
            {mode==="login"?"Bon retour.":"Créer un compte."}
          </h1>
          <p style={{color:text3,fontSize:14,marginTop:10}}>
            {mode==="login"?"Connectez-vous à votre espace":"Commencez à suivre vos finances"}
          </p>
        </div>
        <div style={{...card,padding:"36px 32px"}}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Adresse e-mail" type="email"
              onKeyDown={e=>e.key==="Enter"&&submit()} style={inp}/>
            <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="Mot de passe" type="password"
              onKeyDown={e=>e.key==="Enter"&&submit()} style={inp}/>
            {err && <p style={{color:basque,fontSize:13,margin:0}}>{err}</p>}
            {msg && <p style={{color:sage,fontSize:13,margin:0}}>{msg}</p>}
            <button onClick={submit} disabled={busy}
              style={{...btnP,padding:"13px",fontSize:15,width:"100%",marginTop:4,opacity:busy?0.6:1,borderRadius:12}}>
              {busy?"...":(mode==="login"?"Se connecter":"Créer le compte")}
            </button>
          </div>
        </div>
        <button onClick={()=>{setMode(mode==="login"?"register":"login");setErr("");setMsg("")}}
          style={{background:"none",border:"none",color:text2,fontSize:13,cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif",padding:"16px 0",width:"100%",textAlign:"center"}}>
          {mode==="login"?"Pas encore de compte ? Inscrivez-vous →":"Déjà un compte ? Connectez-vous"}
        </button>
      </div>
    </div>
  );
}

// ─── Main App ───
export default function Home() {
  const [session,setSession]  = useState(null);
  const [loading,setLoading]  = useState(true);
  const [year,setYear]        = useState(new Date().getFullYear());
  const [month,setMonth]      = useState(new Date().getMonth());
  const [tab,setTab]          = useState("dashboard");
  const [modal,setModal]      = useState<string|null>(null);
  const [editItem,setEditItem] = useState<any>(null);

  const [recurring,setRecurring] = useState([]);
  const [expenses,setExpenses]   = useState([]);
  const [incomes,setIncomes]     = useState([]);
  const [savings,setSavings]     = useState([]);

  const mk = monthKey(year,month);
  const userId = session?.user?.id;

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setLoading(false)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  const loadData = useCallback(async()=>{
    if(!userId) return;
    const [{data:rec},{data:exp},{data:inc},{data:sav}] = await Promise.all([
      supabase.from("recurring_expenses").select("*").eq("user_id",userId).order("created_at"),
      supabase.from("one_time_expenses").select("*").eq("user_id",userId).eq("month_key",mk).order("date"),
      supabase.from("income").select("*").eq("user_id",userId).eq("month_key",mk).order("created_at"),
      supabase.from("savings").select("*").eq("user_id",userId).order("created_at"),
    ]);
    setRecurring(rec||[]);setExpenses(exp||[]);setIncomes(inc||[]);setSavings(sav||[]);
  },[userId,mk]);

  useEffect(()=>{loadData()},[loadData]);

  const computed = useMemo(()=>{
    const totalRecurring = recurring.reduce((s,r)=>s+Number(r.amount),0);
    const totalOneTime   = expenses.reduce((s,e)=>s+Number(e.amount),0);
    const totalSpent     = totalRecurring+totalOneTime;
    const totalSavings   = savings.reduce((s,e)=>s+Number(e.amount),0);
    const budget         = incomes.reduce((s,i)=>s+Number(i.amount),0);
    const remaining      = budget-totalSpent;
    return {totalRecurring,totalOneTime,totalSpent,totalSavings,budget,remaining};
  },[recurring,expenses,incomes,savings]);

  // ─── CRUD ───
  const addRecurring    = async(i)=>{await supabase.from("recurring_expenses").insert({user_id:userId,name:i.name,amount:i.amount,category:i.category});loadData();setModal(null)};
  const editRecurring   = async(i)=>{await supabase.from("recurring_expenses").update({name:i.name,amount:i.amount,category:i.category}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delRecurring    = async(id)=>{await supabase.from("recurring_expenses").delete().eq("id",id);loadData()};
  const addExpense      = async(i)=>{await supabase.from("one_time_expenses").insert({user_id:userId,name:i.name,amount:i.amount,category:i.category,date:i.date,month_key:mk});loadData();setModal(null)};
  const editExpense     = async(i)=>{await supabase.from("one_time_expenses").update({name:i.name,amount:i.amount,category:i.category,date:i.date}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delExpense      = async(id)=>{await supabase.from("one_time_expenses").delete().eq("id",id);loadData()};
  const addIncome       = async(i)=>{await supabase.from("income").insert({user_id:userId,month_key:mk,type:i.type,amount:i.amount});loadData();setModal(null)};
  const editIncome      = async(i)=>{await supabase.from("income").update({type:i.type,amount:i.amount}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delIncome       = async(id)=>{await supabase.from("income").delete().eq("id",id);loadData()};
  const addSaving       = async(i)=>{await supabase.from("savings").insert({user_id:userId,name:i.name,amount:i.amount,type:i.type,location:i.location});loadData();setModal(null)};
  const editSaving      = async(i)=>{await supabase.from("savings").update({name:i.name,amount:i.amount,type:i.type,location:i.location}).eq("id",i.id);loadData();setModal(null);setEditItem(null)};
  const delSaving       = async(id)=>{await supabase.from("savings").delete().eq("id",id);loadData()};

  const closeModal = () => {setModal(null);setEditItem(null)};
  const prevMonth  = () => {if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1)};
  const nextMonth  = () => {if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1)};

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:text3}}>Chargement…</div>;
  if(!session) return <LoginScreen onLogin={setSession}/>;

  const tabs = [
    {id:"dashboard", label:"Vue d'ensemble"},
    {id:"income",    label:"Revenus"},
    {id:"recurring", label:"Récurrentes"},
    {id:"expenses",  label:"Ponctuelles"},
    {id:"savings",   label:"Épargne"},
  ];

  const kpis = [
    {label:"Revenus du mois", value:fmt(computed.budget),   color:ocean,
      sub: incomes.length ? `${incomes.length} source${incomes.length>1?"s":""}` : "Aucun revenu saisi"},
    {label:"Total dépensé",   value:fmt(computed.totalSpent), color:basque,
      sub:`Récurrent ${fmt(computed.totalRecurring)} · Ponctuel ${fmt(computed.totalOneTime)}`},
    {label:"Reste disponible",value:fmt(computed.remaining),
      color: computed.remaining>=0 ? sage : basque,
      sub: computed.remaining>=0 ? "En bonne voie" : "Dépassement"},
    {label:"Épargne totale",  value:fmt(computed.totalSavings), color:amber,
      sub:`${savings.length} placement${savings.length>1?"s":""}`},
  ];

  return (
    <div style={{minHeight:"100vh"}}>

      {/* ── Header ── */}
      <header style={{
        padding:"0 32px",height:60,display:"flex",alignItems:"center",
        justifyContent:"space-between",background:"rgba(247,245,240,0.92)",
        backdropFilter:"blur(12px)",borderBottom:`1px solid ${border}`,
        position:"sticky",top:0,zIndex:100,
      }}>
        <span style={{fontFamily:serif,fontSize:17,fontWeight:400,color:text,letterSpacing:"-0.2px"}}>
          FinanceFlow
        </span>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <span style={{fontSize:12,color:text3,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {session.user.email}
          </span>
          <button onClick={async()=>{await supabase.auth.signOut();setSession(null)}}
            style={{background:"none",border:"none",color:text2,fontSize:13,cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif",padding:0}}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* ── Month selector ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:28,padding:"36px 24px 20px"}}>
        <button onClick={prevMonth} style={{background:"none",border:"none",
          color:text3,fontSize:22,cursor:"pointer",padding:"6px 10px",lineHeight:1}}>‹</button>
        <div style={{textAlign:"center",minWidth:200}}>
          <div style={{fontFamily:serif,fontSize:30,fontWeight:400,color:text,lineHeight:1}}>
            {MONTHS_FR[month]}
          </div>
          <div style={{fontSize:13,color:text3,marginTop:6,letterSpacing:"0.5px"}}>{year}</div>
        </div>
        <button onClick={nextMonth} style={{background:"none",border:"none",
          color:text3,fontSize:22,cursor:"pointer",padding:"6px 10px",lineHeight:1}}>›</button>
      </div>

      {/* ── Tab nav ── */}
      <div className="tab-scroll" style={{overflowX:"auto",padding:"0 24px 20px",scrollbarWidth:"none"}}>
        <div style={{display:"flex",justifyContent:"center"}}>
          <div style={{display:"flex",gap:4,background:"#EDEAE3",borderRadius:50,padding:"5px",flexShrink:0}}>
            {tabs.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                background: tab===t.id ? ocean : "transparent",
                color: tab===t.id ? "#fff" : text2,
                border:"none",borderRadius:50,padding:"9px 18px",
                fontSize:13,fontWeight:tab===t.id?600:400,
                cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
                transition:"all 0.15s",
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{padding:"0 24px 64px",maxWidth:880,margin:"0 auto"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard" && (
          <div style={{display:"flex",flexDirection:"column",gap:32}}>

            {/* KPI grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14}}>
              {kpis.map((k,i)=>(
                <div key={i} style={{...card,padding:"26px 22px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:k.color}}/>
                  <div style={{fontSize:11,color:text2,fontWeight:600,textTransform:"uppercase",
                    letterSpacing:"0.8px",marginBottom:12}}>{k.label}</div>
                  <div style={{fontSize:28,fontWeight:400,color:k.color,fontFamily:serif,
                    lineHeight:1,letterSpacing:"-0.3px"}}>{k.value}</div>
                  <div style={{fontSize:12,color:text3,marginTop:10,lineHeight:1.5}}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Income summary */}
            <div style={{...card,padding:"28px 26px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:20}}>
                <h3 style={{margin:0,fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>
                  Revenus de {MONTHS_FR[month]}
                </h3>
                <button onClick={()=>setTab("income")} style={{background:"none",border:"none",
                  color:ocean,fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                  fontWeight:500,padding:0}}>
                  Gérer les revenus →
                </button>
              </div>
              {incomes.length===0
                ? <p style={{margin:0,fontSize:14,color:text3}}>Aucun revenu enregistré ce mois-ci.</p>
                : <div style={{display:"flex",flexDirection:"column",gap:0}}>
                    {incomes.map((inc,i)=>(
                      <div key={inc.id} style={{
                        display:"flex",justifyContent:"space-between",alignItems:"center",
                        padding:"12px 0",
                        borderBottom: i<incomes.length-1 ? `1px solid #F2EFE9` : "none",
                      }}>
                        <span style={{fontSize:14,color:text2}}>{inc.type}</span>
                        <span style={{fontSize:15,fontWeight:600,color:sage}}>{fmt(inc.amount)}</span>
                      </div>
                    ))}
                    <div style={{display:"flex",justifyContent:"space-between",
                      alignItems:"center",paddingTop:14,marginTop:4}}>
                      <span style={{fontSize:13,color:text3,fontWeight:500}}>Total</span>
                      <span style={{fontSize:18,fontWeight:400,color:ocean,fontFamily:serif}}>{fmt(computed.budget)}</span>
                    </div>
                  </div>
              }
            </div>

            {/* Budget bar */}
            <div style={{...card,padding:"28px 26px"}}>
              <h3 style={{margin:"0 0 20px",fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>
                Répartition du budget
              </h3>
              {computed.budget>0 ? (
                <>
                  <div style={{background:"#EDEAE3",borderRadius:50,height:8,overflow:"hidden",display:"flex",marginBottom:16}}>
                    <div style={{width:`${Math.min((computed.totalRecurring/computed.budget)*100,100)}%`,
                      background:ocean,height:"100%",transition:"width 0.5s"}}/>
                    <div style={{width:`${Math.min((computed.totalOneTime/computed.budget)*100,100)}%`,
                      background:basque,height:"100%",transition:"width 0.5s"}}/>
                  </div>
                  <div style={{display:"flex",gap:24,flexWrap:"wrap"}}>
                    {[
                      {color:ocean, label:"Récurrent",  pct:(computed.totalRecurring/computed.budget)*100},
                      {color:basque,label:"Ponctuel",   pct:(computed.totalOneTime/computed.budget)*100},
                      {color:"#D5E8C8",label:"Disponible",pct:Math.max(0,(computed.remaining/computed.budget)*100)},
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

            {/* Category breakdown */}
            <div style={{...card,padding:"28px 26px"}}>
              <h3 style={{margin:"0 0 20px",fontSize:17,fontFamily:serif,fontWeight:400,color:text}}>
                Dépenses par catégorie
              </h3>
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
                      <div style={{width:`${(amt/max)*100}%`,background:ocean,height:"100%",
                        borderRadius:50,transition:"width 0.5s"}}/>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* ── REVENUS ── */}
        {tab==="income" && (
          <div>
            <SectionHead
              title="Revenus"
              sub={`${MONTHS_FR[month]} ${year} · Total : ${fmt(computed.budget)}`}
              action={<button onClick={()=>setModal("addIncome")} style={btnP}>+ Ajouter</button>}
            />
            {incomes.length===0 ? <Empty label="Aucun revenu ce mois"/> :
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {incomes.map(inc=>(
                  <div key={inc.id} className="row" style={{...card,padding:"18px 22px",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
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
                <div style={{...card,padding:"18px 22px",display:"flex",justifyContent:"space-between",
                  alignItems:"center",borderColor:"rgba(91,123,106,0.2)",background:"rgba(91,123,106,0.04)"}}>
                  <span style={{fontSize:13,color:text2,fontWeight:600}}>Total revenus</span>
                  <span style={{fontSize:22,fontWeight:400,color:sage,fontFamily:serif}}>{fmt(computed.budget)}</span>
                </div>
              </div>
            }
          </div>
        )}

        {/* ── RÉCURRENTES ── */}
        {tab==="recurring" && (
          <div>
            <SectionHead
              title="Dépenses récurrentes"
              sub={`${fmt(computed.totalRecurring)} / mois`}
              action={<button onClick={()=>setModal("addRecurring")} style={btnP}>+ Ajouter</button>}
            />
            {recurring.length===0 ? <Empty label="Aucune dépense récurrente"/> :
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {recurring.map(r=>(
                  <div key={r.id} className="row" style={{...card,padding:"18px 22px",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
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

        {/* ── PONCTUELLES ── */}
        {tab==="expenses" && (
          <div>
            <SectionHead
              title="Dépenses ponctuelles"
              sub={`${MONTHS_FR[month]} ${year} · ${fmt(computed.totalOneTime)}`}
              action={<button onClick={()=>setModal("addExpense")} style={btnP}>+ Ajouter</button>}
            />
            {expenses.length===0 ? <Empty label="Aucune dépense ponctuelle ce mois"/> :
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {expenses.map(e=>(
                  <div key={e.id} className="row" style={{...card,padding:"18px 22px",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:3,height:28,borderRadius:2,background:basque,flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:15,fontWeight:500,color:text}}>{e.name}</div>
                        <div style={{fontSize:12,color:text3,marginTop:2}}>
                          {e.category}{e.date ? ` · ${e.date}` : ""}
                        </div>
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

        {/* ── ÉPARGNE ── */}
        {tab==="savings" && (
          <div>
            <SectionHead
              title="Épargne"
              sub={`Total : ${fmt(computed.totalSavings)}`}
              action={<button onClick={()=>setModal("addSaving")} style={btnP}>+ Ajouter</button>}
            />
            {savings.length===0 ? <Empty label="Aucune épargne enregistrée"/> :
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
                {savings.map(s=>(
                  <div key={s.id} style={{...card,padding:"24px 22px",position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:amber}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:11,color:text3,fontWeight:600,textTransform:"uppercase",
                          letterSpacing:"0.8px",marginBottom:8}}>{s.type}</div>
                        <div style={{fontSize:26,fontWeight:400,color:amber,fontFamily:serif,
                          lineHeight:1,letterSpacing:"-0.3px"}}>{fmt(s.amount)}</div>
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
      </div>

      {/* ── Modals ── */}
      {(modal==="addIncome"||modal==="editIncome") && (
        <IncomeForm initial={editItem} onSubmit={modal==="editIncome"?editIncome:addIncome}
          onClose={closeModal} title={modal==="editIncome"?"Modifier le revenu":"Nouveau revenu"}/>
      )}
      {(modal==="addRecurring"||modal==="editRecurring") && (
        <RecurringForm initial={editItem} onSubmit={modal==="editRecurring"?editRecurring:addRecurring}
          onClose={closeModal} title={modal==="editRecurring"?"Modifier la dépense":"Nouvelle dépense récurrente"}/>
      )}
      {(modal==="addExpense"||modal==="editExpense") && (
        <ExpenseForm initial={editItem} onSubmit={modal==="editExpense"?editExpense:addExpense}
          onClose={closeModal} title={modal==="editExpense"?"Modifier la dépense":"Nouvelle dépense ponctuelle"}/>
      )}
      {(modal==="addSaving"||modal==="editSaving") && (
        <SavingForm initial={editItem} onSubmit={modal==="editSaving"?editSaving:addSaving}
          onClose={closeModal} title={modal==="editSaving"?"Modifier l'épargne":"Nouvelle épargne"}/>
      )}
    </div>
  );
}
