'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const translations = $$('[data-en]').map(element => ({element, zh: element.innerHTML, en: element.dataset.en}));
let language = 'zh';
try { language = localStorage.getItem('one-g-language') === 'en' ? 'en' : 'zh'; } catch {}
let mode = 'three';
let method = 'sonic';
let demoFilter = 'all';
let allDemos = false;
let lastDialogTrigger;
const motionStates = new Map();
const visibleMotion = new WeakMap();
const text = value => typeof value === 'string' ? value : value[language];

const modes = {
  three: {
    title: {zh:'手柄与手部追踪', en:'Controllers & hand tracking'},
    description: {zh:'头显与双手追踪控制上身姿态，导航输入控制移动。支持手柄和手部追踪两种交互方式。', en:'Head and hand tracking control upper-body pose; navigation input controls locomotion. Both controllers and hand tracking are supported.'},
    input: {zh:'头显 + 手柄 / 手部追踪', en:'Headset + controllers / hand tracking'},
    effect: {zh:'上身姿态与移动', en:'Upper-body pose and locomotion'},
    video:'dual-mode-real.mp4', poster:'dual-mode-real.jpg'
  },
  full: {
    title:{zh:'俯身抓取',en:'Bend & grasp'},
    description:{zh:'结合头显、手柄与脚踝追踪，控制机器人俯身、伸手与抓取。',en:'A headset, controllers and ankle trackers capture whole-body pose to control bending, reaching and grasping.'},
    input:{zh:'头显 + 双手控制器 + 脚踝追踪器',en:'Headset + controllers + ankle trackers'},
    effect:{zh:'全身姿态跟踪与抓取',en:'Whole-body tracking and grasping'},
    video:'wholebody-pick.mp4',poster:'pick-poster.jpg'
  }
};

const methods = {
  sonic:{
    category:{zh:'SONIC / 遥操作',en:'SONIC / TELEOPERATION'},
    title:{zh:'统一全身控制策略',en:'Unified whole-body control'},
    description:{zh:'将三点或全身输入编码为统一的运动 token，再由共享控制策略生成全身动作。三点输入通过运动学规划器补全参考运动。',en:'Three-point or full-body input is encoded into shared motion tokens and decoded into whole-body actions. A kinematic planner completes the reference motion for three-point input.'},
    steps:{zh:['三点 / 全身输入','运动目标与编码','统一运动 token','全身控制策略'],en:['3-point / full-body input','Motion targets & encoding','Shared motion tokens','Whole-body policy']},
    image:'sonic-overview.png',
    caption:{zh:'SONIC · 方法概览 · Luo et al.',en:'SONIC · Method overview · Luo et al.'},
    paper:'https://arxiv.org/abs/2511.07820',project:'https://nvlabs.github.io/GEAR-SONIC/',source:'https://nvlabs.github.io/GEAR-SONIC/static/images/overview.png'
  },
  any2any:{
    category:{zh:'ANY2ANY / 跨本体迁移',en:'ANY2ANY / CROSS-EMBODIMENT TRANSFER'},
    title:{zh:'跨本体策略适配',en:'Cross-embodiment policy adaptation'},
    description:{zh:'对齐观测与动作空间，冻结预训练策略主干，通过 LoRA 适配动力学敏感模块，迁移全身跟踪能力。',en:'Align observations and actions, freeze the pretrained backbone, and adapt dynamics-sensitive modules with LoRA to transfer whole-body tracking.'},
    steps:{zh:['已有跟踪策略','运动学与接口对齐','冻结主干 + LoRA','目标机器人'],en:['Pretrained tracking policy','Kinematic alignment','Frozen backbone + LoRA','Target embodiment']},
    image:'any2any-architecture.png',
    caption:{zh:'Any2Any · 架构图 · Figure 2',en:'Any2Any · Architecture · Figure 2'},
    paper:'https://arxiv.org/abs/2605.23733',project:'https://any2any.top/',source:'https://any2any.top/assets/figures/figure2-architecture.png?v=method-crop-20260617'
  },
  morphmimic:{
    category:{zh:'MORPHMIMIC / 共享模型',en:'MORPHMIMIC / SHARED MODEL'},
    title:{zh:'多本体共享模型',en:'A shared model across embodiments'},
    description:{zh:'统一关节与身体表示，以形态描述为条件，共享世界模型、运动编码器和控制解码器，对齐跨本体动作潜变量。',en:'A unified body representation and morphology conditioning enable a shared world model, motion encoder and control decoder, with aligned motion latents across embodiments.'},
    steps:{zh:['统一身体表示','输入形态描述','共享世界模型与策略','跨本体动作控制'],en:['Unified body layout','Morphology conditioning','Shared world model & policy','Cross-body control']},
    image:'morphmimic-framework.png',
    caption:{zh:'MorphMimic · Yang et al., 2026 · Figure 2',en:'MorphMimic · Yang et al., 2026 · Figure 2'},
    paper:'https://lzyang2000.github.io/morphmimic/static/morphmimic.pdf',project:'https://lzyang2000.github.io/morphmimic/',source:'https://lzyang2000.github.io/morphmimic/static/images/fig2.png'
  },
  supermimic:{
    category:{zh:'SUPERMIMIC / 动作学习',en:'SUPERMIMIC / MOTION LEARNING'},
    title:{zh:'可微世界模型训练',en:'Differentiable world-model training'},
    description:{zh:'用仿真数据拟合可微世界模型，通过短程想象轨迹的反向传播更新策略。模型与策略交替优化，梯度不经过仿真器。',en:'Fit a differentiable world model to simulation data, then update the policy through short imagined rollouts. Model and policy updates alternate; gradients do not pass through the simulator.'},
    steps:{zh:['仿真器采样','更新回放数据','拟合世界模型','想象轨迹优化策略'],en:['Collect in simulation','Update replay data','Fit the world model','Optimize imagined rollouts']},
    image:'supermimic-training-loop.png',
    caption:{zh:'SuperMimic · Liao et al., 2026 · Figure 2',en:'SuperMimic · Liao et al., 2026 · Figure 2'},
    paper:'https://arxiv.org/abs/2610.28480',project:'https://supermimic.github.io/',source:'https://arxiv.org/pdf/2610.28480#page=4'
  }
};

