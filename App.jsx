import { useState, useRef, useMemo, useEffect } from "react";
import { supabase } from './supabase.js';

const MEMBER_COLOR_OPTIONS = ["#7F77DD","#1D9E75","#D85A30","#D4537E","#378ADD"];
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
  todo:      { label:"To Do",           emoji:"📋", header:"#3b82f6", light:"#eff6ff" },
  inprogress:{ label:"In Progress",     emoji:"⚡", header:"#f97316", light:"#fff7ed" },
  review:    { label:"Sent for Review", emoji:"🔍", header:"#a855f7", light:"#faf5ff" },
  done:      { label:"Done",            emoji:"🎉", header:"#10b981", light:"#ecfdf5" },
};


let _members = [];
const mColor = n => _members.find(m=>m.name===n)?.color ?? "#999";
const totalHours = t => (t.hoursLogged||[]).reduce((s,l)=>s+l.hours,0);
const estHours   = t => (t.points||0)*PT_TO_HOURS;

const toDb = t => ({
  title: t.title, topic: t.topic, date: t.date,
  assignee: t.assignee, reviewer: t.reviewer, priority: t.priority,
  due: t.due, quality_check: t.qualityCheck, issues: t.issues,
  source: t.source, col: t.col, points: t.points, palette: t.palette,
  feedback: t.feedback, hours_logged: t.hoursLogged,
});
const fromDb = r => ({
  id: r.id, title: r.title, topic: r.topic||"", date: r.date||"",
  assignee: r.assignee, reviewer: r.reviewer, priority: r.priority||"Medium",
  due: r.due||"", qualityCheck: r.quality_check||"", issues: r.issues||"",
  source: r.source||"", col: r.col||"todo", points: r.points||3,
  palette: r.palette||0, feedback: r.feedback||[], hoursLogged: r.hours_logged||[],
});

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
      <div style={{fontSize:20,fontWeight:800,color:color||"#0f172a"}}>{val}</div>
      <div style={{fontSize:11,color:"#64748b",marginTop:1,fontWeight:500}}>{label}</div>
    </div>
  );
  return (
    <div style={{background:"rgba(255,255,255,0.8)",
      borderRadius:14,padding:"14px 22px",marginBottom:12,
      border:"1.5px solid rgba(124,58,237,0.12)",boxShadow:"0 4px 16px rgba(124,58,237,0.08)",
      display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
      {stat("Total pts",total)}
      {stat("Done",done+"pts","#10b981")}
      {stat("Logged",logged+"h",logged>est?"#ef4444":"#3b82f6")}
      {stat("Estimated",est+"h")}
      <div style={{flex:1,minWidth:120}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:11,color:"#64748b",fontWeight:500}}>Sprint progress</span>
          <span style={{fontSize:11,fontWeight:700,color:"#10b981"}}>{pct}%</span>
        </div>
        <div style={{height:8,background:"#e2e8f0",borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,borderRadius:4,
            background:"linear-gradient(90deg,#10b981,#34d399)",transition:"width .5s"}}/>
        </div>
      </div>
    </div>
  );
}

const COL_ACCENT = { todo:"#3b82f6", inprogress:"#f97316", review:"#a855f7", done:"#10b981" };

