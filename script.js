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
const text = value => typeof value === 'string' ? value : value[language];

const modes = {
  three: {
    title: {zh:'三个追踪点，<br>一个完整的身体。', en:'Three tracked points.<br>One coordinated body.'},
    description: {zh:'通过头部与双手传递上身意图，配合导航输入控制移动。支持手柄和手部追踪两种交互方式，无需脚踝追踪器。', en:'Head and hand inputs communicate upper-body intent, while navigation input drives locomotion. Use controllers or hand tracking, without ankle trackers.'},
    input: {zh:'头显 + 手柄 / 手部追踪', en:'Headset + controllers / hand tracking'},
    effect: {zh:'上身动作与移动协调控制', en:'Coordinated upper-body motion and locomotion'},
    video:'dual-mode-real.mp4', poster:'dual-mode-real.jpg'
  },
  full: {
    title:{zh:'从抬手到迈步，<br>全身一起行动。',en:'From a raised hand<br>to the next step.'},
    description:{zh:'在头显与双手控制器之外加入脚踝追踪器，将全身姿态传递给机器人，展示平衡、伸手和踢腿等动作。',en:'Add ankle trackers to the headset and controllers. Whole-body pose drives coordinated balance, reaching and leg motion.'},
    input:{zh:'头显 + 双手控制器 + 脚踝追踪器',en:'Headset + controllers + ankle trackers'},
    effect:{zh:'完整姿态跟踪与全身协调',en:'Full-pose tracking and whole-body coordination'},
    video:'wholebody-balance.mp4',poster:'balance-poster.jpg'
  }
};

