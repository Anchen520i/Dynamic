"use strict";
const audio=document.getElementById('backgroundMusic');
const playBtn=document.getElementById('musicPlay');
const toggleBtn=document.getElementById('soundToggle');
const enterBtn=document.getElementById('enterExperience');
const panel=document.getElementById('musicPanel');
const statusEl=document.getElementById('musicStatus');
const titleEl=document.getElementById('musicTitle');
const labelEl=document.getElementById('soundLabel');
const volumeEl=document.getElementById('volume');
const seekEl=document.getElementById('musicSeek');
const elapsedEl=document.getElementById('musicElapsed');
const durationEl=document.getElementById('musicDuration');
const modeBtn=document.getElementById('musicMode');
const drawer=document.getElementById('playlistDrawer');
const listEl=document.getElementById('playlistItems');
const searchEl=document.getElementById('playlistSearch');
const openBtn=document.getElementById('playlistOpen');
const closeBtn=document.getElementById('playlistClose');
const fmt=s=>Number.isFinite(s)?`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`:'0:00';
const modes=['sequential','repeat-one','shuffle'];
const modeLabels=['顺序播放','单曲循环','随机播放'];
let tracks=[],index=0,mode=0,ready=false;
const storedVolume=Number(localStorage.getItem('mystic-volume'));
volumeEl.value=Number.isFinite(storedVolume)&&storedVolume>=0&&storedVolume<=100?storedVolume:30;
audio.volume=Number(volumeEl.value)/100;
function updateUI(){
 const playing=!audio.paused;
 panel.classList.toggle('playing',playing);
 playBtn.textContent=playing?'Ⅱ':'▶';
 playBtn.setAttribute('aria-label',playing?'暂停音乐':'播放音乐');
 playBtn.setAttribute('aria-pressed',String(playing));
 toggleBtn.setAttribute('aria-label',playing?'暂停音乐':'播放音乐');
 toggleBtn.setAttribute('aria-pressed',String(playing));
 labelEl.textContent=playing?'播放中':'音乐';
 if(ready){statusEl.textContent=`${tracks[index].artist} · ${playing?'正在播放':'已暂停'}`;}
 renderList();
}
function renderList(){
 const query=searchEl.value.trim().toLocaleLowerCase();
 listEl.replaceChildren();
 tracks.forEach((t,i)=>{
  if(query&&!`${t.title} ${t.artist}`.toLocaleLowerCase().includes(query))return;
  const button=document.createElement('button');button.type='button';button.className='playlist-item'+(i===index?' active':'');
  button.setAttribute('role','listitem');button.setAttribute('aria-current',String(i===index));
  const n=document.createElement('span');n.className='playlist-index';n.textContent=i===index&&!audio.paused?'♫':String(i+1).padStart(2,'0');
  const copy=document.createElement('span');copy.className='playlist-item-copy';
  const title=document.createElement('strong');title.textContent=t.title;
  const artist=document.createElement('small');artist.textContent=t.artist;
  const length=document.createElement('span');length.className='playlist-length';length.textContent=fmt(t.duration);
  copy.append(title,artist);button.append(n,copy,length);
  button.addEventListener('click',()=>selectTrack(i,true));listEl.append(button);
 });
 if(!listEl.children.length){const empty=document.createElement('p');empty.textContent='没有找到匹配的歌曲';empty.className='playlist-foot';listEl.append(empty);}
}
function selectTrack(next,autoplay=false){
 if(!ready)return;
 index=(next+tracks.length)%tracks.length;
 const t=tracks[index];
 audio.pause();audio.src=t.src;audio.load();
 titleEl.textContent=t.title;durationEl.textContent=fmt(t.duration);elapsedEl.textContent='0:00';seekEl.value=0;
 try{localStorage.setItem('mystic-track',t.id);}catch(e){}
 updateUI();
 if(autoplay)playAudio();
}
async function playAudio(){
 if(!ready){statusEl.textContent='歌单尚未加载完成';return;}
 try{await audio.play();updateUI();}
 catch(e){updateUI();statusEl.textContent='播放受限，请再次点击播放';}
}
function toggle(){if(audio.paused)playAudio();else audio.pause();}
function nextTrack(){if(mode===2&&tracks.length>1){let next;do{next=Math.floor(Math.random()*tracks.length);}while(next===index);selectTrack(next,true);}else selectTrack(index+1,true);}
playBtn.addEventListener('click',toggle);toggleBtn.addEventListener('click',toggle);
document.getElementById('musicPrev').addEventListener('click',()=>selectTrack(index-1,true));
document.getElementById('musicNext').addEventListener('click',nextTrack);
enterBtn.addEventListener('click',()=>{if(audio.paused)playAudio();document.getElementById('architecture').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});
volumeEl.addEventListener('input',()=>{audio.volume=Number(volumeEl.value)/100;try{localStorage.setItem('mystic-volume',volumeEl.value);}catch(e){}});
modeBtn.addEventListener('click',()=>{mode=(mode+1)%3;modeBtn.textContent=['⇄','↻','⤨'][mode];modeBtn.setAttribute('aria-label','播放模式：'+modeLabels[mode]);modeBtn.title=modeLabels[mode];});
seekEl.addEventListener('input',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Number(seekEl.value)/1000*audio.duration;});
audio.addEventListener('timeupdate',()=>{elapsedEl.textContent=fmt(audio.currentTime);if(Number.isFinite(audio.duration)&&audio.duration>0)seekEl.value=Math.round(audio.currentTime/audio.duration*1000);});
audio.addEventListener('loadedmetadata',()=>{durationEl.textContent=fmt(audio.duration);});
audio.addEventListener('ended',()=>{if(mode===1){audio.currentTime=0;playAudio();}else if(mode===0&&index===tracks.length-1){audio.pause();audio.currentTime=0;updateUI();}else nextTrack();});
['play','pause'].forEach(e=>audio.addEventListener(e,updateUI));
audio.addEventListener('error',()=>{statusEl.textContent='音频加载失败，请检查资源路径';});
function setDrawer(open){drawer.classList.toggle('open',open);drawer.setAttribute('aria-hidden',String(!open));drawer.inert=!open;openBtn.setAttribute('aria-expanded',String(open));if(open){searchEl.focus();renderList();}else openBtn.focus();}
openBtn.addEventListener('click',()=>setDrawer(!drawer.classList.contains('open')));
closeBtn.addEventListener('click',()=>setDrawer(false));
searchEl.addEventListener('input',renderList);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('open'))setDrawer(false);});
async function init(){
 try{
  const res=await fetch('./assets/audio/playlist.json',{cache:'no-cache'});
  if(!res.ok)throw Error('HTTP '+res.status);
  const data=await res.json();
  if(!Array.isArray(data.tracks)||!data.tracks.length)throw Error('Empty playlist');
  tracks=data.tracks;ready=true;
  document.getElementById('trackCount').textContent=`${tracks.length} TRACKS`;
  let saved;try{saved=localStorage.getItem('mystic-track');}catch(e){}
  const savedIndex=tracks.findIndex(t=>t.id===saved);
  selectTrack(savedIndex>=0?savedIndex:0,false);
 }catch(e){titleEl.textContent='音乐列表加载失败';statusEl.textContent='请通过 HTTP(S) 访问网站，并检查 playlist.json';}
}
const items=document.querySelectorAll('.reveal');
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}}),{threshold:.09,rootMargin:'0px 0px -25px 0px'});items.forEach(e=>observer.observe(e));}
else items.forEach(e=>e.classList.add('visible'));
init();