function StickyNote({ task, onDragStart, onEdit, onDelete, onFeedback, onApprove, onLogTime }) {
  const spent=totalHours(task), est=estHours(task);
  const timePct=est?Math.min(100,Math.round(spent/est*100)):0;
  const over=spent>est;
  const latestFb=task.feedback?.[task.feedback.length-1];
  const isOverdue = task.due && task.col!=="done" && new Date(task.due) < new Date();
  const accent = COL_ACCENT[task.col] || "#7c3aed";
  const pal = STICKY_PALETTES[task.palette ?? 0];
  const rot = [-0.8, 0.6, -0.4][(task.id||0) % 3] + "deg";

  return (
    <div draggable onDragStart={e=>onDragStart(e,task.id,task.col)}
      style={{marginBottom:12,cursor:"grab",animation:"fadeInUp 0.25s ease both",
        background:pal.bg,
        backgroundImage:`repeating-linear-gradient(transparent,transparent 23px,${pal.line} 23px,${pal.line} 24px)`,
        backgroundPosition:"0 30px",
        borderRadius:4,position:"relative",overflow:"hidden",
        boxShadow:`3px 5px 14px ${pal.shadow}`,
        transform:`rotate(${rot})`,
        transition:"transform 0.18s ease, box-shadow 0.18s ease",
        outline:isOverdue?"2px solid #ef4444":"none"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px) rotate(0deg)";e.currentTarget.style.boxShadow=`6px 16px 32px ${pal.shadow}`;e.currentTarget.style.zIndex="10";}}
      onMouseLeave={e=>{e.currentTarget.style.transform=`rotate(${rot})`;e.currentTarget.style.boxShadow=`3px 5px 14px ${pal.shadow}`;e.currentTarget.style.zIndex="1";}}
    >
      {/* Fold corner */}
      <div style={{position:"absolute",bottom:0,right:0,width:24,height:24,
        background:pal.fold,clipPath:"polygon(100% 0,100% 100%,0 100%)",
        filter:"drop-shadow(-1px -1px 2px rgba(0,0,0,0.12))"}}/>
      {/* Thumbtack pin */}
      <div style={{position:"absolute",top:7,left:"50%",transform:"translateX(-50%)",
        width:12,height:12,borderRadius:"50%",
        background:"radial-gradient(circle at 35% 35%, #ff7070, #b91c1c)",
        boxShadow:"0 2px 5px rgba(0,0,0,0.35)"}}/>
      <div style={{padding:"24px 12px 14px"}}>

        {/* Top row */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:"#0f172a",lineHeight:1.35,flex:1,paddingRight:6}}>{task.title}</p>
          <div style={{display:"flex",gap:3,flexShrink:0}}>
            <button onClick={()=>onEdit(task)} style={{background:"#f1f5f9",border:"none",
              cursor:"pointer",color:"#64748b",fontSize:11,borderRadius:6,padding:"3px 6px"}}>✏</button>
            <button onClick={()=>onDelete(task.id)} style={{background:"#fee2e2",border:"none",
              cursor:"pointer",color:"#ef4444",fontSize:13,borderRadius:6,padding:"3px 6px"}}>×</button>
          </div>
        </div>

        {task.topic&&<p style={{margin:"0 0 8px",fontSize:11,color:"#64748b",fontWeight:500}}>{task.topic}</p>}

        {/* Badges */}
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
          <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,
            background:task.priority==="High"?"#fee2e2":task.priority==="Medium"?"#fef3c7":"#dcfce7",
            color:task.priority==="High"?"#dc2626":task.priority==="Medium"?"#d97706":"#16a34a",
            display:"flex",alignItems:"center",gap:3}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:PRIORITY_DOT[task.priority],display:"inline-block"}}/>
            {task.priority}
          </span>
          {task.points&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,
            background:"#ede9fe",color:"#7c3aed"}}>{task.points}pts</span>}
          {task.due&&<span style={{fontSize:10,fontWeight:500,padding:"2px 8px",borderRadius:20,
            background:isOverdue?"#ef4444":"#f1f5f9",color:isOverdue?"#fff":"#475569"}}>
            {isOverdue?"⚠ Overdue":task.due}
          </span>}
        </div>

        {/* Assignee + Reviewer */}
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:est?8:0}}>
          <Avatar name={task.assignee} size={22}/>
          <span style={{fontSize:11,color:"#334155",fontWeight:500}}>{task.assignee}</span>
          {task.reviewer&&<>
            <span style={{fontSize:10,color:"#94a3b8"}}>→</span>
            <Avatar name={task.reviewer} size={18}/>
            <span style={{fontSize:10,color:"#64748b"}}>{task.reviewer}</span>
          </>}
        </div>

        {/* Time bar */}
        {est>0&&<div style={{marginBottom:6}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <span style={{fontSize:10,color:"#64748b"}}>{spent}h / {est}h</span>
            <span style={{fontSize:10,fontWeight:600,color:over?"#ef4444":"#059669"}}>{timePct}%{over?" ⚠":""}</span>
          </div>
          <div style={{height:4,background:"#f1f5f9",borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${timePct}%`,borderRadius:4,
              background:over?"#ef4444":`linear-gradient(90deg,${accent},${accent}99)`,transition:"width .3s"}}/>
          </div>
        </div>}

        {/* Log time */}
        <button onClick={()=>onLogTime(task)} style={{
          width:"100%",fontSize:11,fontWeight:600,background:"#f8fafc",
          color:"#64748b",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"5px 0",cursor:"pointer",marginBottom:4}}>
          ⏱ Log time
        </button>

        {/* Feedback block */}
        {latestFb&&<div style={{marginTop:4,background:"#fffbeb",borderRadius:8,
          padding:"6px 10px",borderLeft:`3px solid #f59e0b`}}>
          <p style={{margin:"0 0 1px",fontSize:10,fontWeight:700,color:"#92400e"}}>↩ {latestFb.reviewer}</p>
          <p style={{margin:0,fontSize:11,color:"#78350f",lineHeight:1.4}}>"{latestFb.comment}"</p>
        </div>}

        {/* Review actions */}
        {task.col==="review"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:8}}>
          <button onClick={()=>onFeedback(task)} style={{fontSize:11,fontWeight:600,
            background:"#fff7ed",color:"#c2410c",
            border:"1.5px solid #fed7aa",borderRadius:8,padding:"6px 0",cursor:"pointer"}}>
            Feedback →
          </button>
          <button onClick={()=>onApprove(task)} style={{fontSize:11,fontWeight:600,
            background:"#f0fdf4",color:"#15803d",
            border:"1.5px solid #bbf7d0",borderRadius:8,padding:"6px 0",cursor:"pointer"}}>
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
  return <div style={{position:"fixed",inset:0,background:"rgba(15,10,40,0.5)",backdropFilter:"blur(4px)",
    display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,animation:"fadeIn 0.15s ease"}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:20,padding:"24px 24px 20px",
      width:400,maxWidth:"94vw",maxHeight:"90vh",overflowY:"auto",
      boxShadow:"0 24px 64px rgba(0,0,0,0.25)",animation:"scaleIn 0.2s ease"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <div style={{width:36,height:36,borderRadius:10,background:iconBg,display:"flex",
          alignItems:"center",justifyContent:"center",fontSize:18}}>{icon}</div>
        <h2 style={{margin:0,fontSize:16,fontWeight:700,color:"#2d2d2d"}}>{title}</h2>
      </div>
      {children}
    </div>
  </div>;
}

function LogTimeModal({ task, members, onSave, onClose }) {
  const [member,setMember]=useState(task.assignee||members[0]?.name||"");
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
      {members.map(m=><option key={m.id}>{m.name}</option>)}
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

function FeedbackModal({ task, members, onSend, onClose }) {
  const [reviewer,setReviewer]=useState(task.reviewer||members[0]?.name||"");
  const [comment,setComment]=useState("");
  const valid=comment.trim().length>0;
  return <Modal title="Leave feedback" icon="🔍" iconBg="#FAEEDA" onClose={onClose}>
    <p style={{margin:"0 0 12px",fontSize:13,color:"#555"}}>{task.title}</p>
    <label style={{fontSize:12,color:"#666",display:"block",marginBottom:3}}>Reviewing as</label>
    <select value={reviewer} onChange={e=>setReviewer(e.target.value)} style={{width:"100%",marginBottom:10,boxSizing:"border-box"}}>
      {members.map(m=><option key={m.id}>{m.name}</option>)}
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

function TaskModal({ task, members, onSave, onClose }) {
  const isNew=!task;
  const [form,setForm]=useState(task?{...task}:{
    title:"",topic:"",date:"",assignee:members[0]?.name||"",reviewer:members[1]?.name||"",
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
      {lbl("Assignee",<select value={form.assignee} onChange={e=>set("assignee",e.target.value)}>{members.map(m=><option key={m.id}>{m.name}</option>)}</select>)}
      {lbl("Reviewer",<select value={form.reviewer} onChange={e=>set("reviewer",e.target.value)}>{members.map(m=><option key={m.id}>{m.name}</option>)}</select>)}
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

function TimesheetModal({ tasks, onClose }) {
  const [expanded, setExpanded] = useState({});
  const rows = useMemo(() => {
    const map = {};
    tasks.forEach(t => {
      (t.hoursLogged||[]).forEach(l => {
        if(!map[l.member]) map[l.member] = [];
        map[l.member].push({task:t.title, hours:l.hours, note:l.note});
      });
    });
    return Object.entries(map).sort((a,b)=>a[0].localeCompare(b[0]));
  }, [tasks]);

  const exportCSV = () => {
    const lines = ["Member,Task,Hours,Note"];
    rows.forEach(([member, entries]) => {
      entries.forEach(e => lines.push(`"${member}","${e.task}",${e.hours},"${e.note||""}"`));
    });
    const blob = new Blob([lines.join("\n")], {type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download="timesheet.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return <Modal title="Timesheet" icon="📊" iconBg="#E1F5EE" onClose={onClose}>
    {rows.length===0
      ? <p style={{fontSize:12,color:"#aaa",textAlign:"center",padding:"20px 0"}}>No hours logged yet.</p>
      : <>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,marginBottom:14}}>
          <thead>
            <tr style={{borderBottom:"2px solid #eee"}}>
              <th style={{textAlign:"left",padding:"6px 8px",color:"#555",fontWeight:600}}>Member</th>
              <th style={{textAlign:"right",padding:"6px 8px",color:"#555",fontWeight:600}}>Total Hours</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([member, entries])=>{
              const total = entries.reduce((s,e)=>s+e.hours,0);
              return <>
                <tr key={member} onClick={()=>setExpanded(p=>({...p,[member]:!p[member]}))}
                  style={{cursor:"pointer",borderBottom:"1px solid #f0f0f0",background:expanded[member]?"#f9f9f9":"#fff"}}>
                  <td style={{padding:"8px 8px",fontWeight:600,color:"#2d2d2d"}}>
                    <span style={{marginRight:6,fontSize:10}}>{expanded[member]?"▼":"▶"}</span>
                    {member}
                  </td>
                  <td style={{padding:"8px 8px",textAlign:"right",fontWeight:700,color:"#138A62"}}>{total}h</td>
                </tr>
                {expanded[member]&&entries.map((e,i)=>(
                  <tr key={i} style={{background:"#f5f5f5",borderBottom:"1px solid #eee"}}>
                    <td style={{padding:"5px 8px 5px 24px",color:"#555",fontSize:12}}>{e.task}{e.note&&<span style={{color:"#999",marginLeft:6}}>— {e.note}</span>}</td>
                    <td style={{padding:"5px 8px",textAlign:"right",color:"#378ADD",fontSize:12}}>{e.hours}h</td>
                  </tr>
                ))}
              </>;
            })}
          </tbody>
        </table>
        <button onClick={exportCSV} style={{width:"100%",background:"#138A62",color:"#fff",
          border:"none",borderRadius:8,padding:"8px 0",cursor:"pointer",fontWeight:600,fontSize:13}}>
          ⬇ Export CSV
        </button>
      </>
    }
  </Modal>;
}

function TeamModal({ members, onAdd, onDelete, onClose }) {
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [color,setColor]=useState(MEMBER_COLOR_OPTIONS[0]);
  const valid=name.trim().length>0;
  return <Modal title="Manage Team" icon="👥" iconBg="#EEEDFE" onClose={onClose}>
    <div style={{marginBottom:16}}>
      {members.length===0
        ? <p style={{fontSize:12,color:"#aaa",textAlign:"center",margin:"8px 0"}}>No members yet. Add one below.</p>
        : members.map(m=>(
          <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f0f0f0"}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:m.color,display:"flex",
              alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0}}>
              {m.name[0]}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"#2d2d2d"}}>{m.name}</div>
              {m.email&&<div style={{fontSize:11,color:"#888"}}>{m.email}</div>}
            </div>
            <button onClick={()=>onDelete(m.id)} style={{background:"none",border:"none",
              cursor:"pointer",color:"#bbb",fontSize:16,padding:"0 4px"}}>×</button>
          </div>
        ))
      }
    </div>
    <div style={{borderTop:"1px solid #eee",paddingTop:14}}>
      <p style={{fontSize:12,fontWeight:600,color:"#555",margin:"0 0 10px"}}>Add member</p>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"
        style={{width:"100%",boxSizing:"border-box",marginBottom:8}}/>
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email (optional)"
        style={{width:"100%",boxSizing:"border-box",marginBottom:8}}/>
      <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:12,color:"#666"}}>Color:</span>
        {MEMBER_COLOR_OPTIONS.map(c=>(
          <button key={c} onClick={()=>setColor(c)}
            style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",padding:0,
              border:color===c?"3px solid #333":"2px solid transparent"}}/>
        ))}
      </div>
      <button onClick={()=>valid&&onAdd({name:name.trim(),email:email.trim(),color})}
        style={{width:"100%",background:valid?"#7F77DD":"#ccc",color:valid?"#fff":"#888",
          border:"none",borderRadius:8,padding:"8px 0",cursor:valid?"pointer":"default",
          fontWeight:600,fontSize:13}}>
        + Add member
      </button>
    </div>
  </Modal>;
}

