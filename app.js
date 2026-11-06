'use strict';
// User-provided background track. Playback requires a user gesture on iOS Safari.
const music = document.getElementById('backgroundMusic');
const playButton = document.getElementById('musicPlay');
const toggleButton = document.getElementById('soundToggle');
const enterButton = document.getElementById('enterExperience');
const panel = document.getElementById('musicPanel');
const status = document.getElementById('musicStatus');
const label = document.getElementById('soundLabel');
const volume = document.getElementById('volume');
music.volume = Number(volume.value) / 100;
function updateUI(){
 const playing = !music.paused;
 panel.classList.toggle('playing', playing);
 playButton.textContent = playing ? 'Ⅱ' : '▶';
 playButton.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
 playButton.setAttribute('aria-pressed', String(playing));
 toggleButton.setAttribute('aria-label', playing ? '关闭背景音乐' : '开启背景音乐');
 toggleButton.setAttribute('aria-pressed', String(playing));
 label.textContent = playing ? '音乐播放中' : '音乐关闭';
 status.textContent = playing ? '平生不晚 · 荒 · 播放中' : '平生不晚 · 荒 · 已暂停';
}
async function startAudio(){
 try { await music.play(); updateUI(); }
 catch(error){ updateUI(); status.textContent='无法自动播放，请点击播放按钮重试'; }
}
function toggleAudio(){ if(music.paused) startAudio(); else music.pause(); }
playButton.addEventListener('click', toggleAudio);
toggleButton.addEventListener('click', toggleAudio);
enterButton.addEventListener('click', () => {
 if(music.paused) startAudio();
 document.getElementById('architecture').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
});
volume.addEventListener('input', () => {music.volume=Number(volume.value)/100;});
['play','pause','ended'].forEach(name=>music.addEventListener(name,updateUI));
music.addEventListener('error',()=>{updateUI();status.textContent='音频加载失败，请检查 assets/audio/background.mp3';});
const items=document.querySelectorAll('.reveal');
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target)}})},{threshold:.09,rootMargin:'0px 0px -25px 0px'});
 items.forEach(e=>observer.observe(e));
}else{items.forEach(e=>e.classList.add('visible'));}
// No scroll-triggered audio: browsers restrict audible autoplay.
updateUI();