const methods = {
  sonic:{
    category:{zh:'自然遥操 / 统一全身控制',en:'TELEOPERATION / UNIFIED WHOLE-BODY CONTROL'},
    title:{zh:'多种输入，一套控制基础。',en:'Multiple inputs. A shared control foundation.'},
    description:{zh:'SONIC 将不同形式的运动指令映射到统一的运动 token 空间，再由共享控制解码器输出全身动作。三点输入借助运动学规划器补全运动目标，全身输入则传递更完整的人体姿态。',en:'SONIC maps different motion commands into a shared motion-token space. A common control decoder produces whole-body actions. A kinematic planner complements three-point input; full-body input carries a richer human pose.'},
    steps:{zh:['三点 / 全身输入','运动目标与编码','统一运动 token','全身控制策略'],en:['3-point / full-body input','Motion targets & encoding','Shared motion tokens','Whole-body policy']},
    image:'sonic-overview.png',
    caption:{zh:'SONIC 方法概览 · Luo et al. · 论文作者项目页原图。',en:'SONIC method overview · Luo et al. · Original figure from the authors’ project page.'},
    note:{zh:'本页三点与全身遥操演示以 SONIC 为控制基础。手部交互、输入设备与展示系统是不同层次的集成，不能仅由框架图推断其全部实现。',en:'The three-point and full-body demonstrations use SONIC as their control foundation. Hand interaction, input devices and the demonstration system involve additional integration beyond this overview.'},
    paper:'https://arxiv.org/abs/2511.07820',project:'https://nvlabs.github.io/GEAR-SONIC/',source:'https://nvlabs.github.io/GEAR-SONIC/static/images/overview.png'
  },
  any2any:{
    category:{zh:'跨本体迁移 / 策略适配',en:'CROSS-EMBODIMENT / POLICY ADAPTATION'},
    title:{zh:'保留已有能力，适配新的身体。',en:'Keep the learned capability. Adapt the body.'},
    description:{zh:'Any2Any 先对齐观测、关节语义、几何与动作空间，再冻结已有策略主干，在动力学敏感模块中训练低秩适配器（LoRA），将全身跟踪能力迁移到目标机器人。',en:'Any2Any aligns observations, joint semantics, geometry and action spaces. It then freezes the pretrained backbone and trains low-rank adapters in dynamics-sensitive modules to transfer whole-body tracking.'},
    steps:{zh:['已有跟踪策略','运动学与接口对齐','冻结主干 + LoRA','目标机器人'],en:['Pretrained tracking policy','Kinematic alignment','Frozen backbone + LoRA','Target embodiment']},
    image:'any2any-architecture.png',
    caption:{zh:'Any2Any 架构图 · 原论文 Figure 2 · 来自作者项目页。',en:'Any2Any architecture · Original Figure 2 · From the authors’ project page.'},
    note:{zh:'论文中约 1% 的数据与算力开销是特定迁移实验相对完整预训练的结果，不代表任意本体的通用成本保证。本页提供方法解读，H2、X2 视频不作为 Any2Any 迁移验证。',en:'The paper’s approximately 1% data and compute figure concerns specific transfer experiments relative to full pretraining. It is not a universal cost guarantee. The H2 and X2 videos are not Any2Any validation results.'},
    paper:'https://arxiv.org/abs/2605.23733',project:'https://any2any.top/',source:'https://any2any.top/assets/figures/figure2-architecture.png?v=method-crop-20260617'
  },
  morphmimic:{
    category:{zh:'跨本体 + 高效学习 / 共享模型',en:'CROSS-EMBODIMENT + EFFICIENT LEARNING / SHARED MODEL'},
    title:{zh:'一套权重，学习多种身体。',en:'One set of weights. Multiple bodies.'},
    description:{zh:'MorphMimic 将不同机器人的关节与身体布局放入统一表示，以形态描述为条件，共享世界模型、运动编码器与控制解码器，并对齐跨本体的动作潜变量。',en:'MorphMimic unifies joint and body layouts, conditions on morphology, and shares a world model, motion encoder and control decoder. A common latent motion representation connects the embodiments.'},
    steps:{zh:['统一身体表示','输入形态描述','共享世界模型与策略','跨本体动作控制'],en:['Unified body layout','Morphology conditioning','Shared world model & policy','Cross-body control']},
    image:'morphmimic-framework.png',
    caption:{zh:'MorphMimic 总体框架 · Yang et al., 2026 · 原论文 Figure 2。',en:'MorphMimic framework · Yang et al., 2026 · Original paper Figure 2.'},
    note:{zh:'原论文验证 G1、X2 Ultra 与 T2，真机验证为 G1。统一模型训练耗时 16.3 GPU-hours；其价值是一套权重覆盖多个本体，不能表述为比三个单独专家训练更省算力。',en:'The paper evaluates G1, X2 Ultra and T2, with real-world deployment on G1. Unified training takes 16.3 GPU-hours. The contribution is shared weights across bodies, not a lower training cost than three separate experts.'},
    paper:'https://lzyang2000.github.io/morphmimic/static/morphmimic.pdf',project:'https://lzyang2000.github.io/morphmimic/',source:'https://lzyang2000.github.io/morphmimic/static/images/fig2.png'
  },
  supermimic:{
    category:{zh:'高效动作学习 / 可微世界模型',en:'EFFICIENT MOTION LEARNING / DIFFERENTIABLE WORLD MODEL'},
    title:{zh:'在模型中想象，在循环中学习。',en:'Imagine in the model. Improve in a loop.'},
    description:{zh:'SuperMimic 在常规仿真器中采样，用回放数据拟合可微世界模型，再通过短程想象轨迹的反向传播更新策略。世界模型与策略交替迭代，梯度不经过仿真器。',en:'SuperMimic collects transitions in a conventional simulator, fits a differentiable world model to replay data, and improves the policy through short imagined rollouts. The model and policy alternate updates; gradients do not pass through the simulator.'},
    steps:{zh:['仿真器采样','更新回放数据','拟合世界模型','想象轨迹优化策略'],en:['Collect in simulation','Update replay data','Fit the world model','Optimize imagined rollouts']},
    image:'supermimic-training-loop.png',
    caption:{zh:'SuperMimic 训练循环 · Liao et al., 2026 · 原论文第 4 页 Figure 2，截取图形区域。',en:'SuperMimic training loop · Liao et al., 2026 · Figure 2, page 4 of the paper; figure region cropped.'},
    note:{zh:'1 张 H100、3 小时为作者报告的训练结果。其动作覆盖基准包含训练动作；2 张 H100、9.8 小时的“零失败”不等于未知任务泛化成功率。本文未提供 ONE-G 的 SuperMimic 实测视频或训练日志。',en:'One H100 for three hours is an author-reported training result. The coverage benchmark includes training motions; “zero failures” after 9.8 hours on two H100s is not a generalization rate on unseen tasks. No ONE-G SuperMimic measurements or demonstration are presented here.'},
    paper:'https://arxiv.org/abs/2610.28480',project:'https://supermimic.github.io/',source:'https://arxiv.org/pdf/2610.28480#page=4'
  }
};