export default function App() {
  const [tasks,setTasks]=useState([]);
  const [members,setMembers]=useState([]);
  const [notifs,setNotifs]=useState([]);
  const [showNotifs,setShowNotifs]=useState(false);
  const [showModal,setShowModal]=useState(false);
  const [showTeam,setShowTeam]=useState(false);
  const [showTimesheet,setShowTimesheet]=useState(false);
  const [filter,setFilter]=useState({search:"",assignee:"",priority:""});
  const [editTask,setEditTask]=useState(null);
  const [feedbackTask,setFeedbackTask]=useState(null);
  const [logTimeTask,setLogTimeTask]=useState(null);
  const [dragOver,setDragOver]=useState(null);
  const [confetti,setConfetti]=useState(false);
  const dragging=useRef(null);
  const nextId=useRef(200);

  useEffect(()=>{
    supabase.from('tasks').select('*').order('id').then(({data})=>{
      if(data) setTasks(data.map(fromDb));
    });
    supabase.from('members').select('*').order('id').then(({data})=>{
      if(data){ setMembers(data); _members=data; }
    });
    supabase.from('notifications').select('*').order('id',{ascending:false}).limit(20).then(({data})=>{
      if(data) setNotifs(data);
    });

    const ch = supabase.channel('board', {config:{broadcast:{self:false}}})
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'tasks'},(payload)=>{
        setTasks(p=>p.map(t=>t.id===payload.new.id?fromDb(payload.new):t));
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'tasks'},(payload)=>{
        setTasks(p=>p.find(t=>t.id===payload.new.id)?p:[...p,fromDb(payload.new)]);
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'tasks'},(payload)=>{
        setTasks(p=>p.filter(t=>t.id!==payload.old.id));
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications'},(payload)=>{
        setNotifs(p=>p.find(n=>n.id===payload.new.id)?p:[payload.new,...p]);
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'notifications'},(payload)=>{
        setNotifs(p=>p.filter(n=>n.id!==payload.old.id));
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'members'},()=>{
        supabase.from('members').select('*').order('id').then(({data})=>{if(data){setMembers(data);_members=data;}});
      })
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);

  const addNotif=async(n)=>{
    const {data}=await supabase.from('notifications').insert(n).select().single();
    if(data) setNotifs(p=>p.find(x=>x.id===data.id)?p:[data,...p]);
  };

  const handleAddMember=async({name,email,color})=>{
    const {data}=await supabase.from('members').insert({name,email,color}).select().single();
    if(data){ setMembers(p=>{const n=[...p,data];_members=n;return n;}); }
  };
  const handleDeleteMember=async(id)=>{
    await supabase.from('members').delete().eq('id',id);
    setMembers(p=>{const n=p.filter(m=>m.id!==id);_members=n;return n;});
  };

  const filteredTasks=tasks.filter(t=>{
    if(filter.assignee && t.assignee!==filter.assignee) return false;
    if(filter.priority && t.priority!==filter.priority) return false;
    if(filter.search){
      const q=filter.search.toLowerCase();
      if(!t.title.toLowerCase().includes(q) && !t.topic.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const colTasks=COL_ORDER.reduce((acc,c)=>({...acc,[c]:filteredTasks.filter(t=>t.col===c)}),{});
  const anyFilter=filter.search||filter.assignee||filter.priority;
  const boom=()=>{setConfetti(true);setTimeout(()=>setConfetti(false),2200);};

  const handleDragStart=(e,id,col)=>{dragging.current={taskId:id,fromCol:col};e.dataTransfer.effectAllowed="move";};
  const handleDrop=(e,toCol)=>{
    e.preventDefault();setDragOver(null);
    if(!dragging.current)return;
    const {taskId,fromCol}=dragging.current;dragging.current=null;
    if(fromCol===toCol)return;
    const task=tasks.find(t=>t.id===taskId);if(!task)return;
    setTasks(p=>p.map(t=>t.id===taskId?{...t,col:toCol}:t));
    supabase.from('tasks').update({col:toCol}).eq('id',taskId).then(({error})=>{if(error)console.error('Update error:',error)});
    if(toCol==="done")boom();
    if(toCol==="review"&&task.reviewer)
      addNotif({type:"review",from:task.reviewer,title:task.title,topic:task.topic||"",comment:null});
  };
  const handleApprove=t=>{
    setTasks(p=>p.map(tk=>tk.id===t.id?{...tk,col:"done"}:tk));
    supabase.from('tasks').update({col:'done'}).eq('id',t.id);
    addNotif({type:"approve",from:t.reviewer,title:t.title,topic:"",comment:"Approved!"});
    boom();
  };
  const handleFeedback=(task,reviewer,comment)=>{
    const newFeedback=[...(task.feedback||[]),{reviewer,comment,at:new Date().toLocaleDateString()}];
    setTasks(p=>p.map(t=>t.id===task.id?{...t,col:"inprogress",feedback:newFeedback}:t));
    supabase.from('tasks').update({col:'inprogress',feedback:newFeedback}).eq('id',task.id);
    addNotif({type:"feedback",from:reviewer,title:task.title,topic:task.topic||"",comment});
    setFeedbackTask(null);
  };
  const handleLogTime=(task,entry)=>{
    const newLog=[...(task.hoursLogged||[]),entry];
    setTasks(p=>p.map(t=>t.id===task.id?{...t,hoursLogged:newLog}:t));
    supabase.from('tasks').update({hours_logged:newLog}).eq('id',task.id);
    setLogTimeTask(null);
  };
  const handleSave=async form=>{
    if(form.id){
      setTasks(p=>p.map(t=>t.id===form.id?form:t));
      supabase.from('tasks').update(toDb(form)).eq('id',form.id);
    } else {
      const {data}=await supabase.from('tasks').insert(toDb({...form,feedback:[],hoursLogged:[]})).select().single();
      setTasks(p=>[...p, data?fromDb(data):{...form,id:nextId.current++,feedback:[],hoursLogged:[]}]);
    }
    setShowModal(false);setEditTask(null);
  };

  return (
    <div style={{minHeight:"100vh",
      background:"linear-gradient(135deg, #c7d2fe 0%, #ddd6fe 45%, #fbcfe8 100%)",
      padding:"16px 16px 32px",fontFamily:"'Inter','Segoe UI',sans-serif"}}>

      <Confetti run={confetti}/>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div>
          <h2 style={{fontSize:24,fontWeight:800,margin:"0 0 2px",color:"#1e1b4b",
            letterSpacing:"-0.5px"}}>Too lazy to Task</h2>
          <p style={{margin:0,fontSize:12,color:"#64748b",fontWeight:500}}>
            {tasks.filter(t=>t.col==="done").length}/{tasks.length} tasks done
          </p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowNotifs(v=>!v)} style={{
              background:"rgba(255,255,255,0.9)",border:"1.5px solid #e2e8f0",
              borderRadius:10,padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:600,
              color:notifs.length>0?"#7c3aed":"#475569",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
              🔔{notifs.length>0&&<span style={{marginLeft:6,background:"#7c3aed",color:"#fff",
                borderRadius:20,padding:"1px 7px",fontSize:10}}>{notifs.length}</span>}
            </button>
            {showNotifs&&<NotifPanel notifs={notifs}
              onClear={id=>{supabase.from('notifications').delete().eq('id',id);setNotifs(p=>p.filter(n=>n.id!==id));}}
              onClearAll={async()=>{const ids=notifs.map(n=>n.id);if(ids.length)await supabase.from('notifications').delete().in('id',ids);setNotifs([]);}}/>}
          </div>
          <button onClick={()=>setShowTimesheet(true)} style={{
            background:"rgba(255,255,255,0.9)",color:"#475569",border:"1.5px solid #e2e8f0",
            borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer",
            boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            📊 Timesheet
          </button>
          <button onClick={()=>setShowTeam(true)} style={{
            background:"rgba(255,255,255,0.9)",color:"#475569",border:"1.5px solid #e2e8f0",
            borderRadius:10,padding:"8px 14px",fontSize:13,fontWeight:600,cursor:"pointer",
            boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            👥 Team
          </button>
          <button onClick={()=>{setEditTask(null);setShowModal(true);}} style={{
            background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",border:"none",
            borderRadius:10,padding:"8px 18px",fontSize:13,fontWeight:700,cursor:"pointer",
            boxShadow:"0 4px 12px rgba(124,58,237,0.35)"}}>
            + Add task
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={filter.search} onChange={e=>setFilter(f=>({...f,search:e.target.value}))}
          placeholder="🔍 Search tasks..."
          style={{flex:1,minWidth:140,background:"rgba(255,255,255,0.85)",border:"1.5px solid #e2e8f0",color:"#0f172a",borderRadius:10}}/>
        <select value={filter.assignee} onChange={e=>setFilter(f=>({...f,assignee:e.target.value}))}
          style={{background:"rgba(255,255,255,0.85)",border:"1.5px solid #e2e8f0",color:"#0f172a",minWidth:130,borderRadius:10}}>
          <option value="">All assignees</option>
          {members.map(m=><option key={m.id}>{m.name}</option>)}
        </select>
        <select value={filter.priority} onChange={e=>setFilter(f=>({...f,priority:e.target.value}))}
          style={{background:"rgba(255,255,255,0.85)",border:"1.5px solid #e2e8f0",color:"#0f172a",minWidth:130,borderRadius:10}}>
          <option value="">All priorities</option>
          {["High","Medium","Low"].map(p=><option key={p}>{p}</option>)}
        </select>
        {anyFilter&&<button onClick={()=>setFilter({search:"",assignee:"",priority:""})}
          style={{background:"rgba(255,255,255,0.85)",border:"1.5px solid #e2e8f0",
            borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:12,color:"#64748b",fontWeight:600}}>
          ✕ Clear
        </button>}
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
            style={{background:isOver?"rgba(255,255,255,0.92)":meta.light,
              borderRadius:16,overflow:"hidden",
              border:isOver?`2px dashed ${meta.header}`:`2px solid ${meta.header}30`,
              boxShadow:`0 4px 20px ${meta.header}18`,
              transition:"all .2s ease"}}>
            {/* Column header */}
            <div style={{background:meta.header,padding:"12px 14px",
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#fff",letterSpacing:"0.2px"}}>
                {meta.emoji} {meta.label}
              </span>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:11,background:"rgba(255,255,255,0.2)",color:"#fff",
                  borderRadius:20,padding:"2px 10px",fontWeight:600}}>{list.length}</span>
                <span style={{fontSize:11,background:"rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.9)",
                  borderRadius:20,padding:"2px 10px",fontWeight:600}}>{colPts}pts</span>
              </div>
            </div>
            {/* Cards */}
            <div style={{padding:"12px 10px 8px",minHeight:200}}>
              {list.map(task=>(
                <StickyNote key={task.id} task={task}
                  onDragStart={handleDragStart}
                  onEdit={t=>{setEditTask(t);setShowModal(true);}}
                  onDelete={async id=>{setTasks(p=>p.filter(t=>t.id!==id));const {error}=await supabase.from('tasks').delete().eq('id',id);if(error)console.error('Delete error:',error);}}
                  onFeedback={t=>setFeedbackTask(t)}
                  onApprove={handleApprove}
                  onLogTime={t=>setLogTimeTask(t)}/>
              ))}
              {list.length===0&&<p style={{textAlign:"center",fontSize:12,
                color:"#94a3b8",marginTop:32,fontStyle:"italic"}}>Drop cards here</p>}
            </div>
          </div>;
        })}
      </div>

      {showModal&&<TaskModal task={editTask} members={members} onSave={handleSave} onClose={()=>{setShowModal(false);setEditTask(null);}}/>}
      {feedbackTask&&<FeedbackModal task={feedbackTask} members={members} onSend={(r,c)=>handleFeedback(feedbackTask,r,c)} onClose={()=>setFeedbackTask(null)}/>}
      {logTimeTask&&<LogTimeModal task={logTimeTask} members={members} onSave={e=>handleLogTime(logTimeTask,e)} onClose={()=>setLogTimeTask(null)}/>}
      {showTeam&&<TeamModal members={members} onAdd={handleAddMember} onDelete={handleDeleteMember} onClose={()=>setShowTeam(false)}/>}
      {showTimesheet&&<TimesheetModal tasks={tasks} onClose={()=>setShowTimesheet(false)}/>}
    </div>
  );
}