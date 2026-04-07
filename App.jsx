import { useState, useRef, useMemo } from "react";

const MEMBERS = ["Alex","Priya","Sam","Jordan","Morgan"];
const MEMBER_COLORS = ["#7F77DD","#1D9E75","#D85A30","#D4537E","#378ADD"];
const PRIORITY_DOT = { High:"#E24B4A", Medium:"#EF9F27", Low:"#639922" };
const COL_ORDER = ["todo","inprogress","review","done"];
const STORY_POINTS = [1,2,3,5,8,13];
const PT_TO_HOURS = 2;

const STICKY_PALETTES = [
  { bg:"#FFF9A4", shadow:"rgba(200,180,0,0.18)", fold:"#E8E28A", line:"rgba(0,0,0,0.07)" },
  { bg:"#FFD6E0", shadow:"rgba(200,80,100,0.15)", fold:"#F0B8C8", line:"rgba(0,0,0,0.07)" },
  { bg:"#C7F0D8", shadow:"rgba(30,160,90,0.15)", fold:"#A8DFC0", line:"rgba(0,0,0,0.07)" },
  { bg:"#D0EAFF", shadow:"rgba(50,120,220,0.15)", fold:"#B0D0F0", line:"rgba(0,0,0,0.07)" },
  { bg:"#FFE4BC", shadow:"rgba(200,130,0,0.15)", fold:"#EFCF98", line:"rgba(0,0,0,0.07)" },
  { bg:"#E8D5FF", shadow:"rgba(130,60,220,0.15)", fold:"#D0B0F5", line:"rgba(0,0,0,0.07)" },
];

const COL_META = {
  todo:      { label:"To Do",           emoji:"📋", header:"#6C63CC", light:"#EEEDFE" },
  inprogress:{ label:"In Progress",     emoji:"⚡", header:"#138A62", light:"#E1F5EE" },
  review:    { label:"Sent for Review", emoji:"🔍", header:"#A0660A", light:"#FAEEDA" },
  done:      { label:"Done",            emoji:"🎉", header:"#B04020", light:"#FAECE7" },
};

const INIT_TASKS = [
  { id:1,  title:"Construction",             topic:"Email Campaign: NJ Leads", date:"3/2/26",  assignee:"Priya",  reviewer:"Alex",   priority:"Medium", due:"", qualityCheck:"", issues:"", source:"", col:"done",       feedback:[], points:3, hoursLogged:[], palette:0 },
  { id:2,  title:"Contractors",              topic:"Email Campaign: NJ Leads", date:"3/2/26",  assignee:"Alex",   reviewer:"Sam",    priority:"Low",    due:"", qualityCheck:"", issues:"", source:"", col:"done",       feedback:[], points:2, hoursLogged:[], palette:3 },
  { id:3,  title:"Email campaign Dashboard", topic:"Zoho",                     date:"3/24/26", assignee:"Jordan", reviewer:"Priya",  priority:"Medium", due:"", qualityCheck:"", issues:"", source:"", col:"inprogress", feedback:[], points:5, hoursLogged:[{member:"Jordan",hours:4,note:"Initial setup"}], palette:1 },
  { id:4,  title:"Add MDVR + Camera",        topic:"Website",                  date:"4/2/26",  assignee:"Sam",    reviewer:"Morgan", priority:"High",   due:"", qualityCheck:"", issues:"", source:"", col:"inprogress", feedback:[], points:8, hoursLogged:[{member:"Sam",hours:3,note:"Research phase"}], palette:4 },
  { id:5,  title:"FAQ optimization",         topic:"Website",                  date:"4/7/26",  assignee:"Morgan", reviewer:"Jordan", priority:"High",   due:"", qualityCheck:"", issues:"", source:"https://accugps.com", col:"review", feedback:[], points:5, hoursLogged:[{member:"Morgan",hours:8,note:""}], palette:2 },
  { id:6,  title:"GPS suite Google Ads",     topic:"Website",                  date:"4/7/26",  assignee:"Priya",  reviewer:"Alex",   priority:"Medium", due:"", qualityCheck:"", issues:"", source:"", col:"inprogress", feedback:[], points:3, hoursLogged:[], palette:5 },
];

