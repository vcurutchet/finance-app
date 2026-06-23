"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabase";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const fmt = (n) => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(n);
const monthKey = (y,m) => `${y}-${String(m+1).padStart(2,"0")}`;

const EXPENSE_CATEGORIES = ["🏠 Loyer","🚗 Transport","🛒 Courses","🍽️ Restaurant","📱 Abonnements","⚡ Énergie","💊 Santé","🎭 Loisirs","👕 Vêtements","🎓 Éducation","🐾 Animaux","🔧 Divers"];
const SAVINGS_TYPES = ["Livret A","LDDS","PEL","Assurance Vie","PEA","Compte Titre","Crypto","Autre"];

// ─── Styles ───
const inputStyle = {background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 14px",color:"#e8edf5",fontSize:14,outline:"none",fontFamily:"'DM Sans',sans-serif",width:"100%",boxSizing:"border-box"};
const selectStyle = {...inputStyle,appearance:"none",backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7d94' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center"};
const btnPrimary = {background:"linear-gradient(135deg,#3b82f6,#2563eb)",color:"#fff",border:"none",borderRadius:10,padding:"12px 24px",fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"};
const btnGhost = {background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px 24px",color:"#8899aa",fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif"};

// ─── Components ───
function Field({label,children}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:12,color:"#6b7d94",fontWeight:500,letterSpacing:"0.5px",textTransform:"uppercase"}}>{label}</label>
      {children}
    </div>
  );
}

function Modal({title,onClose,children}){
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#141c2b",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"32px 28px",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <h3 style={{margin:0,color:"#e8edf5",fontSize:18,fontFamily:"'Playfair Display',serif"}}>{title}</h3>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",color:"#8899aa",borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:16}}>✕</button>
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
      <div style={{width:"100%",maxWidth:400,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"48px 36px",backdropFilter:"blur(20px)"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:40,marginBottom:8}}>💰</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:"#e8edf5",margin:0,letterSpacing:"-0.5px"}}>FinanceFlow</h1>
          <p style={{color:"#5a6a80",fontSize:13,marginTop:8}}>{mode==="login"?"Connectez-vous à votre espace":"Créer un compte"}</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" type="email" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={inputStyle}/>
          <input value={pass} onChange={e=>setPass(e.target.value)} placeholder="Mot de passe (min. 6 caractères)" type="password" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} style={inputStyle}/>
          {err&&<p style={{color:"#ef4444",fontSize:12,margin:0,padding:"0 4px"}}>{err}</p>}
          {msg&&<p style={{color:"#10b981",fontSize:12,margin:0,padding:"0 4px"}}>{msg}</p>}
          <button onClick={handleSubmit} disabled={loading}
            style={{...btnPrimary,padding:"14px",fontSize:15,marginTop:8,opacity:loading?0.6:1}}>
            {loading?"...":(mode==="login"?"Se connecter":"Créer le compte")}
          </button>
          <button onClick={()=>{setMode(mode==="login"?"register":"login");setErr("");setMsg("")}}
            style={{background:"none",border:"none",color:"#5a8ade",fontSize:13,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:8}}>
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
  const [income,setIncome]=useState({estimated:0,real_income:0});
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
      supabase.from("income").select("*").eq("user_id",userId).eq("month_key",mk).maybeSingle(),
      supabase.from("savings").select("*").eq("user_id",userId).order("created_at"),
    ]);

    setRecurring(rec||[]);
    setExpenses(exp||[]);
    setIncome(inc||{estimated:0,real_income:0});
    setSavings(sav||[]);
  },[userId,mk]);

  useEffect(()=>{loadData()},[loadData]);

  // ─── Computed ───
  const computed=useMemo(()=>{
    const totalRecurring=recurring.reduce((s,r)=>s+Number(r.amount),0);
    const totalOneTime=expenses.reduce((s,e)=>s+Number(e.amount),0);
    const totalSpent=totalRecurring+totalOneTime;
    const totalSavings=savings.reduce((s,e)=>s+Number(e.amount),0);
    const budget=Number(income.real_income)||Number(income.estimated)||0;
    const remaining=budget-totalSpent;
    return{totalRecurring,totalOneTime,totalSpent,totalSavings,budget,remaining};
  },[recurring,expenses,income,savings]);

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
  const setIncomeField=async(field,val)=>{
    const value=parseFloat(val)||0;
    if(income.id){
      await supabase.from("income").update({[field]:value}).eq("id",income.id);
    } else {
      await supabase.from("income").insert({user_id:userId,month_key:mk,[field]:value});
    }
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

  if(loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#5a6a80"}}>Chargement...</div>;
  if(!session) return <LoginScreen onLogin={setSession}/>;

  const tabs=[
    {id:"dashboard",icon:"📊",label:"Tableau de bord"},
    {id:"recurring",icon:"🔄",label:"Récurrentes"},
    {id:"expenses",icon:"💸",label:"Ponctuelles"},
    {id:"savings",icon:"🏦",label:"Épargne"},
  ];

  return(
    <div style={{minHeight:"100vh"}}>
      {/* Header */}
      <header style={{padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:24}}>💰</span>
          <h1 style={{margin:0,fontSize:20,fontFamily:"'Playfair Display',serif",letterSpacing:"-0.5px"}}>FinanceFlow</h1>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontSize:13,color:"#5a6a80"}}>👤 {session.user.email}</span>
          <button onClick={handleLogout} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,padding:"8px 14px",color:"#8899aa",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Déconnexion</button>
        </div>
      </header>

      {/* Month Nav */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:24,padding:"20px 24px"}}>
        <button onClick={prevMonth} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,width:40,height:40,color:"#8899aa",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
        <div style={{textAlign:"center",minWidth:180}}>
          <div style={{fontSize:22,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>{MONTHS_FR[month]}</div>
          <div style={{fontSize:13,color:"#5a6a80",marginTop:2}}>{year}</div>
        </div>
        <button onClick={nextMonth} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,width:40,height:40,color:"#8899aa",fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>→</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:4,padding:"0 24px",overflowX:"auto",scrollbarWidth:"none"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{background:tab===t.id?"rgba(59,130,246,0.15)":"rgba(255,255,255,0.03)",border:tab===t.id?"1px solid rgba(59,130,246,0.3)":"1px solid rgba(255,255,255,0.06)",borderRadius:12,padding:"10px 16px",color:tab===t.id?"#6ba3ff":"#6b7d94",fontSize:13,fontWeight:tab===t.id?600:400,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all 0.2s"}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{padding:24,maxWidth:900,margin:"0 auto"}}>

        {/* ── DASHBOARD ── */}
        {tab==="dashboard"&&(
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
              {[
                {label:"Budget (revenu)",value:fmt(computed.budget),color:"#3b82f6",sub:income.real_income?`Réel: ${fmt(income.real_income)}`:`Estimé: ${fmt(income.estimated)}`},
                {label:"Total dépensé",value:fmt(computed.totalSpent),color:"#ef4444",sub:`Récurrent: ${fmt(computed.totalRecurring)} · Ponctuel: ${fmt(computed.totalOneTime)}`},
                {label:"Reste disponible",value:fmt(computed.remaining),color:computed.remaining>=0?"#10b981":"#ef4444",sub:computed.remaining>=0?"En bonne voie 👍":"Attention ⚠️"},
                {label:"Épargne totale",value:fmt(computed.totalSavings),color:"#f59e0b",sub:`${savings.length} placement(s)`},
              ].map((c,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"24px 20px",position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:c.color,opacity:0.6}}/>
                  <div style={{fontSize:12,color:"#6b7d94",fontWeight:500,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:8}}>{c.label}</div>
                  <div style={{fontSize:24,fontWeight:700,color:c.color,fontFamily:"'Playfair Display',serif"}}>{c.value}</div>
                  <div style={{fontSize:11,color:"#5a6a80",marginTop:6}}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Income */}
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"24px 20px"}}>
              <h3 style={{margin:"0 0 16px",fontSize:15,color:"#8899aa",fontWeight:600}}>💼 Revenus — {MONTHS_FR[month]} {year}</h3>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <Field label="Revenu estimé">
                  <input type="number" defaultValue={income.estimated||""} onBlur={e=>setIncomeField("estimated",e.target.value)} placeholder="0" style={inputStyle}/>
                </Field>
                <Field label="Revenu réel">
                  <input type="number" defaultValue={income.real_income||""} onBlur={e=>setIncomeField("real_income",e.target.value)} placeholder="0" style={inputStyle}/>
                </Field>
              </div>
            </div>

            {/* Budget bar */}
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"24px 20px"}}>
              <h3 style={{margin:"0 0 16px",fontSize:15,color:"#8899aa",fontWeight:600}}>📊 Répartition du budget</h3>
              {computed.budget>0?(
                <>
                  <div style={{background:"rgba(255,255,255,0.06)",borderRadius:8,height:28,overflow:"hidden",display:"flex"}}>
                    <div style={{width:`${Math.min((computed.totalRecurring/computed.budget)*100,100)}%`,background:"linear-gradient(90deg,#3b82f6,#2563eb)",height:"100%",transition:"width 0.5s"}}/>
                    <div style={{width:`${Math.min((computed.totalOneTime/computed.budget)*100,100)}%`,background:"linear-gradient(90deg,#f59e0b,#d97706)",height:"100%",transition:"width 0.5s"}}/>
                  </div>
                  <div style={{display:"flex",gap:20,marginTop:12,fontSize:12,color:"#6b7d94",flexWrap:"wrap"}}>
                    <span>🔵 Récurrent: {((computed.totalRecurring/computed.budget)*100).toFixed(1)}%</span>
                    <span>🟡 Ponctuel: {((computed.totalOneTime/computed.budget)*100).toFixed(1)}%</span>
                    <span>⚪ Libre: {(Math.max(0,(computed.remaining/computed.budget)*100)).toFixed(1)}%</span>
                  </div>
                </>
              ):<p style={{color:"#5a6a80",fontSize:13}}>Renseignez un revenu pour voir la répartition</p>}
            </div>

            {/* Category breakdown */}
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:"24px 20px"}}>
              <h3 style={{margin:"0 0 16px",fontSize:15,color:"#8899aa",fontWeight:600}}>🏷️ Dépenses par catégorie</h3>
              {(()=>{
                const allExp=[...recurring,...expenses];
                const cats={};
                allExp.forEach(e=>{cats[e.category]=(cats[e.category]||0)+Number(e.amount)});
                const sorted=Object.entries(cats).sort((a,b)=>b[1]-a[1]);
                if(!sorted.length) return <p style={{color:"#5a6a80",fontSize:13}}>Aucune dépense ce mois</p>;
                const max=sorted[0][1];
                return sorted.map(([cat,amt])=>(
                  <div key={cat} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:4}}>
                      <span style={{color:"#c0cddf"}}>{cat}</span>
                      <span style={{color:"#8899aa",fontWeight:600}}>{fmt(amt)}</span>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.06)",borderRadius:4,height:6,overflow:"hidden"}}>
                      <div style={{width:`${(amt/max)*100}%`,background:"linear-gradient(90deg,#3b82f6,#6ba3ff)",height:"100%",borderRadius:4,transition:"width 0.5s"}}/>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* ── RECURRING ── */}
        {tab==="recurring"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div>
                <h2 style={{margin:0,fontSize:18,fontFamily:"'Playfair Display',serif"}}>Dépenses récurrentes</h2>
                <p style={{margin:"4px 0 0",fontSize:13,color:"#5a6a80"}}>Total : {fmt(computed.totalRecurring)}/mois</p>
              </div>
              <button onClick={()=>setModal("addRecurring")} style={btnPrimary}>+ Ajouter</button>
            </div>
            {recurring.length===0?<p style={{color:"#5a6a80",textAlign:"center",padding:40}}>Aucune dépense récurrente</p>:
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {recurring.map(r=>(
                  <div key={r.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,color:"#e8edf5"}}>{r.name}</div>
                      <div style={{fontSize:12,color:"#6b7d94",marginTop:4}}>{r.category}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:17,fontWeight:700,color:"#ef4444"}}>{fmt(r.amount)}</span>
                      <button onClick={()=>{setEditItem(r);setModal("editRecurring")}} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,width:32,height:32,color:"#8899aa",cursor:"pointer",fontSize:14}}>✏️</button>
                      <button onClick={()=>delRecurring(r.id)} style={{background:"rgba(239,68,68,0.1)",border:"none",borderRadius:8,width:32,height:32,color:"#ef4444",cursor:"pointer",fontSize:14}}>🗑</button>
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
                <h2 style={{margin:0,fontSize:18,fontFamily:"'Playfair Display',serif"}}>Dépenses ponctuelles</h2>
                <p style={{margin:"4px 0 0",fontSize:13,color:"#5a6a80"}}>{MONTHS_FR[month]} {year} — Total : {fmt(computed.totalOneTime)}</p>
              </div>
              <button onClick={()=>setModal("addExpense")} style={btnPrimary}>+ Ajouter</button>
            </div>
            {expenses.length===0?<p style={{color:"#5a6a80",textAlign:"center",padding:40}}>Aucune dépense ponctuelle ce mois</p>:
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {expenses.map(e=>(
                  <div key={e.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:15,fontWeight:600,color:"#e8edf5"}}>{e.name}</div>
                      <div style={{fontSize:12,color:"#6b7d94",marginTop:4}}>{e.category}{e.date?` · ${e.date}`:""}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <span style={{fontSize:17,fontWeight:700,color:"#f59e0b"}}>{fmt(e.amount)}</span>
                      <button onClick={()=>{setEditItem(e);setModal("editExpense")}} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,width:32,height:32,color:"#8899aa",cursor:"pointer",fontSize:14}}>✏️</button>
                      <button onClick={()=>delExpense(e.id)} style={{background:"rgba(239,68,68,0.1)",border:"none",borderRadius:8,width:32,height:32,color:"#ef4444",cursor:"pointer",fontSize:14}}>🗑</button>
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
                <h2 style={{margin:0,fontSize:18,fontFamily:"'Playfair Display',serif"}}>Épargne</h2>
                <p style={{margin:"4px 0 0",fontSize:13,color:"#5a6a80"}}>Total : {fmt(computed.totalSavings)}</p>
              </div>
              <button onClick={()=>setModal("addSaving")} style={btnPrimary}>+ Ajouter</button>
            </div>
            {savings.length===0?<p style={{color:"#5a6a80",textAlign:"center",padding:40}}>Aucune épargne enregistrée</p>:
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14}}>
                {savings.map(s=>(
                  <div key={s.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:16,padding:20,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"#f59e0b",opacity:0.5}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:11,color:"#6b7d94",fontWeight:500,textTransform:"uppercase",letterSpacing:"0.5px"}}>{s.type}</div>
                        <div style={{fontSize:22,fontWeight:700,color:"#f59e0b",marginTop:4,fontFamily:"'Playfair Display',serif"}}>{fmt(s.amount)}</div>
                        <div style={{fontSize:13,color:"#8899aa",marginTop:6}}>{s.name}</div>
                        <div style={{fontSize:12,color:"#5a6a80",marginTop:2}}>📍 {s.location}</div>
                      </div>
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>{setEditItem(s);setModal("editSaving")}} style={{background:"rgba(255,255,255,0.06)",border:"none",borderRadius:8,width:32,height:32,color:"#8899aa",cursor:"pointer",fontSize:14}}>✏️</button>
                        <button onClick={()=>delSaving(s.id)} style={{background:"rgba(239,68,68,0.1)",border:"none",borderRadius:8,width:32,height:32,color:"#ef4444",cursor:"pointer",fontSize:14}}>🗑</button>
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