const demos = [
  {video:'wholebody-kick.mp4',poster:'kick-poster.jpg',kind:'real',title:{zh:'动态踢腿',en:'Dynamic kick'},detail:{zh:'G1 · 全身遥操 · 12 秒',en:'G1 · Whole-body control · 12 s'}},
  {video:'wholebody-pick.mp4',poster:'pick-poster.jpg',kind:'real',title:{zh:'俯身抓取',en:'Bend & grasp'},detail:{zh:'G1 · 全身遥操 · 19 秒',en:'G1 · Whole-body control · 19 s'}},
  {video:'camera-teleop.mp4',poster:'camera-poster.jpg',kind:'real',title:{zh:'单目视觉遥操',en:'Single-camera control'},detail:{zh:'G1 · 无穿戴输入 · 26 秒',en:'G1 · No wearables · 26 s'}},
  {video:'headset-hand-interaction.mp4',poster:'headset-hand-interaction-poster.jpg',kind:'simulation',title:{zh:'手部追踪与手柄交互',en:'Hand tracking & controllers'},detail:{zh:'第一人称 · 双模式交互 · 97 秒',en:'First person · Dual-mode interaction · 97 s'}},
  {video:'dance-video-motion.mp4',poster:'dance-video-motion-poster.jpg',kind:'real',portrait:true,title:{zh:'视频动作复现',en:'Motion from video'},detail:{zh:'G1 · 舞蹈动作复现 · 16 秒',en:'G1 · Dance motion recreation · 16 s'}},
  {video:'music-motion.mp4',poster:'music-motion-poster.jpg',kind:'simulation',title:{zh:'音乐驱动动作',en:'Motion from music'},detail:{zh:'G1 · 音乐输入 · 48 秒',en:'G1 · Music input · 48 s'}},
  {video:'headset-only-teleop.mp4',poster:'headset-only-poster.jpg',kind:'simulation',title:{zh:'头显手势与灵巧手',en:'Headset gestures & dexterous hands'},detail:{zh:'夹爪 / 灵巧手 · 64 秒',en:'Grippers / dexterous hands · 64 s'}},
  {video:'wholebody-balance.mp4',poster:'balance-poster.jpg',kind:'real',title:{zh:'单脚平衡',en:'Single-leg balance'},detail:{zh:'G1 · 姿态跟踪 · 15 秒',en:'G1 · Pose tracking · 15 s'}},
  {video:'dual-mode-real.mp4',poster:'dual-mode-real.jpg',kind:'real',portrait:true,title:{zh:'三点遥操',en:'Three-point control'},detail:{zh:'G1 · 手柄 / 手部追踪 · 140 秒',en:'G1 · Controllers / hand tracking · 140 s'}},
  {video:'x2-morphmimic.mp4',poster:'x2-morphmimic.jpg',kind:'simulation',title:{zh:'X2 动作跟踪',en:'X2 motion tracking'},detail:{zh:'X2 · MorphMimic',en:'X2 · MorphMimic'}}
];