const mColor = n => MEMBER_COLORS[Math.max(0,MEMBERS.indexOf(n))%MEMBER_COLORS.length];
const totalHours = t => (t.hoursLogged||[]).reduce((s,l)=>s+l.hours,0);
const estHours   = t => (t.points||0)*PT_TO_HOURS;

function Avatar({ name, size=22 }) {
  return <div style={{width:size,height:size,borderRadius:"50%",background:mColor(name),
    display:"flex",alignItems:"center",justifyContent:"center",
    fontSize:Math.max(8,size*0.38),fontWeight:700,color:"#fff",flexShrink:0,
    border:"2px solid rgba(255,255,255,0.8)"}}>
    {name?.[0]??"?"}
  </div>;
}

function Confetti({ run }) {
  if (!run) return null;
  const cs=["#7F77DD","#1D9E75","#EF9F27","#D4537E","#378ADD","#D85A30","#FFF9A4","#FFD6E0"];
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:999}}>
    <style>{`@keyframes cf0{to{transform:translateY(110vh) rotate(720deg);opacity:0}}
      @keyframes cf1{to{transform:translateY(110vh) translateX(60px) rotate(-360deg);opacity:0}}
      @keyframes cf2{to{transform:translateY(110vh) translateX(-60px) rotate(540deg);opacity:0}}`}</style>
    {Array.from({length:30},(_,i)=>(
      <div key={i} style={{position:"absolute",left:`${Math.random()*100}%`,top:"-20px",
        width:10,height:10,borderRadius:Math.random()>.5?"50%":2,background:cs[i%cs.length],
        animation:`cf${i%3} ${1+Math.random()}s ease-in forwards`,animationDelay:`${Math.random()*.5}s`}}/>
    ))}
  </div>;
}

function SprintBar({ tasks }) {
  const total=tasks.reduce((s,t)=>s+(t.points||0),0);
  const done=tasks.filter(t=>t.col==="done").reduce((s,t)=>s+(t.points||0),0);
  const logged=tasks.reduce((s,t)=>s+totalHours(t),0);
  const est=tasks.reduce((s,t)=>s+estHours(t),0);
  const pct=total?Math.round(done/total*100):0;
  const stat=(label,val,color)=>(
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:20,fontWeight:700,color:color||"#2d2d2d"}}>{val}</div>
      <div style={{fontSize:11,color:"#888",marginTop:1}}>{label}</div>
    </div>
  );
  return (
    <div style={{background:"rgba(255,255,255,0.7)",backdropFilter:"blur(8px)",
      borderRadius:14,padding:"12px 20px",marginBottom:16,
      border:"1px solid rgba(255,255,255,0.9)",display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
      {stat("Total pts",total)}
      {stat("Done",done+"pts","#138A62")}
      {stat("Logged",logged+"h",logged>est?"#E24B4A":"#378ADD")}
      {stat("Estimated",est+"h")}
      <div style={{flex:1,minWidth:120}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:11,color:"#666"}}>Sprint progress</span>
          <span style={{fontSize:11,fontWeight:600,color:"#138A62"}}>{pct}%</span>
        </div>
        <div style={{height:8,background:"rgba(0,0,0,0.1)",borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,borderRadius:4,
            background:"linear-gradient(90deg,#1D9E75,#5DCAA5)",transition:"width .5s"}}/>
        </div>
      </div>
    </div>
  );
}

