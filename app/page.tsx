"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const fmt = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(n);
const monthKey = (y,m) => `${y}-${String(m+1).padStart(2,"0")}`;

const EXPENSE_CATEGORIES = ["🏠 Loyer","🚗 Transport","🛒 Courses","🍽️ Restaurant","📱 Abonnements","⚡ Énergie","💊 Santé","🎭 Loisirs","👕 Vêtements","🎓 Éducation","🐾 Animaux","🔧 Divers"];
const SAVINGS_TYPES = ["Livret A","LDDS","PEL","Assurance Vie","PEA","Compte Titre","Crypto","Autre"];
const INCOME_TYPES = ["CA 2026","CA 2025","Salaire","Freelance","Dividendes","Loyer perçu","Prime","Remboursement","Autre"];

// ─── Styles ───
const inputStyle = {background:"#faf7f2",border:"1.5px solid #e4ddd4",borderRadius:10,padding:"12px 14px",color:"#2c3a48",fontSize:14,outline:"none",fontFamily:"'DM Sans',sans-serif",width:"100%",boxSizing:"border-box"} as const;
const selectStyle = {...inputStyle,appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238fa5b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center"} as const;
const btnPrimary = {background:"linear-gradient(135deg,#4a8fb4,#3a7a9b)",color:"#fff",border:"none",borderRadius:10,padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"} as const;
const btnGhost = {background:"transparent",border:"1.5px solid #e4ddd4",borderRadius:10,padding:"12px 24px",color:"#7a8fa2",fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"} as const;
const card = {background:"#ffffff",border:"1.5px solid #ede8e1",borderRadius:18,boxShadow:"0 2px 16px rgba(44,58,72,0.06)"} as const;

// ─── Components ───
function Field({label,children}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:12,color:"#8fa5b8",fontWeight:600,letterSpacing:"0.6px",textTransform:"uppercase"}}>{label}</label>
      {children}
    </div>
  );
}