function loadVideo(video) {
  if (video.dataset.src) {video.src = video.dataset.src; delete video.dataset.src; video.load();}
}
function updateMotionControls() {
  $$('.motion-showcase').forEach(gallery=>{
    const paused=motionStates.get(gallery.id)?.paused ?? true;
    const button=$('.motion-playback',gallery);
    button.dataset.paused=paused;
    button.setAttribute('aria-label',language==='zh'?(paused?'播放这组演示':'暂停这组演示'):(paused?'Play these demonstrations':'Pause these demonstrations'));
    $('.motion-control-label',button).textContent=language==='zh'?(paused?'播放':'暂停'):(paused?'Play':'Pause');
    $$('.motion-item',gallery).forEach(item=>$('.motion-open',item).setAttribute('aria-label',`${language==='zh'?'放大播放':'Play enlarged'}: ${$('h3',item).textContent}`));
  });
}
function syncMotionPlayback() {
  $$('video[data-gallery]').forEach(video=>{
    const state=motionStates.get(video.dataset.gallery);
    const active=state&&!state.paused&&visibleMotion.get(video)&&!video.closest('[hidden]')&&!document.hidden&&!$('#media-dialog').open;
    if(active){
      loadVideo(video);
      video.play().catch(error=>{
        if(error.name!=='NotAllowedError')return;
        const gallery=document.getElementById(video.dataset.gallery);
        if(!$$('video',gallery).some(other=>!other.paused)) {state.paused=true;updateMotionControls();}
      });
    } else video.pause();
  });
}
function setTransfer(next) {
  $$('.motion-tabs [role=tab]').forEach(button=>{
    const active=button.dataset.transfer===next;
    button.setAttribute('aria-selected',active);
    button.tabIndex=active?0:-1;
    document.getElementById(button.getAttribute('aria-controls')).hidden=!active;
  });
  syncMotionPlayback();
}
function setMode(next, changeMedia = true) {
  mode = next;
  const data = modes[mode];
  $$('#teleoperation [role=tab]').forEach(button => {const selected = button.dataset.mode === mode; button.setAttribute('aria-selected', selected);button.tabIndex = selected ? 0 : -1;});
  $('#teleop-panel').setAttribute('aria-labelledby', `mode-${mode}`);
  $('#teleop-panel').dataset.mode = mode;
  $('#mode-title').innerHTML = text(data.title);
  $('#mode-description').textContent = text(data.description);
  $('#mode-input').textContent = text(data.input);
  $('#mode-effect').textContent = text(data.effect);
  const video = $('#teleop-video');
  video.setAttribute('aria-label', text(data.title).replace(/<br>/g,' '));
  if (changeMedia) {video.pause();video.poster = `assets/images/${data.poster}`;video.src = `assets/videos/${data.video}`;delete video.dataset.src;video.load();}
}
function setMethod(next) {
  method = next;
  const data = methods[method];
  $$('.tech-tabs [role=tab]').forEach(button => {const selected = button.dataset.tech === method;button.setAttribute('aria-selected',selected);button.tabIndex=selected?0:-1;});
  $('#tech-panel').setAttribute('aria-labelledby',`tab-${method}`);
  $('#tech-category').textContent = text(data.category);
  $('#tech-title').textContent = text(data.title);
  $('#tech-description').textContent = text(data.description);
  $('#tech-caption').textContent = text(data.caption);
  $('#tech-flow').replaceChildren(...text(data.steps).map((step,i) => {const li=document.createElement('li');const number=document.createElement('span');number.textContent=`0${i+1}`;const label=document.createElement('span');label.textContent=step;li.append(number,label);return li;}));
  $('#tech-image').src = `assets/papers/${data.image}`;
  $('#tech-image').alt = text(data.caption);
  $('#tech-paper').href = data.paper;
  $('#tech-project').href = data.project;
  $('#tech-source').href = data.source;
  $('#figure-open').setAttribute('aria-label',language==='zh'?`放大 ${method} 论文原图`:`Enlarge the ${method} paper figure`);
}
function openDialog(title, node, caption, trigger) {
  lastDialogTrigger = trigger;
  $$('video').forEach(video => video.pause());
  $('#dialog-title').textContent=title;
  $('#dialog-content').replaceChildren(node);
  $('#dialog-caption').textContent=caption;
  $('#media-dialog').showModal();
  $('#dialog-close').focus();
}
function renderDemos() {
  const filtered = demos.filter(demo => demoFilter==='all' || demo.kind===demoFilter);
  const visible = allDemos ? filtered : filtered.slice(0,6);
  $('#demo-grid').replaceChildren(...visible.map(demo => {
    const article=document.createElement('article');article.className='demo-card';
    const button=document.createElement('button');button.className=`demo-thumb${demo.portrait?' portrait':''}`;button.type='button';button.setAttribute('aria-label',`${language==='zh'?'播放':'Play'} ${text(demo.title)}`);
    const img=document.createElement('img');img.src=`assets/images/${demo.poster}`;img.alt='';img.loading='lazy';img.width=640;img.height=400;
    const play=document.createElement('span');play.className='demo-play';play.textContent='▶';play.setAttribute('aria-hidden','true');
    const status=document.createElement('span');status.className='demo-status';status.textContent=demo.kind==='real'?(language==='zh'?'真机':'REAL ROBOT'):(language==='zh'?'仿真':'SIMULATION');
    button.append(img,play,status);
    const heading=document.createElement('h3');heading.textContent=text(demo.title);
    const detail=document.createElement('p');detail.textContent=text(demo.detail);
    article.append(button,heading,detail);
    button.addEventListener('click',()=>{const video=document.createElement('video');video.src=`assets/videos/${demo.video}`;video.poster=img.src;video.controls=true;video.playsInline=true;video.preload='metadata';video.setAttribute('aria-label',text(demo.title));openDialog(text(demo.title),video,`ONE-G · ${status.textContent} · ${text(demo.detail)}`,button);video.play().catch(()=>{});});
    return article;
  }));
  $('#demo-count').textContent=language==='zh'?`${filtered.length} 段演示`:`${filtered.length} demonstrations`;
  $('#show-all').hidden=allDemos || filtered.length<=6;
}
function applyLanguage() {
  translations.forEach(({element,zh,en})=>element.innerHTML=language==='en'?en:zh);
  document.documentElement.lang=language==='zh'?'zh-CN':'en';
  document.title=language==='zh'?'ONE-G · 人形机器人运动控制':'ONE-G · Humanoid motion & control';
  $('#language-toggle').innerHTML=language==='zh'?'EN <span aria-hidden="true">↗</span>':'中文 <span aria-hidden="true">↗</span>';
  $('#language-toggle').setAttribute('aria-label',language==='zh'?'Switch to English':'切换为中文');
  $('#hero-video').setAttribute('aria-label',language==='zh'?'ONE-G G1 全身遥操：俯身抓取':'ONE-G G1 whole-body teleoperation: bend and grasp');
  setMode(mode,false);setMethod(method);renderDemos();updateHeroButton();updateMotionControls();
}