function StickyNote({ task, onDragStart, onEdit, onDelete, onFeedback, onApprove, onLogTime }) {
  const pal = STICKY_PALETTES[task.palette % STICKY_PALETTES.length];
  const rot = useMemo(()=>(((task.id * 17 + 5) % 7) - 3) * 0.6, [task.id]);
  const spent=totalHours(task), est=estHours(task);
  const timePct=est?Math.min(100,Math.round(spent/est*100)):0;
  const over=spent>est;
  const latestFb=task.feedback?.[task.feedback.length-1];
  const FOLD=14;

  return (
    <div draggable onDragStart={e=>onDragStart(e,task.id,task.col)}
      style={{position:"relative",marginBottom:14,cursor:"grab",
        transform:`rotate(${rot}deg)`,transformOrigin:"center top",
        transition:"transform 0.2s, box-shadow 0.2s",
        filter:`drop-shadow(2px 4px 8px ${pal.shadow})`}}
      onMouseEnter={e=>{e.currentTarget.style.transform="rotate(0deg) scale(1.03)";e.currentTarget.style.filter=`drop-shadow(4px 8px 16px ${pal.shadow})`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform=`rotate(${rot}deg)`;e.currentTarget.style.filter=`drop-shadow(2px 4px 8px ${pal.shadow})`;}}
    >
      {/* Pin */}
      <div style={{position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",
        width:12,height:12,borderRadius:"50%",background:"#cc3333",zIndex:2,
        boxShadow:"0 1px 3px rgba(0,0,0,0.3)",border:"2px solid #aa2222"}}/>

      {/* Note body with folded corner */}
      <div style={{background:pal.bg,borderRadius:3,padding:"18px 12px 12px",
        position:"relative",overflow:"hidden",minHeight:100}}>

        {/* Ruled lines */}
        {[0,1,2,3,4,5].map(i=>(
          <div key={i} style={{position:"absolute",left:0,right:0,
            top:32+i*18,height:"0.5px",background:pal.line}}/>
        ))}

        {/* Folded corner */}
        <div style={{position:"absolute",bottom:0,right:0,width:0,height:0,
          borderStyle:"solid",borderWidth:`${FOLD}px ${FOLD}px 0 0`,
          borderColor:`${pal.fold} transparent transparent transparent`}}/>
        <div style={{position:"absolute",bottom:0,right:0,width:FOLD,height:FOLD,
          background:"rgba(0,0,0,0.06)",clipPath:"polygon(100% 0,100% 100%,0 100%)"}}/>

        {/* Top row */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,position:"relative",zIndex:1}}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#2d2d2d",lineHeight:1.3,flex:1,paddingRight:6}}>{task.title}</p>
          <div style={{display:"flex",gap:2}}>
            <button onClick={()=>onEdit(task)} style={{background:"rgba(0,0,0,0.08)",border:"none",
              cursor:"pointer",color:"#555",fontSize:11,borderRadius:4,padding:"2px 5px"}}>✏</button>
            <button onClick={()=>onDelete(task.id)} style={{background:"rgba(0,0,0,0.08)",border:"none",
              cursor:"pointer",color:"#555",fontSize:13,borderRadius:4,padding:"2px 5px"}}>×</button>
          </div>
        </div>

        {task.topic&&<p style={{margin:"0 0 8px",fontSize:11,color:"#666",position:"relative",zIndex:1}}>{task.topic}</p>}

        {/* Badges */}
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8,position:"relative",zIndex:1}}>
          <span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,
            background:"rgba(0,0,0,0.12)",color:"#2d2d2d",display:"flex",alignItems:"center",gap:3}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:PRIORITY_DOT[task.priority],display:"inline-block"}}/>
            {task.priority}
          </span>
          {task.points&&<span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:20,
            background:"rgba(0,0,0,0.12)",color:"#2d2d2d"}}>{task.points}pts</span>}
          {task.due&&<span style={{fontSize:10,padding:"2px 7px",borderRadius:20,
            background:"rgba(0,0,0,0.1)",color:"#444"}}>{task.due}</span>}
        </div>

        {/* Assignee + Reviewer */}
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:est?8:0,position:"relative",zIndex:1}}>
          <Avatar name={task.assignee} size={22}/>
          <span style={{fontSize:11,color:"#444",fontWeight:500}}>{task.assignee}</span>
          {task.reviewer&&<>
            <span style={{fontSize:10,color:"#999"}}>→</span>
            <Avatar name={task.reviewer} size={18}/>
            <span style={{fontSize:10,color:"#666"}}>{task.reviewer}</span>
          </>}
        </div>

        {/* Time bar */}
        {est>0&&<div style={{position:"relative",zIndex:1,marginBottom:6}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
            <span style={{fontSize:10,color:"#666"}}>{spent}h / {est}h</span>
            <span style={{fontSize:10,color:over?"#cc2200":"#555"}}>{timePct}%{over?" ⚠":""}</span>
          </div>
          <div style={{height:4,background:"rgba(0,0,0,0.12)",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${timePct}%`,borderRadius:4,
              background:over?"#E24B4A":"#378ADD",transition:"width .3s"}}/>
          </div>
        </div>}

        {/* Log time */}
        <button onClick={()=>onLogTime(task)} style={{position:"relative",zIndex:1,
          width:"100%",fontSize:11,fontWeight:600,background:"rgba(0,0,0,0.10)",
          color:"#444",border:"none",borderRadius:6,padding:"4px 0",cursor:"pointer",marginBottom:4}}>
          ⏱ Log time
        </button>

        {/* Feedback block */}
        {latestFb&&<div style={{position:"relative",zIndex:1,marginTop:4,
          background:"rgba(0,0,0,0.08)",borderRadius:6,padding:"5px 8px",borderLeft:"3px solid #BA7517"}}>
          <p style={{margin:"0 0 1px",fontSize:10,fontWeight:700,color:"#7a4a00"}}>↩ {latestFb.reviewer}</p>
          <p style={{margin:0,fontSize:11,color:"#3d2000",lineHeight:1.4}}>"{latestFb.comment}"</p>
        </div>}

        {/* Review actions */}
        {task.col==="review"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginTop:8,position:"relative",zIndex:1}}>
          <button onClick={()=>onFeedback(task)} style={{fontSize:11,fontWeight:600,
            background:"rgba(180,100,0,0.15)",color:"#7a4a00",
            border:"1px solid rgba(180,100,0,0.3)",borderRadius:6,padding:"5px 0",cursor:"pointer"}}>
            Feedback →
          </button>
          <button onClick={()=>onApprove(task)} style={{fontSize:11,fontWeight:600,
            background:"rgba(20,140,80,0.15)",color:"#0a5c30",
            border:"1px solid rgba(20,140,80,0.3)",borderRadius:6,padding:"5px 0",cursor:"pointer"}}>
            ✓ Approve
          </button>
        </div>}
      </div>
    </div>
  );
}

function NotifPanel({ notifs, onClear, onClearAll }) {
  const icon = t => t==="feedback"?"💬":t==="approve"?"✅":"🔔";
  return <div style={{position:"absolute",top:46,right:0,width:310,
    background:"rgba(255,255,255,0.97)",border:"1px solid rgba(0,0,0,0.1)",
    borderRadius:12,zIndex:500,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.12)"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
      padding:"10px 14px",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
      <span style={{fontSize:13,fontWeight:600,color:"#2d2d2d"}}>Notifications</span>
      {notifs.length>0&&<button onClick={onClearAll} style={{fontSize:11,color:"#999",
        background:"none",border:"none",cursor:"pointer"}}>Clear all</button>}
    </div>
    {notifs.length===0
      ? <p style={{fontSize:12,color:"#aaa",textAlign:"center",padding:"18px 0",margin:0}}>All clear!</p>
      : notifs.map(n=>(
        <div key={n.id} style={{padding:"10px 14px",borderBottom:"1px solid rgba(0,0,0,0.05)",
          display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:16,flexShrink:0}}>{icon(n.type)}</span>
          <div style={{flex:1}}>
            <p style={{margin:"0 0 2px",fontSize:12,color:"#2d2d2d",lineHeight:1.4}}>
              {n.type==="feedback"
                ? <><b>{n.from}</b> sent feedback on <b>{n.title}</b></>
                : n.type==="approve"
                ? <><b>{n.title}</b> approved by <b>{n.from}</b></>
                : <><b>{n.from}</b> to review <b>{n.title}</b></>}
            </p>
            {n.comment&&<p style={{margin:"3px 0 0",fontSize:11,color:"#7a4a00",
              background:"#FAEEDA",borderRadius:6,padding:"3px 7px"}}>"{n.comment}"</p>}
          </div>
          <button onClick={()=>onClear(n.id)} style={{background:"none",border:"none",
            cursor:"pointer",color:"#bbb",fontSize:14,padding:0}}>×</button>
        </div>
      ))
    }
  </div>;
}

function Modal({ title, icon, iconBg, children, onClose }) {
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",
    alignItems:"center",justifyContent:"center",zIndex:600}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:16,padding:"22px 22px 18px",
      width:380,maxWidth:"92vw",maxHeight:"90vh",overflowY:"auto",
      boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:36,height:36,borderRadius:10,background:iconBg,display:"flex",
          alignItems:"center",justifyContent:"center",fontSize:18}}>{icon}</div>
        <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"#2d2d2d"}}>{title}</h2>
      </div>
      {children}
    </div>
  </div>;
}

function LogTimeModal({ task, onSave, onClose }) {
  const [member,setMember]=useState(task.assignee||MEMBERS[0]);
  const [hours,setHours]=useState(1);
  const [note,setNote]=useState("");
  const spent=totalHours(task), est=estHours(task);
  const pct=est?Math.min(100,Math.round((spent+hours)/est*100)):0;
  const over=spent+hours>est;
  return <Modal title="Log time" icon="⏱" iconBg="#E6F1FB" onClose={onClose}>
    <div style={{background:"#f5f5f5",borderRadius:10,padding:"10px 14px",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:12,color:"#666"}}>{task.points}pts · est. {est}h</span>
        <span style={{fontSize:12,color:spent>est?"#cc2200":"#666"}}>{spent}h logged</span>
      </div>
      <div style={{height:5,background:"rgba(0,0,0,0.1)",borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.min(100,est?Math.round(spent/est*100):0)}%`,
          background:spent>est?"#E24B4A":"#378ADD",borderRadius:4}}/>
      </div>
    </div>
    <label style={{fontSize:12,color:"#666",display:"block",marginBottom:3}}>Logged by</label>
    <select value={member} onChange={e=>setMember(e.target.value)} style={{width:"100%",marginBottom:10,boxSizing:"border-box"}}>
      {MEMBERS.map(m=><option key={m}>{m}</option>)}
    </select>
    <label style={{fontSize:12,color:"#666",display:"block",marginBottom:3}}>Hours spent</label>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
      <input type="range" min="0.5" max="16" step="0.5" value={hours}
        onChange={e=>setHours(parseFloat(e.target.value))} style={{flex:1}}/>
      <span style={{fontSize:14,fontWeight:700,minWidth:36,color:"#2d2d2d"}}>{hours}h</span>
    </div>
    <div style={{height:5,background:"rgba(0,0,0,0.1)",borderRadius:4,overflow:"hidden",marginBottom:6}}>
      <div style={{height:"100%",width:`${pct}%`,background:over?"#E24B4A":"#1D9E75",borderRadius:4,transition:"width .2s"}}/>
    </div>
    <p style={{margin:"0 0 10px",fontSize:11,color:over?"#cc2200":"#888"}}>
      After logging: {spent+hours}h / {est}h ({pct}%){over?" — over estimate!":""}
    </p>
    <label style={{fontSize:12,color:"#666",display:"block",marginBottom:3}}>Note</label>
    <input value={note} onChange={e=>setNote(e.target.value)} placeholder="What did you work on?"
      style={{width:"100%",boxSizing:"border-box",marginBottom:14}}/>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      <button onClick={onClose}>Cancel</button>
      <button onClick={()=>onSave({member,hours,note})}
        style={{background:"#378ADD",color:"#fff",border:"none",borderRadius:8,
          padding:"7px 18px",cursor:"pointer",fontWeight:600,fontSize:13}}>Log time</button>
    </div>
  </Modal>;
}

function FeedbackModal({ task, onSend, onClose }) {
  const [reviewer,setReviewer]=useState(task.reviewer||MEMBERS[0]);
  const [comment,setComment]=useState("");
  const valid=comment.trim().length>0;
  return <Modal title="Leave feedback" icon="🔍" iconBg="#FAEEDA" onClose={onClose}>
    <p style={{margin:"0 0 12px",fontSize:13,color:"#555"}}>{task.title}</p>
    <label style={{fontSize:12,color:"#666",display:"block",marginBottom:3}}>Reviewing as</label>
    <select value={reviewer} onChange={e=>setReviewer(e.target.value)} style={{width:"100%",marginBottom:10,boxSizing:"border-box"}}>
      {MEMBERS.map(m=><option key={m}>{m}</option>)}
    </select>
    <label style={{fontSize:12,color:"#666",display:"block",marginBottom:3}}>Feedback for {task.assignee}</label>
    <textarea value={comment} onChange={e=>setComment(e.target.value)}
      placeholder="Describe what needs to be revised..."
      style={{width:"100%",boxSizing:"border-box",minHeight:90,resize:"vertical",fontSize:13,
        padding:"8px 10px",borderRadius:8,border:"1px solid #ddd",fontFamily:"inherit",marginBottom:10}}/>
    <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",
      background:"#E1F5EE",borderRadius:8,marginBottom:14}}>
      <span>⚡</span>
      <p style={{margin:0,fontSize:11,color:"#085041"}}>Task moves back to <b>In Progress</b> and {task.assignee} will be notified.</p>
    </div>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      <button onClick={onClose}>Cancel</button>
      <button onClick={()=>valid&&onSend(reviewer,comment)}
        style={{background:valid?"#BA7517":"#ccc",color:valid?"#fff":"#888",border:"none",
          borderRadius:8,padding:"7px 18px",cursor:valid?"pointer":"default",fontWeight:600,fontSize:13}}>
        Send back
      </button>
    </div>
  </Modal>;
}

