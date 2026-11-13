'use strict';

function createTrainingView(root, curves) {
  const find = selector => root.querySelector(selector);
  const all = selector => [...root.querySelectorAll(selector)];
  const chart = find('#training-chart');
  const progress = find('#training-progress');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const format = new Intl.NumberFormat('en-US');
  const experiments = {
    supermimic: {
      robots: ['g1'], gpus: 1, steps: 150000, hours: 9, minutes: 50, checkpoint: '148k',
      timeNote: ['含周期验证', 'Includes validation'],
      environments: ['每卡 4,096 个并行环境', '4,096 environments per GPU'],
      results: [{robot: 'G1', completed: 19486, total: 19514, value: .9311035926874112}]
    },
    morphmimic: {
      robots: ['h2', 'g1'], gpus: 2, steps: 60000, hours: 7, minutes: 15, checkpoint: '60k',
      timeNote: ['不含暂停等待', 'Excludes paused time'],
      environments: ['每卡 2,048 个并行环境', '2,048 environments per GPU'],
      results: [{robot: 'H2', completed: 5351, total: 5366, value: .8967894247738052}, {robot: 'G1', completed: 5356, total: 5366, value: .9180333582097123}]
    }
  };
  let language = 'zh';
  let model = 'supermimic';
  let metric = 'train';
  let detail = 'pelvis';
  let index = 0;
  let playhead = 0;
  let playing = false;
  let reveal = false;
  let frame = 0;
  let geometry;
  let valueNodes = [];
  const t = (zh, en) => language === 'zh' ? zh : en;
  const label = pair => pair[language === 'zh' ? 0 : 1];
  const experiment = () => experiments[model];
  const series = () => curves[model][metric === 'train' ? 'series' : metric === 'prediction' && model === 'morphmimic' ? detail : metric];
  const rows = () => series()[experiment().robots[0]];
  const column = () => metric === 'validation' ? 1 : 2;
  const color = robot => robot === 'g1' ? 'var(--blue)' : '#7898c5';
  const compact = value => (value / 1000).toLocaleString('en-US', {maximumFractionDigits: 2}) + 'k';

  function metricDisplay() {
    if (metric === 'train') return {title: t('归一化回报', 'Normalized return'), decimals: 4, unit: ''};
    if (metric === 'validation') return {title: t('整段归一化回报', 'Full-clip normalized return'), decimals: 4, unit: ''};
    if (metric === 'loss') return {title: t('状态预测损失 · 对数刻度', 'State prediction loss · Log scale'), decimals: 3, unit: '', log: true};
    if (model === 'supermimic') return {title: t('8 步归一化预测误差 · 对数刻度', '8-step normalized prediction error · Log scale'), decimals: 4, unit: '', log: true};
    return detail === 'pelvis'
      ? {title: t('8 步骨盆预测误差 · cm', '8-step pelvis prediction error · cm'), decimals: 2, unit: ' cm'}
      : {title: t('8 步关节预测误差 · °', '8-step joint prediction error · °'), decimals: 2, unit: '°'};
  }

  function nearestIndex(step) {
    const points = rows();let nearest = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i][0] - step) < Math.abs(points[nearest][0] - step)) nearest = i;
    return nearest;
  }

  function svgElement(tag, attributes, parent = chart) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    parent.append(element);
    return element;
  }

  function updatePlayButton() {
    find('#training-play-label').textContent = playing ? t('暂停回放', 'Pause') : t('回放训练', 'Replay');
    find('#training-play use').setAttribute('href', playing ? '#icon-pause' : '#icon-play');
  }

  function stop() {
    playing = false;
    cancelAnimationFrame(frame);
    updatePlayButton();
  }

  function updateReadout() {
    const step = rows()[index][0];
    const position = reveal ? playhead : step;
    const display = metricDisplay();
    progress.value = position;
    progress.setAttribute('aria-valuetext', t('迭代 ', 'Iteration ') + format.format(step));
    find('#training-step-readout').textContent = t('迭代 ', 'Iteration ') + format.format(step);
    find('#training-progress-value').textContent = `${compact(position)} / ${compact(experiment().steps)}`;
    valueNodes.forEach(({robot, node}) => {
      node.textContent = `${robot.toUpperCase()} ${series()[robot][index][column()].toFixed(display.decimals)}${display.unit}`;
    });
    if (!geometry) return;
    const {x, y, left, width, clip, cursor, dots} = geometry;
    const cx = x(position);
    clip.setAttribute('width', reveal ? cx - left + 2 : width + 3);
    cursor.setAttribute('x1', cx);
    cursor.setAttribute('x2', cx);
    dots.forEach(({robot, dot, halo}) => {
      const cy = y(series()[robot][index][column()]);
      // Markers and values remain on recorded observations while the reveal moves continuously.
      [dot, halo].forEach(element => {element.setAttribute('cx', x(step));element.setAttribute('cy', cy);});
    });
  }

  function drawChart() {
    const width = chart.clientWidth;
    const height = chart.clientHeight;
    if (!width || !height) return;
    const left = 40, right = 12, top = 24, bottom = 34;
    const plotWidth = width - left - right;
    const display = metricDisplay();
    let low = 0, high = 1, ticksY = [0, .25, .5, .75, 1];
    if (metric === 'loss' || metric === 'prediction') {
      let min = Infinity, max = -Infinity;
      Object.values(series()).forEach(points => points.forEach(point => {
        min = Math.min(min, point[1], point[2]);max = Math.max(max, point[1], point[2]);
      }));
      if (display.log) {
        const firstPower = Math.floor(Math.log10(min)), lastPower = Math.ceil(Math.log10(max));
        low = 10 ** firstPower;high = 10 ** lastPower;
        ticksY = Array.from({length: lastPower - firstPower + 1}, (_, i) => 10 ** (firstPower + i));
      } else {
        const rough = max / 4, power = 10 ** Math.floor(Math.log10(rough));
        const increment = [1, 2, 2.5, 5, 10].find(value => value * power >= rough) * power;
        high = Math.ceil(max / increment) * increment;
        ticksY = Array.from({length: Math.round(high / increment) + 1}, (_, i) => i * increment);
      }
    }
    const x = step => left + step / experiment().steps * plotWidth;
    const y = value => top + (display.log
      ? (Math.log10(high) - Math.log10(value)) / (Math.log10(high) - Math.log10(low))
      : 1 - value / high) * (height - top - bottom);
    chart.replaceChildren();
    chart.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const title = svgElement('title', {});
    title.textContent = `${model === 'supermimic' ? 'SuperMimic' : 'MorphMimic'} · ${display.title}`;
    const defs = svgElement('defs', {});
    const clipPath = svgElement('clipPath', {id: 'training-curve-clip'}, defs);
    const clip = svgElement('rect', {x: left - 1, y: 0, width: plotWidth + 3, height}, clipPath);
    ticksY.forEach(value => {
      svgElement('line', {x1: left, x2: width - right, y1: y(value), y2: y(value), class: 'training-gridline'});
      svgElement('text', {x: left - 10, y: y(value) + 4, 'text-anchor': 'end'}).textContent = String(Number(value.toPrecision(4)));
    });
    const max = experiment().steps;
    const ticks = width < 500 ? [0, max / 2, max] : [0, max / 3, max * 2 / 3, max];
    ticks.forEach((step, i) => {
      const anchor = i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle';
      svgElement('text', {x: x(step), y: height - 8, 'text-anchor': anchor}).textContent = step ? compact(step) : '0';
    });
    if (model === 'morphmimic' && metric !== 'validation') {
      [10000, 20000].forEach(step => {
        svgElement('line', {x1: x(step), x2: x(step), y1: top, y2: height - bottom, class: 'training-restart'});
        if (width >= 500) svgElement('text', {x: x(step) + 5, y: top - 8}).textContent = t('恢复', 'Resume');
      });
    }
    const lines = svgElement('g', {'clip-path': 'url(#training-curve-clip)'});
    const dots = [];
    experiment().robots.forEach(robot => {
      const points = series()[robot];
      const path = col => points.map((point, i) => `${i ? 'L' : 'M'}${x(point[0]).toFixed(2)},${y(point[col]).toFixed(2)}`).join(' ');
      if (metric !== 'validation') svgElement('path', {d: path(1), class: 'training-raw', stroke: color(robot)}, lines);
      svgElement('path', {d: path(column()), class: 'training-trend', stroke: color(robot), 'stroke-dasharray': robot === 'h2' ? '6 4' : ''}, lines);
      if (metric === 'validation') points.forEach(point => {
        svgElement('circle', {cx: x(point[0]), cy: y(point[1]), r: 3, fill: '#fff', stroke: color(robot), 'stroke-width': 1.5}, lines);
      });
      const halo = svgElement('circle', {r: 8, fill: color(robot), opacity: .12});
      const dot = svgElement('circle', {r: 3.5, fill: color(robot), stroke: '#fff', 'stroke-width': 1.5});
      dots.push({robot, dot, halo});
    });
    const cursor = svgElement('line', {y1: top, y2: height - bottom, class: 'training-cursor'});
    geometry = {x, y, left, width: plotWidth, clip, cursor, dots};
    updateReadout();
  }

  function renderResults() {
    const results = experiment().results;
    const items = results.length === 1
      ? [{title: t('G1 完成率', 'G1 completion'), value: (results[0].completed / results[0].total * 100).toFixed(2), suffix: '%', note: `${format.format(results[0].completed)} / ${format.format(results[0].total)}`},
        {title: t('整段归一化回报', 'Full-clip return'), value: results[0].value.toFixed(4), suffix: '', note: ''}]
      : results.map(result => ({title: `${result.robot} ${t('完成率', 'completion')}`, value: (result.completed / result.total * 100).toFixed(2), suffix: '%', note: `${format.format(result.completed)} / ${format.format(result.total)} · ${t('回报', 'Return')} ${result.value.toFixed(4)}`}));
    find('#training-results').replaceChildren(...items.map(item => {
      const block = document.createElement('div');
      const heading = document.createElement('p');heading.className = 'training-label';heading.textContent = item.title;
      const value = document.createElement('p');value.className = 'training-result-number';value.textContent = item.value;
      const suffix = document.createElement('small');suffix.textContent = item.suffix;value.append(suffix);
      const note = document.createElement('p');note.className = 'training-note';note.textContent = item.note;
      block.append(heading, value, note);
      return block;
    }));
  }

  function render(reset = true) {
    stop();reveal = false;
    if (reset) index = rows().length - 1;
    playhead = rows()[index][0];
    const current = experiment();
    const display = metricDisplay();
    all('[data-training-model]').forEach(button => {
      const active = button.dataset.trainingModel === model;
      button.setAttribute('aria-selected', active);button.tabIndex = active ? 0 : -1;
    });
    find('#training-panel').setAttribute('aria-labelledby', `training-${model}`);
    all('[data-training-metric]').forEach(button => button.setAttribute('aria-pressed', button.dataset.trainingMetric === metric));
    find('#training-hardware').innerHTML = `${current.gpus} <small>${current.gpus === 1 ? 'GPU' : 'GPUs'}</small>`;
    const gpu = find('#training-gpu');gpu.replaceChildren();
    for (let i = 0; i < current.gpus; i++) svgElement('use', {href: '#gpu-board', x: current.gpus === 1 ? 6 : 6 + i * 6, y: current.gpus === 1 ? 28 : 2 + i * 48, width: 168, height: 56}, gpu);
    find('#training-time').innerHTML = `${current.hours}<small>h</small> ${current.minutes}<small>m</small>`;
    find('#training-time-note').textContent = label(current.timeNote);
    find('#training-total').textContent = format.format(current.steps);
    find('#training-environments').textContent = label(current.environments);
    find('#training-checkpoint').textContent = current.checkpoint;
    progress.min = rows()[0][0];
    progress.max = rows()[rows().length - 1][0];
    progress.setAttribute('aria-label', t('选择训练迭代', 'Select training iteration'));
    chart.setAttribute('aria-label', `${display.title} · ${t('随训练迭代变化', 'by training iteration')}`);
    const description = metric !== 'validation'
      ? t(`浅线为原始日志，深线与读数为过去 ${model === 'supermimic' ? 20 : 21} 点均值，恢复边界重置。`, `Faint lines are raw logs; bold lines and readouts use a trailing ${model === 'supermimic' ? 20 : 21}-point mean, reset at restarts.`)
      : t(`每机型 ${rows().length} 个正式评测点；连线仅供阅读。`, `${rows().length} formal evaluation points per robot; lines are visual guides.`);
    find('#training-chart-description').textContent = description;
    find('#training-axis-label').textContent = display.title;
    find('#training-axis-label').title = description + (metric === 'prediction' ? t('世界模型预测误差，不是实际动作跟踪误差。', 'World-model prediction error, not motion tracking error.') : '');
    find('#training-direction').textContent = metric === 'validation'
      ? t(`${rows().length} 个评测点`, `${rows().length} evaluation points`)
      : metric === 'train' ? t('越高越好', 'Higher is better') : t('越低越好', 'Lower is better');
    find('#training-detail-label').hidden = metric !== 'prediction' || model !== 'morphmimic';
    find('#training-detail').value = detail;
    find('[data-training-metric="train"]').title = t('平滑训练回报', 'Smoothed training return');
    find('#training-validation-label').title = metric === 'validation' ? description : '';
    valueNodes = current.robots.map(robot => {
      const node = document.createElement('span');node.className = 'training-series';node.dataset.robot = robot;node.style.setProperty('--series-color', color(robot));
      return {robot, node};
    });
    find('#training-values').replaceChildren(...valueNodes.map(item => item.node));
    renderResults();drawChart();
  }

  function play() {
    if (playing) {stop();return;}
    if (motion.matches) {index = rows().length - 1;reveal = false;updateReadout();return;}
    const points = rows();
    // Resume a paused replay; a completed or explored curve replays from the start.
    if (!reveal || index === points.length - 1) {index = 0;playhead = points[0][0];}
    const first = playhead, last = points[points.length - 1][0];
    const duration = (metric === 'validation' ? 1600 : 4000) * (last - first) / (last - points[0][0]);
    const start = performance.now();
    playing = true;reveal = true;updatePlayButton();
    updateReadout();
    function tick(now) {
      const fraction = Math.min(1, (now - start) / duration);
      playhead = first + fraction * (last - first);
      while (index < points.length - 1 && points[index + 1][0] <= playhead) index++;
      updateReadout();
      if (fraction < 1) frame = requestAnimationFrame(tick);
      else {stop();reveal = false;updateReadout();find('#training-status').textContent = t('回放完成', 'Replay complete');}
    }
    frame = requestAnimationFrame(tick);
  }

  all('[data-training-model]').forEach(button => button.addEventListener('click', () => {model = button.dataset.trainingModel;render();}));
  all('[data-training-metric]').forEach(button => button.addEventListener('click', () => {metric = button.dataset.trainingMetric;render();}));
  find('#training-detail').addEventListener('change', event => {detail = event.target.value;render();});
  find('#training-play').addEventListener('click', play);
  progress.addEventListener('input', () => {stop();reveal = false;index = nearestIndex(Number(progress.value));updateReadout();});
  progress.addEventListener('keydown', event => {
    const actions = {ArrowLeft: index - 1, ArrowDown: index - 1, ArrowRight: index + 1, ArrowUp: index + 1, Home: 0, End: rows().length - 1};
    if (!(event.key in actions)) return;
    event.preventDefault();stop();reveal = false;
    index = Math.max(0, Math.min(rows().length - 1, actions[event.key]));updateReadout();
  });
  chart.addEventListener('pointermove', event => {
    if (playing || event.pointerType === 'touch' || !geometry) return;
    const target = (event.clientX - chart.getBoundingClientRect().left - geometry.left) / geometry.width * experiment().steps;
    index = nearestIndex(target);reveal = false;updateReadout();
  });
  document.addEventListener('visibilitychange', () => {if (document.hidden) stop();});
  motion.addEventListener('change', () => {if (motion.matches) {stop();reveal = false;updateReadout();}});
  new ResizeObserver(drawChart).observe(chart);
  render();
  return {setLanguage(next) {language = next;render(false);}};
}