$('#language-toggle').addEventListener('click',()=>{language=language==='zh'?'en':'zh';try{localStorage.setItem('one-g-language',language);}catch{}applyLanguage();});
$$('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
$$('[data-tech]').forEach(button=>button.addEventListener('click',()=>setMethod(button.dataset.tech)));
$$('[data-transfer]').forEach(button=>button.addEventListener('click',()=>setTransfer(button.dataset.transfer)));
$$('.motion-playback').forEach(button=>button.addEventListener('click',()=>{
  const gallery=button.closest('.motion-showcase');
  const state=motionStates.get(gallery.id);
  state.paused=!state.paused;
  updateMotionControls();
  syncMotionPlayback();
}));
$$('.motion-open').forEach(button=>button.addEventListener('click',()=>{
  const item=button.closest('.motion-item');
  const inline=$('video',button);
  const video=document.createElement('video');
  video.src=inline.currentSrc||inline.dataset.src||inline.src;
  video.poster=inline.poster;
  video.controls=true;video.playsInline=true;video.loop=true;video.preload='metadata';
  const title=$('h3',item).textContent;
  video.setAttribute('aria-label',title);
  openDialog(title,video,`${item.dataset.motionSource} · ${language==='zh'?'ONE-G 仿真':'ONE-G simulation'}`,button);
  video.play().catch(()=>{});
}));
$$('[data-route]').forEach(button=>button.addEventListener('click',()=>{setMethod(button.dataset.route);$('#technology').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
$$('[role=tablist]').forEach(list=>list.addEventListener('keydown',event=>{
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
  const tabs=$$('[role=tab]',list);const current=tabs.indexOf(document.activeElement);if(current<0)return;
  event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  tabs[next].focus();tabs[next].click();
}));
$$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{demoFilter=button.dataset.filter;allDemos=false;$$('[data-filter]').forEach(other=>{const active=other===button;other.classList.toggle('active',active);other.setAttribute('aria-pressed',active);});renderDemos();}));
$('#show-all').addEventListener('click',()=>{allDemos=true;renderDemos();});
$('#figure-open').addEventListener('click',event=>{const data=methods[method];const img=document.createElement('img');img.src=`assets/papers/${data.image}`;img.alt=text(data.caption);openDialog(`${method==='sonic'?'SONIC':method==='any2any'?'Any2Any':method==='morphmimic'?'MorphMimic':'SuperMimic'} · ${language==='zh'?'原论文配图':'Original paper figure'}`,img,text(data.caption),event.currentTarget);});
$('#dialog-close').addEventListener('click',()=>$('#media-dialog').close());
$('#media-dialog').addEventListener('click',event=>{if(event.target===event.currentTarget){const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.currentTarget.close();}});
$('#media-dialog').addEventListener('close',()=>{$$('video',$('#dialog-content')).forEach(video=>{video.pause();video.removeAttribute('src');video.load();});$('#dialog-content').replaceChildren();lastDialogTrigger?.focus();syncMotionPlayback();});

const hero=$('#hero-video');
let heroUserPaused=false;
function updateHeroButton(){const paused=hero.paused;$('#hero-pause').firstElementChild.textContent=paused?'▶':'Ⅱ';$('#hero-pause').setAttribute('aria-label',language==='zh'?(paused?'播放首屏视频':'暂停首屏视频'):(paused?'Play hero video':'Pause hero video'));}
$('#hero-pause').addEventListener('click',()=>{if(hero.paused){heroUserPaused=false;hero.play().catch(()=>{});}else{heroUserPaused=true;hero.pause();}});
hero.addEventListener('play',updateHeroButton);hero.addEventListener('pause',updateHeroButton);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
if(reducedMotion.matches || navigator.connection?.saveData){hero.autoplay=false;hero.pause();heroUserPaused=true;}
$$('.motion-showcase').forEach(gallery=>motionStates.set(gallery.id,{paused:reducedMotion.matches||Boolean(navigator.connection?.saveData)}));
reducedMotion.addEventListener('change',event=>{if(event.matches){motionStates.forEach(state=>state.paused=true);updateMotionControls();syncMotionPlayback();}});
document.addEventListener('play',event=>{
  if(event.target.tagName!=='VIDEO')return;
  $$('video').forEach(video=>{if(video!==event.target&&!(event.target.dataset.gallery&&video.dataset.gallery))video.pause();});
},true);
const visibilityObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  const video=entry.target;
  if(video.dataset.gallery){visibleMotion.set(video,entry.isIntersecting);syncMotionPlayback();return;}
  if(entry.isIntersecting){loadVideo(video);if(video===hero&&!heroUserPaused&&!$('#media-dialog').open&&!$$('video').some(other=>other!==hero&&!other.paused))hero.play().catch(()=>{});}
  else video.pause();
}),{threshold:.15});
$$('video').forEach(video=>visibilityObserver.observe(video));
document.addEventListener('visibilitychange',()=>{if(document.hidden)$$('video').forEach(video=>video.pause());else syncMotionPlayback();});
applyLanguage();