function TaskModal({ task, onSave, onClose }) {
  const isNew=!task;
  const [form,setForm]=useState(task?{...task}:{
    title:"",topic:"",date:"",assignee:MEMBERS[0],reviewer:MEMBERS[1],
    priority:"Medium",due:"",qualityCheck:"",issues:"",source:"",
    col:"todo",feedback:[],points:3,hoursLogged:[],
    palette:Math.floor(Math.random()*STICKY_PALETTES.length)
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const valid=form.title.trim().length>0;
  const lbl=(t,child,full=false)=>(
    <div style={{marginBottom:10,gridColumn:full?"1/-1":"auto"}}>
      <label style={{fontSize:12,color:"#666",display:"block",marginBottom:3}}>{t}</label>
      {child}
    </div>
  );
  return <Modal title={isNew?"Add new task":"Edit task"} icon={isNew?"✚":"✏"} iconBg="#EEEDFE" onClose={onClose}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {lbl("Task title",<input value={form.title} onChange={e=>set("title",e.target.value)}
        placeholder="Task title..." style={{width:"100%",boxSizing:"border-box"}}/>,true)}
      {lbl("Topic",<input value={form.topic} onChange={e=>set("topic",e.target.value)} placeholder="e.g. Website"/>)}
      {lbl("Date",<input value={form.date} onChange={e=>set("date",e.target.value)} placeholder="4/7/26"/>)}
      {lbl("Assignee",<select value={form.assignee} onChange={e=>set("assignee",e.target.value)}>{MEMBERS.map(m=><option key={m}>{m}</option>)}</select>)}
      {lbl("Reviewer",<select value={form.reviewer} onChange={e=>set("reviewer",e.target.value)}>{MEMBERS.map(m=><option key={m}>{m}</option>)}</select>)}
      {lbl("Priority",<select value={form.priority} onChange={e=>set("priority",e.target.value)}>{["High","Medium","Low"].map(p=><option key={p}>{p}</option>)}</select>)}
      {lbl("Column",<select value={form.col} onChange={e=>set("col",e.target.value)}>{COL_ORDER.map(c=><option key={c} value={c}>{COL_META[c].label}</option>)}</select>)}
      {lbl("Due date",<input type="date" value={form.due} onChange={e=>set("due",e.target.value)}/>)}
      {lbl("Story points",
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {STORY_POINTS.map(pt=>(
            <button key={pt} onClick={()=>set("points",pt)}
              style={{width:36,height:36,borderRadius:8,border:"1px solid",cursor:"pointer",fontSize:13,
                borderColor:form.points===pt?"#7F77DD":"#ddd",
                background:form.points===pt?"#EEEDFE":"#f9f9f9",
                color:form.points===pt?"#3C3489":"#444",fontWeight:form.points===pt?700:400}}>
              {pt}
            </button>
          ))}
        </div>,true
      )}
      {lbl("Sticky color",
        <div style={{display:"flex",gap:6}}>
          {STICKY_PALETTES.map((p,i)=>(
            <button key={i} onClick={()=>set("palette",i)}
              style={{width:28,height:28,borderRadius:6,background:p.bg,cursor:"pointer",
                border:form.palette===i?"3px solid #333":"2px solid transparent",padding:0}}/>
          ))}
        </div>,true
      )}
      {lbl("Quality check",<input value={form.qualityCheck} onChange={e=>set("qualityCheck",e.target.value)} placeholder="Notes..."/>,true)}
      {lbl("Issues",<input value={form.issues} onChange={e=>set("issues",e.target.value)} placeholder="Any issues..."/>,true)}
      {lbl("Source",<input value={form.source} onChange={e=>set("source",e.target.value)} placeholder="https://..."/>,true)}
    </div>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
      <button onClick={onClose}>Cancel</button>
      <button onClick={()=>valid&&onSave(form)}
        style={{background:valid?"#7F77DD":"#ccc",color:valid?"#fff":"#888",border:"none",
          borderRadius:8,padding:"7px 18px",cursor:valid?"pointer":"default",fontWeight:600,fontSize:13}}>
        {isNew?"Add task":"Save changes"}
      </button>
    </div>
  </Modal>;
}

export default function App() {
  const [tasks,setTasks]=useState(INIT_TASKS);
  const [notifs,setNotifs]=useState([{id:0,type:"review",from:"Morgan",title:"FAQ optimization",topic:"Website",comment:null}]);
  const [showNotifs,setShowNotifs]=useState(false);
  const [showModal,setShowModal]=useState(false);
  const [editTask,setEditTask]=useState(null);
  const [feedbackTask,setFeedbackTask]=useState(null);
  const [logTimeTask,setLogTimeTask]=useState(null);
  const [dragOver,setDragOver]=useState(null);
  const [confetti,setConfetti]=useState(false);
  const dragging=useRef(null);
  const nextId=useRef(200);
  const nId=useRef(10);

  const colTasks=COL_ORDER.reduce((acc,c)=>({...acc,[c]:tasks.filter(t=>t.col===c)}),{});
  const boom=()=>{setConfetti(true);setTimeout(()=>setConfetti(false),2200);};

  const handleDragStart=(e,id,col)=>{dragging.current={taskId:id,fromCol:col};e.dataTransfer.effectAllowed="move";};
  const handleDrop=(e,toCol)=>{
    e.preventDefault();setDragOver(null);
    if(!dragging.current)return;
    const {taskId,fromCol}=dragging.current;dragging.current=null;
    if(fromCol===toCol)return;
    const task=tasks.find(t=>t.id===taskId);if(!task)return;
    setTasks(p=>p.map(t=>t.id===taskId?{...t,col:toCol}:t));
    if(toCol==="done")boom();
    if(toCol==="review"&&task.reviewer)
      setNotifs(p=>[{id:nId.current++,type:"review",from:task.reviewer,title:task.title,topic:task.topic||"",comment:null},...p]);
  };
  const handleApprove=t=>{
    setTasks(p=>p.map(tk=>tk.id===t.id?{...tk,col:"done"}:tk));
    setNotifs(p=>[{id:nId.current++,type:"approve",from:t.reviewer,title:t.title,topic:"",comment:"Approved!"},...p]);
    boom();
  };
  const handleFeedback=(task,reviewer,comment)=>{
    setTasks(p=>p.map(t=>t.id===task.id?{...t,col:"inprogress",feedback:[...(t.feedback||[]),{reviewer,comment,at:new Date().toLocaleDateString()}]}:t));
    setNotifs(p=>[{id:nId.current++,type:"feedback",from:reviewer,title:task.title,topic:task.topic||"",comment},...p]);
    setFeedbackTask(null);
  };
  const handleLogTime=(task,entry)=>{
    setTasks(p=>p.map(t=>t.id===task.id?{...t,hoursLogged:[...(t.hoursLogged||[]),entry]}:t));
    setLogTimeTask(null);
  };
  const handleSave=form=>{
    if(form.id)setTasks(p=>p.map(t=>t.id===form.id?form:t));
    else setTasks(p=>[...p,{...form,id:nextId.current++,feedback:[],hoursLogged:[]}]);
    setShowModal(false);setEditTask(null);
  };

  return (
    <div style={{minHeight:"100vh",background:"#b5903a",
      backgroundImage:"radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
      backgroundSize:"24px 24px",padding:"16px 12px 32px",fontFamily:"'Segoe UI',sans-serif"}}>

      <Confetti run={confetti}/>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:800,margin:"0 0 2px",color:"#fff",
            textShadow:"0 2px 4px rgba(0,0,0,0.3)"}}>Team Task Board</h2>
          <p style={{margin:0,fontSize:12,color:"rgba(255,255,255,0.8)"}}>
            {tasks.filter(t=>t.col==="done").length}/{tasks.length} tasks done
          </p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowNotifs(v=>!v)} style={{
              background:"rgba(255,255,255,0.9)",border:"none",
              borderRadius:10,padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:600,
              color:notifs.length>0?"#6C63CC":"#444",boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
              🔔{notifs.length>0&&<span style={{marginLeft:6,background:"#7F77DD",color:"#fff",
                borderRadius:20,padding:"1px 7px",fontSize:10}}>{notifs.length}</span>}
            </button>
            {showNotifs&&<NotifPanel notifs={notifs}
              onClear={id=>setNotifs(p=>p.filter(n=>n.id!==id))}
              onClearAll={()=>setNotifs([])}/>}
          </div>
          <button onClick={()=>{setEditTask(null);setShowModal(true);}} style={{
            background:"rgba(255,255,255,0.95)",color:"#6C63CC",border:"none",
            borderRadius:10,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer",
            boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
            + Add task
          </button>
        </div>
      </div>

      <SprintBar tasks={tasks}/>

      {/* Columns */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12}}>
        {COL_ORDER.map(colId=>{
          const meta=COL_META[colId];
          const list=colTasks[colId];
          const colPts=list.reduce((s,t)=>s+(t.points||0),0);
          const isOver=dragOver===colId;
          return <div key={colId}
            onDragOver={e=>{e.preventDefault();setDragOver(colId);}}
            onDragLeave={()=>setDragOver(null)}
            onDrop={e=>handleDrop(e,colId)}
            style={{background:isOver?"rgba(255,255,255,0.25)":"rgba(0,0,0,0.15)",
              borderRadius:14,overflow:"hidden",
              border:isOver?"2px dashed rgba(255,255,255,0.7)":"2px solid transparent",
              transition:"all .15s"}}>
            {/* Column header */}
            <div style={{background:meta.header,padding:"10px 12px",
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>
                {meta.emoji} {meta.label}
              </span>
              <span style={{fontSize:11,background:"rgba(255,255,255,0.25)",color:"#fff",
                borderRadius:20,padding:"2px 8px",fontWeight:600}}>{colPts}pts</span>
            </div>
            {/* Cards */}
            <div style={{padding:"14px 10px 8px",minHeight:200}}>
              {list.map(task=>(
                <StickyNote key={task.id} task={task}
                  onDragStart={handleDragStart}
                  onEdit={t=>{setEditTask(t);setShowModal(true);}}
                  onDelete={id=>setTasks(p=>p.filter(t=>t.id!==id))}
                  onFeedback={t=>setFeedbackTask(t)}
                  onApprove={handleApprove}
                  onLogTime={t=>setLogTimeTask(t)}/>
              ))}
              {list.length===0&&<p style={{textAlign:"center",fontSize:12,
                color:"rgba(255,255,255,0.5)",marginTop:24,fontStyle:"italic"}}>Drop notes here</p>}
            </div>
          </div>;
        })}
      </div>

      {showModal&&<TaskModal task={editTask} onSave={handleSave} onClose={()=>{setShowModal(false);setEditTask(null);}}/>}
      {feedbackTask&&<FeedbackModal task={feedbackTask} onSend={(r,c)=>handleFeedback(feedbackTask,r,c)} onClose={()=>setFeedbackTask(null)}/>}
      {logTimeTask&&<LogTimeModal task={logTimeTask} onSave={e=>handleLogTime(logTimeTask,e)} onClose={()=>setLogTimeTask(null)}/>}
    </div>
  );
}