const demos = [
  {video:'wholebody-kick.mp4',poster:'kick-poster.jpg',kind:'real',title:{zh:'动态踢腿',en:'Dynamic kick'},detail:{zh:'G1 · 全身遥操 · 12 秒',en:'G1 · Whole-body control · 12 s'}},
  {video:'wholebody-pick.mp4',poster:'pick-poster.jpg',kind:'real',title:{zh:'伸手与拾取',en:'Reach & pick'},detail:{zh:'G1 · 全身遥操 · 19 秒',en:'G1 · Whole-body control · 19 s'}},
  {video:'camera-teleop.mp4',poster:'camera-poster.jpg',kind:'real',title:{zh:'单目视觉遥操',en:'Single-camera control'},detail:{zh:'G1 · 无穿戴输入 · 26 秒',en:'G1 · No wearables · 26 s'}},
  {video:'headset-hand-interaction.mp4',poster:'headset-hand-interaction-poster.jpg',kind:'simulation',title:{zh:'手部追踪与手柄交互',en:'Hand tracking & controllers'},detail:{zh:'第一人称 · 双模式交互 · 97 秒',en:'First person · Dual-mode interaction · 97 s'}},
  {video:'dance-video-motion.mp4',poster:'dance-video-motion-poster.jpg',kind:'real',portrait:true,title:{zh:'视频动作复现',en:'Motion from video'},detail:{zh:'G1 · 舞蹈动作复现 · 16 秒',en:'G1 · Dance motion recreation · 16 s'}},
  {video:'music-motion.mp4',poster:'music-motion-poster.jpg',kind:'simulation',title:{zh:'音乐驱动动作',en:'Motion from music'},detail:{zh:'G1 · 音乐输入 · 48 秒',en:'G1 · Music input · 48 s'}},
  {video:'headset-only-teleop.mp4',poster:'headset-only-poster.jpg',kind:'simulation',title:{zh:'头显手势与灵巧手',en:'Headset gestures & dexterous hands'},detail:{zh:'夹爪 / 灵巧手 · 64 秒',en:'Grippers / dexterous hands · 64 s'}},
  {video:'wholebody-balance.mp4',poster:'balance-poster.jpg',kind:'real',title:{zh:'单脚平衡',en:'Single-leg balance'},detail:{zh:'G1 · 姿态跟踪 · 15 秒',en:'G1 · Pose tracking · 15 s'}},
  {video:'dual-mode-real.mp4',poster:'dual-mode-real.jpg',kind:'real',portrait:true,title:{zh:'三点遥操',en:'Three-point control'},detail:{zh:'G1 · 手柄 / 手部追踪 · 140 秒',en:'G1 · Controllers / hand tracking · 140 s'}}
];

function loadVideo(video) {
  if (video.dataset.src) {video.src = video.dataset.src; delete video.dataset.src; video.load();}
}
function setMode(next, changeMedia = true) {
  mode = next;
  const data = modes[mode];
  $$('#teleoperation [role=tab]').forEach(button => {const selected = button.dataset.mode === mode; button.setAttribute('aria-selected', selected);button.tabIndex = selected ? 0 : -1;});
  $('#teleop-panel').setAttribute('aria-labelledby', `mode-${mode}`);
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
  $('#tech-note').textContent = text(data.note);
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
  document.title=language==='zh'?'ONE-G · 人形能力，正在发生':'ONE-G · Humanoid capabilities in motion';
  $('#language-toggle').innerHTML=language==='zh'?'EN <span aria-hidden="true">↗</span>':'中文 <span aria-hidden="true">↗</span>';
  $('#language-toggle').setAttribute('aria-label',language==='zh'?'Switch to English':'切换为中文');
  $('#hero-video').setAttribute('aria-label',language==='zh'?'ONE-G G1 全身遥操真机演示':'ONE-G G1 whole-body teleoperation on a real robot');
  setMode(mode,false);setMethod(method);renderDemos();updateHeroButton();
}

$('#language-toggle').addEventListener('click',()=>{language=language==='zh'?'en':'zh';try{localStorage.setItem('one-g-language',language);}catch{}applyLanguage();});
$$('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
$$('[data-tech]').forEach(button=>button.addEventListener('click',()=>setMethod(button.dataset.tech)));
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
$('#media-dialog').addEventListener('close',()=>{$$('video',$('#dialog-content')).forEach(video=>{video.pause();video.removeAttribute('src');video.load();});$('#dialog-content').replaceChildren();lastDialogTrigger?.focus();});

const hero=$('#hero-video');
let heroUserPaused=false;
function updateHeroButton(){const paused=hero.paused;$('#hero-pause').firstElementChild.textContent=paused?'▶':'Ⅱ';$('#hero-pause').setAttribute('aria-label',language==='zh'?(paused?'播放首屏视频':'暂停首屏视频'):(paused?'Play hero video':'Pause hero video'));}
$('#hero-pause').addEventListener('click',()=>{if(hero.paused){heroUserPaused=false;hero.play().catch(()=>{});}else{heroUserPaused=true;hero.pause();}});
hero.addEventListener('play',updateHeroButton);hero.addEventListener('pause',updateHeroButton);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
if(reducedMotion.matches || navigator.connection?.saveData){hero.autoplay=false;hero.pause();heroUserPaused=true;}
document.addEventListener('play',event=>{if(event.target.tagName==='VIDEO')$$('video').forEach(video=>{if(video!==event.target)video.pause();});},true);
const visibilityObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  const video=entry.target;
  if(entry.isIntersecting){loadVideo(video);if(video===hero&&!heroUserPaused&&!$('#media-dialog').open&&!$$('video').some(other=>other!==hero&&!other.paused))hero.play().catch(()=>{});}
  else video.pause();
}),{threshold:.15});
$$('video').forEach(video=>visibilityObserver.observe(video));
document.addEventListener('visibilitychange',()=>{if(document.hidden)$$('video').forEach(video=>video.pause());});
applyLanguage();