function Modal({title,onClose,children}){
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(44,58,72,0.45)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{...card,padding:"32px 28px",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <h3 style={{margin:0,color:"#2c3a48",fontSize:18,fontFamily:"'Playfair Display',serif"}}>{title}</h3>
          <button onClick={onClose} style={{background:"#f0ebe2",border:"none",color:"#7a8fa2",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RecurringForm({initial,onSubmit,onClose,title}){
  const [name,setName]=useState(initial?.name||"");
  const [amount,setAmount]=useState(initial?.amount||"");
  const [category,setCategory]=useState(initial?.category||EXPENSE_CATEGORIES[0]);
  const handle=()=>{if(!name||!amount)return;onSubmit({...(initial||{}),name,amount:parseFloat(amount),category})};
  return(
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Field label="Nom"><input value={name} onChange={e=>setName(e.target.value)} placeholder="ex: Loyer" style={inputStyle}/></Field>
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={inputStyle}/></Field>
        <Field label="Catégorie"><select value={category} onChange={e=>setCategory(e.target.value)} style={selectStyle}>{EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></Field>
        <div style={{display:"flex",gap:12,marginTop:8}}>
          <button onClick={onClose} style={btnGhost}>Annuler</button>
          <button onClick={handle} style={btnPrimary}>{initial?.id?"Enregistrer":"Ajouter"}</button>
        </div>
      </div>
    </Modal>
  );
}

function ExpenseForm({initial,onSubmit,onClose,title}){
  const [name,setName]=useState(initial?.name||"");
  const [amount,setAmount]=useState(initial?.amount||"");
  const [category,setCategory]=useState(initial?.category||EXPENSE_CATEGORIES[0]);
  const [date,setDate]=useState(initial?.date||new Date().toISOString().slice(0,10));
  const handle=()=>{if(!name||!amount)return;onSubmit({...(initial||{}),name,amount:parseFloat(amount),category,date})};
  return(
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Field label="Nom"><input value={name} onChange={e=>setName(e.target.value)} placeholder="ex: Restaurant" style={inputStyle}/></Field>
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={inputStyle}/></Field>
        <Field label="Catégorie"><select value={category} onChange={e=>setCategory(e.target.value)} style={selectStyle}>{EXPENSE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle}/></Field>
        <div style={{display:"flex",gap:12,marginTop:8}}>
          <button onClick={onClose} style={btnGhost}>Annuler</button>
          <button onClick={handle} style={btnPrimary}>{initial?.id?"Enregistrer":"Ajouter"}</button>
        </div>
      </div>
    </Modal>
  );
}

function IncomeForm({initial,onSubmit,onClose,title}){
  const [type,setType]=useState(initial?.type||INCOME_TYPES[0]);
  const [customType,setCustomType]=useState("");
  const [amount,setAmount]=useState(initial?.amount||"");
  const handle=()=>{
    if(!amount)return;
    const finalType=type==="Autre"&&customType?customType:type;
    onSubmit({...(initial||{}),type:finalType,amount:parseFloat(amount)});
  };
  return(
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Field label="Source de revenu">
          <select value={type} onChange={e=>setType(e.target.value)} style={selectStyle}>
            {INCOME_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        {type==="Autre"&&<Field label="Précisez"><input value={customType} onChange={e=>setCustomType(e.target.value)} placeholder="ex: Bonus" style={inputStyle}/></Field>}
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={inputStyle}/></Field>
        <div style={{display:"flex",gap:12,marginTop:8}}>
          <button onClick={onClose} style={btnGhost}>Annuler</button>
          <button onClick={handle} style={btnPrimary}>{initial?.id?"Enregistrer":"Ajouter"}</button>
        </div>
      </div>
    </Modal>
  );
}

function SavingForm({initial,onSubmit,onClose,title}){
  const [name,setName]=useState(initial?.name||"");
  const [amount,setAmount]=useState(initial?.amount||"");
  const [type,setType]=useState(initial?.type||SAVINGS_TYPES[0]);
  const [location,setLocation]=useState(initial?.location||"");
  const handle=()=>{if(!name||!amount)return;onSubmit({...(initial||{}),name,amount:parseFloat(amount),type,location})};
  return(
    <Modal title={title} onClose={onClose}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Field label="Nom"><input value={name} onChange={e=>setName(e.target.value)} placeholder="ex: Épargne vacances" style={inputStyle}/></Field>
        <Field label="Montant (€)"><input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" style={inputStyle}/></Field>
        <Field label="Type"><select value={type} onChange={e=>setType(e.target.value)} style={selectStyle}>{SAVINGS_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></Field>
        <Field label="Emplacement (banque/plateforme)"><input value={location} onChange={e=>setLocation(e.target.value)} placeholder="ex: Boursorama" style={inputStyle}/></Field>
        <div style={{display:"flex",gap:12,marginTop:8}}>
          <button onClick={onClose} style={btnGhost}>Annuler</button>
          <button onClick={handle} style={btnPrimary}>{initial?.id?"Enregistrer":"Ajouter"}</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Login Screen ───
function LoginScreen({onLogin}){
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [mode,setMode]=useState("login");
  const [err,setErr]=useState("");
  const [msg,setMsg]=useState("");
  const [loading,setLoading]=useState(false);

  const handleSubmit=async()=>{
    if(!email||!pass){setErr("Remplissez tous les champs");return}
    setLoading(true);setErr("");setMsg("");
    if(mode==="register"){
      const {error}=await supabase.auth.signUp({email,password:pass});
      if(error){setErr(error.message);setLoading(false);return}
      setMsg("Vérifiez votre email pour confirmer votre inscription !");
      setLoading(false);
    } else {
      const {data,error}=await supabase.auth.signInWithPassword({email,password:pass});
      if(error){setErr(error.message);setLoading(false);return}
      onLogin(data.session);
      setLoading(false);
    }
  };

  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:400,...card,padding:"48px 36px"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:40,marginBottom:8}}>🌊</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"#2c3a48",margin:0,letterSpacing:"-0.5px"}}>FinanceFlow</h1>
          <p style={{color:"#a8bac8",fontSize:13,marginTop:8}}>{mode==="login"?"Connectez-vous à votre espace":"Créer un compte"}</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={inputStyle}/>
          <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="Mot de passe (min. 6 caractères)" type="password" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={inputStyle}/>
          {err&&<p style={{color:"#c96b52",fontSize:12,margin:0,padding:"0 4px"}}>{err}</p>}
          {msg&&<p style={{color:"#5aaa90",fontSize:12,margin:0,padding:"0 4px"}}>{msg}</p>}
          <button onClick={handleSubmit} disabled={loading}
            style={{...btnPrimary,padding:"14px",fontSize:15,marginTop:8,opacity:loading?0.6:1}}>
            {loading?"...":(mode==="login"?"Se connecter":"Créer le compte")}
          </button>
          <button onClick={()=>{setMode(mode==="login"?"register":"login");setErr("");setMsg("")}}
            style={{background:"none",border:"none",color:"#4a8fb4",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:8}}>
            {mode==="login"?"Pas de compte ? Inscrivez-vous":"Déjà un compte ? Connectez-vous"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ───
export default function Home(){
  const [session,setSession]=useState(null);
  const [loading,setLoading]=useState(true);
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(new Date().getMonth());
  const [tab,setTab]=useState("dashboard");
  const [modal,setModal]=useState(null);
  const [editItem,setEditItem]=useState(null);

  // Data states
  const [recurring,setRecurring]=useState([]);
  const [expenses,setExpenses]=useState([]);
  const [incomes,setIncomes]=useState([]);
  const [savings,setSavings]=useState([]);

  const mk = monthKey(year,month);
  const userId = session?.user?.id;

  // ─── Auth listener ───
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setSession(session);
      setLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setSession(session);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // ─── Load data when month/session changes ───
  const loadData=useCallback(async()=>{
    if(!userId) return;

    const [{data:rec},{data:exp},{data:inc},{data:sav}]=await Promise.all([
      supabase.from("recurring_expenses").select("*").eq("user_id",userId).order("created_at"),
      supabase.from("one_time_expenses").select("*").eq("user_id",userId).eq("month_key",mk).order("date"),
      supabase.from("income").select("*").eq("user_id",userId).eq("month_key",mk).order("created_at"),
      supabase.from("savings").select("*").eq("user_id",userId).order("created_at"),
    ]);

    setRecurring(rec||[]);
    setExpenses(exp||[]);
    setIncomes(inc||[]);
    setSavings(sav||[]);
  },[userId,mk]);

  useEffect(()=>{loadData()},[loadData]);

  // ─── Computed ───
  const computed=useMemo(()=>{
    const totalRecurring=recurring.reduce((s,r)=>s+Number(r.amount),0);
    const totalOneTime=expenses.reduce((s,e)=>s+Number(e.amount),0);
    const totalSpent=totalRecurring+totalOneTime;
    const totalSavings=savings.reduce((s,e)=>s+Number(e.amount),0);
    const budget=incomes.reduce((s,i)=>s+Number(i.amount),0);
    const remaining=budget-totalSpent;
    return{totalRecurring,totalOneTime,totalSpent,totalSavings,budget,remaining};
  },[recurring,expenses,incomes,savings]);

  // ─── CRUD: Recurring ───
  const addRecurring=async(item)=>{
    await supabase.from("recurring_expenses").insert({user_id:userId,name:item.name,amount:item.amount,category:item.category});
    loadData();setModal(null);
  };
  const editRecurringItem=async(item)=>{
    await supabase.from("recurring_expenses").update({name:item.name,amount:item.amount,category:item.category}).eq("id",item.id);
    loadData();setModal(null);setEditItem(null);
  };
  const delRecurring=async(id)=>{
    await supabase.from("recurring_expenses").delete().eq("id",id);
    loadData();
  };

  // ─── CRUD: Expenses ───
  const addExpense=async(item)=>{
    await supabase.from("one_time_expenses").insert({user_id:userId,name:item.name,amount:item.amount,category:item.category,date:item.date,month_key:mk});
    loadData();setModal(null);
  };
  const editExpenseItem=async(item)=>{
    await supabase.from("one_time_expenses").update({name:item.name,amount:item.amount,category:item.category,date:item.date}).eq("id",item.id);
    loadData();setModal(null);setEditItem(null);
  };
  const delExpense=async(id)=>{
    await supabase.from("one_time_expenses").delete().eq("id",id);
    loadData();
  };

  // ─── CRUD: Income ───
  const addIncome=async(item)=>{
    await supabase.from("income").insert({user_id:userId,month_key:mk,type:item.type,amount:item.amount});
    loadData();setModal(null);
  };
  const editIncomeItem=async(item)=>{
    await supabase.from("income").update({type:item.type,amount:item.amount}).eq("id",item.id);
    loadData();setModal(null);setEditItem(null);
  };
  const delIncome=async(id)=>{
    await supabase.from("income").delete().eq("id",id);
    loadData();
  };

  // ─── CRUD: Savings ───
  const addSaving=async(item)=>{
    await supabase.from("savings").insert({user_id:userId,name:item.name,amount:item.amount,type:item.type,location:item.location});
    loadData();setModal(null);
  };
  const editSavingItem=async(item)=>{
    await supabase.from("savings").update({name:item.name,amount:item.amount,type:item.type,location:item.location}).eq("id",item.id);
    loadData();setModal(null);setEditItem(null);
  };
  const delSaving=async(id)=>{
    await supabase.from("savings").delete().eq("id",id);
    loadData();
  };

  // ─── Logout ───
  const handleLogout=async()=>{await supabase.auth.signOut();setSession(null)};

  // ─── Navigation ───
  const prevMonth=()=>{if(month===0){setMonth(11);setYear(year-1)}else setMonth(month-1)};
  const nextMonth=()=>{if(month===11){setMonth(0);setYear(year+1)}else setMonth(month+1)};

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#a8bac8"}}>Chargement...</div>;
  if(!session) return <LoginScreen onLogin={setSession}/>;

  const tabs=[
    {id:"dashboard",icon:"📊",label:"Tableau de bord"},
    {id:"income",icon:"💼",label:"Revenus"},
    {id:"recurring",icon:"🔄",label:"Récurrentes"},
    {id:"expenses",icon:"💸",label:"Ponctuelles"},
    {id:"savings",icon:"🏄",label:"Épargne"},
  ];

  const iconBtn = (color?)=>({
    background: color?"rgba(201,107,82,0.08)":"rgba(44,58,72,0.05)",
    border:"none",borderRadius:8,width:32,height:32,
    color:color||"#7a8fa2",cursor:"pointer",fontSize:14,
    display:"flex",alignItems:"center",justifyContent:"center",
  });

  return(
    <div style={{minHeight:"100vh"}}>
      {/* Header */}
      <header style={{padding:"18px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,0.75)",backdropFilter:"blur(12px)",borderBottom:"1.5px solid #ede8e1",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🌊</span>
          <h1 style={{margin:0,fontSize:19,fontFamily:"'Playfair Display',serif",letterSpacing:"-0.3px",color:"#2c3a48"}}>FinanceFlow</h1>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:12,color:"#a8bac8"}}>👤 {session.user.email}</span>
          <button onClick={handleLogout} style={{...btnGhost,padding:"7px 14px",fontSize:12}}>Déconnexion</button>
        </div>
      </header>

      {/* Month Nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:20,padding:"22px 24px 10px"}}>
        <button onClick={prevMonth} style={{background:"#fff",border:"1.5px solid #e4ddd4",borderRadius:10,width:38,height:38,color:"#7a8fa2",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 4px rgba(44,58,72,0.06)"}}>←</button>
        <div style={{textAlign:"center",minWidth:180}}>
          <div style={{fontSize:21,fontWeight:700,fontFamily:"'Playfair Display',serif",color:"#2c3a48"}}>{MONTHS_FR[month]}</div>
          <div style={{fontSize:13,color:"#a8bac8",marginTop:2}}>{year}</div>
        </div>
        <button onClick={nextMonth} style={{background:"#fff",border:"1.5px solid #e4ddd4",borderRadius:10,width:38,height:38,color:"#7a8fa2",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 4px rgba(44,58,72,0.06)"}}>→</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,padding:"10px 24px 0",overflowX:"auto",scrollbarWidth:"none"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{
              background: tab===t.id?"#fff":"transparent",
              border: tab===t.id?"1.5px solid #e4ddd4":"1.5px solid transparent",
              borderRadius:12,padding:"9px 16px",
              color: tab===t.id?"#2c3a48":"#a8bac8",
              fontSize:13,fontWeight:tab===t.id?600:400,
              cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
              boxShadow: tab===t.id?"0 1px 6px rgba(44,58,72,0.08)":"none",
              transition:"all 0.18s",
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{padding:"24px 24px 48px",maxWidth:900,margin:"0 auto"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>

            {/* KPI cards */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14}}>
              {[
                {label:"Revenus du mois",value:fmt(computed.budget),color:"#4a8fb4",bg:"rgba(74,143,180,0.07)",sub:incomes.length?`${incomes.length} source(s)`:"Aucun revenu saisi"},
                {label:"Total dépensé",value:fmt(computed.totalSpent),color:"#c96b52",bg:"rgba(201,107,82,0.07)",sub:`Récurrent ${fmt(computed.totalRecurring)} · Ponctuel ${fmt(computed.totalOneTime)}`},
                {label:"Reste disponible",value:fmt(computed.remaining),color:computed.remaining>=0?"#5aaa90":"#c96b52",bg:computed.remaining>=0?"rgba(90,170,144,0.07)":"rgba(201,107,82,0.07)",sub:computed.remaining>=0?"En bonne voie 👍":"Attention ⚠️"},
                {label:"Épargne totale",value:fmt(computed.totalSavings),color:"#c4905a",bg:"rgba(196,144,90,0.07)",sub:`${savings.length} placement(s)`},
              ].map((c,i)=>(
                <div key={i} style={{...card,padding:"22px 20px",background:c.bg,borderColor:"transparent"}}>
                  <div style={{fontSize:11,color:"#8fa5b8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.6px",marginBottom:8}}>{c.label}</div>
                  <div style={{fontSize:26,fontWeight:700,color:c.color,fontFamily:"'Playfair Display',serif",letterSpacing:"-0.5px"}}>{c.value}</div>
                  <div style={{fontSize:11,color:"#a8bac8",marginTop:6}}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Income summary */}
            <div style={{...card,padding:"24px 22px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <h3 style={{margin:0,fontSize:14,color:"#7a8fa2",fontWeight:600,letterSpacing:"0.2px"}}>💼 Revenus — {MONTHS_FR[month]} {year}</h3>
                <button onClick={()=>setModal("addIncome")} style={{...btnPrimary,padding:"7px 14px",fontSize:12}}>+ Ajouter</button>
              </div>
              {incomes.length===0
                ?<p style={{color:"#a8bac8",fontSize:13,margin:0}}>Aucun revenu ce mois — <span style={{color:"#4a8fb4",cursor:"pointer"}} onClick={()=>setTab("income")}>Gérer les revenus</span></p>
                :<div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {incomes.map(inc=>(
                    <div key={inc.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#faf7f2",borderRadius:10,border:"1.5px solid #ede8e1"}}>
                      <span style={{fontSize:13,color:"#4a5e70"}}>{inc.type}</span>
                      <span style={{fontSize:14,fontWeight:700,color:"#5aaa90"}}>{fmt(inc.amount)}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"flex-end",paddingTop:6,marginTop:2}}>
                    <span style={{fontSize:13,color:"#7a8fa2"}}>Total : <strong style={{color:"#5aaa90"}}>{fmt(computed.budget)}</strong></span>
                  </div>
                </div>
              }
            </div>

            {/* Budget bar */}
            <div style={{...card,padding:"24px 22px"}}>
              <h3 style={{margin:"0 0 16px",fontSize:14,color:"#7a8fa2",fontWeight:600}}>📊 Répartition du budget</h3>
              {computed.budget>0?(
                <>
                  <div style={{background:"rgba(44,58,72,0.06)",borderRadius:8,height:24,overflow:"hidden",display:"flex",borderRadius:50}}>
                    <div style={{width:`${Math.min((computed.totalRecurring/computed.budget)*100,100)}%`,background:"linear-gradient(90deg,#6ab2d0,#4a8fb4)",height:"100%",transition:"width 0.5s",borderRadius:"50px 0 0 50px"}}/>
                    <div style={{width:`${Math.min((computed.totalOneTime/computed.budget)*100,100)}%`,background:"linear-gradient(90deg,#e09070,#c96b52)",height:"100%",transition:"width 0.5s"}}/>
                  </div>
                  <div style={{display:"flex",gap:20,marginTop:12,fontSize:12,color:"#a8bac8",flexWrap:"wrap"}}>
                    <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:2,background:"#4a8fb4",display:"inline-block"}}/>Récurrent {((computed.totalRecurring/computed.budget)*100).toFixed(1)}%</span>
                    <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:2,background:"#c96b52",display:"inline-block"}}/>Ponctuel {((computed.totalOneTime/computed.budget)*100).toFixed(1)}%</span>
                    <span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:10,height:10,borderRadius:2,background:"#d5e8c8",display:"inline-block"}}/>Libre {(Math.max(0,(computed.remaining/computed.budget)*100)).toFixed(1)}%</span>
                  </div>
                </>
              ):<p style={{color:"#a8bac8",fontSize:13,margin:0}}>Ajoutez un revenu pour voir la répartition</p>}
            </div>

            {/* Category breakdown */}
            <div style={{...card,padding:"24px 22px"}}>
              <h3 style={{margin:"0 0 16px",fontSize:14,color:"#7a8fa2",fontWeight:600}}>🏷️ Dépenses par catégorie</h3>
              {(()=>{
                const allExp=[...recurring,...expenses];
                const cats={};
                allExp.forEach(e=>{cats[e.category]=(cats[e.category]||0)+Number(e.amount)});
                const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
                if(!sorted.length) return <p style={{color:"#a8bac8",fontSize:13,margin:0}}>Aucune dépense ce mois</p>;
                const max=sorted[0][1];
                return sorted.map(([cat,amt])=>(
                  <div key={cat} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:5}}>
                      <span style={{color:"#4a5e70"}}>{cat}</span>
                      <span style={{color:"#7a8fa2",fontWeight:600}}>{fmt(amt)}</span>
                    </div>
                    <div style={{background:"rgba(44,58,72,0.07)",borderRadius:50,height:6,overflow:"hidden"}}>
                      <div style={{width:`${(amt/max)*100}%`,background:"linear-gradient(90deg,#6ab2d0,#4a8fb4)",height:"100%",borderRadius:50,transition:"width 0.5s"}}/>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* ── INCOME ── */}
        {tab==="income"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <h2 style={{margin:0,fontSize:20,fontFamily:"'Playfair Display',serif",color:"#2c3a48"}}>Revenus</h2>
                <p style={{margin:"4px 0 0",fontSize:13,color:"#a8bac8"}}>{MONTHS_FR[month]} {year} · Total : <strong style={{color:"#5aaa90"}}>{fmt(computed.budget)}</strong></p>
              </div>
              <button onClick={()=>setModal("addIncome")} style={btnPrimary}>+ Ajouter</button>
            </div>
            {incomes.length===0?<p style={{color:"#a8bac8",textAlign:"center",padding:48}}>Aucun revenu ce mois</p>:
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {incomes.map(inc=>(
                  <div key={inc.id} style={{...card,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:4,height:36,borderRadius:4,background:"linear-gradient(180deg,#7ab8d2,#5aaa90)"}}/>
                      <div style={{fontSize:15,fontWeight:600,color:"#2c3a48"}}>{inc.type}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:17,fontWeight:700,color:"#5aaa90"}}>{fmt(inc.amount)}</span>
                      <button onClick={()=>{setEditItem(inc);setModal("editIncome")}} style={iconBtn()}>✏️</button>
                      <button onClick={()=>delIncome(inc.id)} style={iconBtn("#c96b52")}>🗑</button>
                    </div>
                  </div>
                ))}
                <div style={{...card,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(90,170,144,0.07)",borderColor:"rgba(90,170,144,0.2)"}}>
                  <span style={{fontSize:14,color:"#7a8fa2",fontWeight:600}}>Total revenus</span>
                  <span style={{fontSize:22,fontWeight:700,color:"#5aaa90",fontFamily:"'Playfair Display',serif"}}>{fmt(computed.budget)}</span>
                </div>
              </div>
            }
          </div>
        )}

        {/* ── RECURRING ── */}
        {tab==="recurring"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <h2 style={{margin:0,fontSize:20,fontFamily:"'Playfair Display',serif",color:"#2c3a48"}}>Dépenses récurrentes</h2>
                <p style={{margin:"4px 0 0",fontSize:13,color:"#a8bac8"}}>Total : <strong style={{color:"#c96b52"}}>{fmt(computed.totalRecurring)}</strong>/mois</p>
              </div>
              <button onClick={()=>setModal("addRecurring")} style={btnPrimary}>+ Ajouter</button>
            </div>
            {recurring.length===0?<p style={{color:"#a8bac8",textAlign:"center",padding:48}}>Aucune dépense récurrente</p>:
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {recurring.map(r=>(
                  <div key={r.id} style={{...card,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:4,height:36,borderRadius:4,background:"linear-gradient(180deg,#6ab2d0,#4a8fb4)"}}/>
                      <div>
                        <div style={{fontSize:15,fontWeight:600,color:"#2c3a48"}}>{r.name}</div>
                        <div style={{fontSize:12,color:"#a8bac8",marginTop:3}}>{r.category}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:16,fontWeight:700,color:"#c96b52"}}>{fmt(r.amount)}</span>
                      <button onClick={()=>{setEditItem(r);setModal("editRecurring")}} style={iconBtn()}>✏️</button>
                      <button onClick={()=>delRecurring(r.id)} style={iconBtn("#c96b52")}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {/* ── ONE-TIME EXPENSES ── */}
        {tab==="expenses"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <h2 style={{margin:0,fontSize:20,fontFamily:"'Playfair Display',serif",color:"#2c3a48"}}>Dépenses ponctuelles</h2>
                <p style={{margin:"4px 0 0",fontSize:13,color:"#a8bac8"}}>{MONTHS_FR[month]} {year} · Total : <strong style={{color:"#c4905a"}}>{fmt(computed.totalOneTime)}</strong></p>
              </div>
              <button onClick={()=>setModal("addExpense")} style={btnPrimary}>+ Ajouter</button>
            </div>
            {expenses.length===0?<p style={{color:"#a8bac8",textAlign:"center",padding:48}}>Aucune dépense ponctuelle ce mois</p>:
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {expenses.map(e=>(
                  <div key={e.id} style={{...card,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:4,height:36,borderRadius:4,background:"linear-gradient(180deg,#e09070,#c96b52)"}}/>
                      <div>
                        <div style={{fontSize:15,fontWeight:600,color:"#2c3a48"}}>{e.name}</div>
                        <div style={{fontSize:12,color:"#a8bac8",marginTop:3}}>{e.category}{e.date?` · ${e.date}`:""}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:16,fontWeight:700,color:"#c4905a"}}>{fmt(e.amount)}</span>
                      <button onClick={()=>{setEditItem(e);setModal("editExpense")}} style={iconBtn()}>✏️</button>
                      <button onClick={()=>delExpense(e.id)} style={iconBtn("#c96b52")}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {/* ── SAVINGS ── */}
        {tab==="savings"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <h2 style={{margin:0,fontSize:20,fontFamily:"'Playfair Display',serif",color:"#2c3a48"}}>Épargne</h2>
                <p style={{margin:"4px 0 0",fontSize:13,color:"#a8bac8"}}>Total : <strong style={{color:"#c4905a"}}>{fmt(computed.totalSavings)}</strong></p>
              </div>
              <button onClick={()=>setModal("addSaving")} style={btnPrimary}>+ Ajouter</button>
            </div>
            {savings.length===0?<p style={{color:"#a8bac8",textAlign:"center",padding:48}}>Aucune épargne enregistrée</p>:
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14}}>
                {savings.map(s=>(
                  <div key={s.id} style={{...card,padding:20,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#e0b87a,#c4905a)"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:11,color:"#a8bac8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.6px"}}>{s.type}</div>
                        <div style={{fontSize:24,fontWeight:700,color:"#c4905a",marginTop:6,fontFamily:"'Playfair Display',serif",letterSpacing:"-0.5px"}}>{fmt(s.amount)}</div>
                        <div style={{fontSize:13,color:"#4a5e70",marginTop:6,fontWeight:500}}>{s.name}</div>
                        <div style={{fontSize:12,color:"#a8bac8",marginTop:3}}>📍 {s.location}</div>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>{setEditItem(s);setModal("editSaving")}} style={iconBtn()}>✏️</button>
                        <button onClick={()=>delSaving(s.id)} style={iconBtn("#c96b52")}>🗑</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}
      </div>

      {/* Modals */}
      {(modal==="addIncome"||modal==="editIncome")&&(
        <IncomeForm initial={editItem} onSubmit={modal==="editIncome"?editIncomeItem:addIncome} onClose={()=>{setModal(null);setEditItem(null)}} title={modal==="editIncome"?"Modifier le revenu":"Nouveau revenu"}/>
      )}
      {(modal==="addRecurring"||modal==="editRecurring")&&(
        <RecurringForm initial={editItem} onSubmit={modal==="editRecurring"?editRecurringItem:addRecurring} onClose={()=>{setModal(null);setEditItem(null)}} title={modal==="editRecurring"?"Modifier la dépense":"Nouvelle dépense récurrente"}/>
      )}
      {(modal==="addExpense"||modal==="editExpense")&&(
        <ExpenseForm initial={editItem} onSubmit={modal==="editExpense"?editExpenseItem:addExpense} onClose={()=>{setModal(null);setEditItem(null)}} title={modal==="editExpense"?"Modifier la dépense":"Nouvelle dépense ponctuelle"}/>
      )}
      {(modal==="addSaving"||modal==="editSaving")&&(
        <SavingForm initial={editItem} onSubmit={modal==="editSaving"?editSavingItem:addSaving} onClose={()=>{setModal(null);setEditItem(null)}} title={modal==="editSaving"?"Modifier l'épargne":"Nouvelle épargne"}/>
      )}
    </div>
  );
}
