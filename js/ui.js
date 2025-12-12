// js/ui.js

const UI = {
    init: function() {
        this.renderIntro();
        // 绑定底部功能按钮
        document.getElementById('btn-shop').addEventListener('click', () => this.showShopModal());
        document.getElementById('btn-project').addEventListener('click', () => this.showProjectModal());
        document.getElementById('btn-goal').addEventListener('click', () => this.showGoalModal());
        document.getElementById('modal-close').addEventListener('click', () => this.closeModal());
    },

    renderIntro: function() {
        // 静态内容已在HTML中，此处预留
    },

    showSetup: function() {
        document.getElementById('screen-intro').classList.add('hidden');
        document.getElementById('screen-setup').classList.remove('hidden');
        // 选项填充已在 window.onload 中处理
    },

    // === 核心修正部分 ===
    startGame: function() {
        const diff = document.getElementById('select-difficulty').value;
        const pers = document.getElementById('select-personality').value;

        // 初始化游戏逻辑
        GameState.init(diff, pers);

        // 切换界面
        document.getElementById('screen-setup').classList.add('hidden');
        document.getElementById('screen-game').classList.remove('hidden');

        // 确保UI同步
        this.updateAll();
    },

    // === 主更新入口 ===
    updateAll: function() {
        this.renderSidebar();
        this.renderMainArea(); // 渲染左半边卡片
        this.renderRightPanel(); // 渲染右半边日志与目标
        this.renderProjectBar(); // 底部项目条
    },

    // 左侧栏：更加紧凑
    renderSidebar: function() {
        const renderAttr = (attr) => {
            const val = GameState.getStat(attr.key);
            let valText = typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val;
            let barHtml = '';

            if (attr.max) {
                const percent = GameState.getStatPercent(attr.key);
                let color = 'var(--primary-color)';
                if (attr.critical && val <= attr.critical) color = 'var(--danger-color)';
                barHtml = `<div class="mini-progress"><div style="width:${percent}%; background:${color}"></div></div>`;
                valText = `${valText}/${attr.max}`;
            }

            return `
                <div class="attr-row">
                    <span class="attr-icon">${attr.icon}</span>
                    <span class="attr-name">${attr.name}</span>
                    <span class="attr-val">${valText}</span>
                </div>
                ${barHtml}
            `;
        };

        const basicHtml = GameData.attributes.filter(a=>a.category==='basic').map(renderAttr).join('');
        document.getElementById('basic-stats-list').innerHTML = basicHtml;

        // 学业部分手动加学分
        let academicHtml = `
            <div class="attr-row">
                <span class="attr-icon">🎓</span><span class="attr-name">已修学分</span>
                <span class="attr-val" style="color:var(--primary-color)">${GameState.player.academics.totalCredits}</span>
            </div>`;
        academicHtml += GameData.attributes.filter(a=>a.category==='academic').map(renderAttr).join('');
        document.getElementById('academic-stats-list').innerHTML = academicHtml;

        // 更新顶部日期
        const t = GameState.player.time;
        // 防止 t.phaseIdx 为 -1 导致的错误
        const phaseName = GameData.timeStructure.subPhases[Math.max(0, t.phaseIdx) % 8];
        document.getElementById('game-date').innerText = `第${t.year}年 | ${phaseName}`;
    },

    // 右侧栏：日志 + 目标追踪
    renderRightPanel: function() {
        // 1. 目标追踪
        const goalId = GameState.player.currentGoal;
        const goal = GameData.goals[goalId];
        let reqHtml = '';

        for (let k in goal.req) {
            const current = GameState.player.stats[k];
            const needed = goal.req[k];
            const isMet = current >= needed;
            reqHtml += `<div class="${isMet?'met':'unmet'}">${GameData.attributes.find(a=>a.key===k).name}: ${current.toFixed(1)} / ${needed}</div>`;
        }
        // 排名需求
        if (goal.rankReq) {
            const currentRank = GameState.player.rank; // 1-100
            const neededRank = goal.rankReq * 100; // 15
            const isMet = currentRank <= neededRank;
            reqHtml += `<div class="${isMet?'met':'unmet'}">排名: Top ${currentRank}% / ${neededRank}%</div>`;
        }

        document.getElementById('goal-tracker').innerHTML = `
            <h4>🎯 目标：${goal.name} <button class="btn-xs" onclick="UI.showGoalModal()">更换</button></h4>
            <div class="req-grid">${reqHtml}</div>
        `;

        // 2. 日志
        const logBox = document.getElementById('log-box');
        logBox.innerHTML = GameState.player.logs.map(l => `<div class="log-line"><span>${l.time}</span> ${l.msg}</div>`).join('');
    },

    // 中间：卡片区
    renderMainArea: function() {
        const container = document.getElementById('card-area');
        container.innerHTML = '';
        const tasks = GameState.turnData.pendingTasks;

        // 下一阶段按钮状态
        const btnNext = document.getElementById('btn-next-phase');
        if (tasks.length === 0) {
            btnNext.disabled = false;
            btnNext.classList.add('pulse');
            container.innerHTML = `<div class="empty-tip" style="text-align:center; color:#999; margin-top:50px;">
                <h3>✅ 本阶段事务已处理完毕</h3>
                <p>休息一下，逛逛超市或进入下一阶段吧。</p>
            </div>`;
        } else {
            btnNext.disabled = true;
            btnNext.classList.remove('pulse');
        }

        // 渲染卡片
        if (tasks.includes('energy_allocation')) {
            this.renderEnergyCard(container);
            return;
        }
        if (tasks.includes('random_event')) {
            this.renderEventCard(container);
            return;
        }
        if (tasks.includes('course_selection')) {
            this.renderCourseCard(container);
            return;
        }
        if (tasks.includes('final_exam')) {
             container.innerHTML = `<div class="card"><h3>📝 期末考试</h3><p>检验成果的时候到了！</p><button class="btn-primary" onclick="GameState.calculateSemesterGPA()">开始考试</button></div>`;
             return;
        }
    },

    // 渲染精力卡片
    renderEnergyCard: function(container) {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <h3>⚡ 本月精力分配 <span id="energy-total" style="float:right; font-size:0.8em">0%</span></h3>
            <div id="slider-group"></div>
            <div id="energy-warning" class="hidden warning-text">⚠️ 超过100%将扣除大量健康值！</div>
            <button class="btn-primary" style="width:100%; margin-top:20px;" onclick="UI.submitEnergy()">执行计划</button>
        `;
        container.appendChild(div);

        const sliders = [
            {id:'study', name:'学习', val:40}, {id:'rest', name:'休息', val:30},
            {id:'intern', name:'实习', val:10}, {id:'social', name:'社交', val:20}
        ];

        const group = div.querySelector('#slider-group');
        sliders.forEach(s => {
            group.innerHTML += `
                <div class="slider-row">
                    <label>${s.name}</label>
                    <input type="range" id="inp-${s.id}" value="${s.val}" max="100" oninput="UI.updateEnergySum()">
                    <span id="val-${s.id}">${s.val}</span>
                </div>`;
        });
        setTimeout(() => this.updateEnergySum(), 0);
    },

    updateEnergySum: function() {
        let sum = 0;
        ['study','rest','intern','social'].forEach(k => {
            const v = parseInt(document.getElementById(`inp-${k}`).value);
            sum += v;
            document.getElementById(`val-${k}`).innerText = v;
        });
        const totalEl = document.getElementById('energy-total');
        const max = GameState.player.flags.energyMax;
        const pct = Math.round((sum / max) * 100);
        totalEl.innerText = `${pct}%`;

        const warn = document.getElementById('energy-warning');
        if (sum > max) {
            totalEl.style.color = 'red';
            warn.classList.remove('hidden');
            warn.innerText = `⚠️ 精力透支 ${(sum-max)}点 (约${(sum-max)/10}身健)`;
        } else {
            totalEl.style.color = 'green';
            warn.classList.add('hidden');
        }
    },

    submitEnergy: function() {
        const getVal = k => parseInt(document.getElementById(`inp-${k}`).value);
        GameState.confirmEnergy({ study: getVal('study'), rest: getVal('rest'), intern: getVal('intern'), social: getVal('social') });
    },

    // 渲染项目进度条
    renderProjectBar: function() {
        const bar = document.getElementById('active-project-bar');
        const p = GameState.player.activeProject;
        if (!p) {
            bar.innerHTML = '<span style="color:#999; font-size:12px">暂无进行中的短期项目</span>';
            return;
        }
        const projName = GameData.projects.find(x=>x.id===p.id).name;
        const pct = (p.progress / p.total) * 100;
        bar.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;">
                <strong>进行中: ${projName}</strong>
                <span>${p.progress}/${p.total}</span>
            </div>
            <div class="mini-progress"><div style="width:${pct}%"></div></div>
        `;
    },

    // 渲染商店/项目/目标 模态框
    showShopModal: function() {
        this.openModal("校园超市", GameData.shopItems.map(item => {
            const bought = GameState.player.flags.boughtItems.includes(item.id);
            const canBuy = GameState.player.stats.money >= item.cost && !(item.type==='permanent' && bought);
            return `
                <div class="list-item ${bought?'disabled':''}">
                    <div class="item-info">
                        <strong>${item.name}</strong> <span class="tag">${item.type==='permanent'?'永久':'消耗'}</span>
                        <p>${item.desc}</p>
                    </div>
                    <button class="btn-sm" ${canBuy?'':'disabled'} onclick="GameState.buyItem('${item.id}')">
                        💰${item.cost} ${bought?'已购':''}
                    </button>
                </div>
            `;
        }).join(''));
    },

    showProjectModal: function() {
        if (GameState.player.activeProject) { alert("你已经有正在进行的项目了！"); return; }
        this.openModal("选择短期项目", GameData.projects.map(p => `
            <div class="list-item">
                <div class="item-info">
                    <strong>${p.name}</strong> (持续${p.duration}阶段)
                    <p>${p.desc}</p>
                    <small style="color:#666">消耗: ${JSON.stringify(p.costPerTurn).replace(/"/g,'').replace(/{|}/g,'')}</small>
                </div>
                <button class="btn-sm" onclick="GameState.startProject('${p.id}'); UI.closeModal()">开始</button>
            </div>
        `).join(''));
    },

    showGoalModal: function() {
        this.openModal("设定毕业目标", Object.values(GameData.goals).map(g => `
            <div class="list-item ${GameState.player.currentGoal===g.id ? 'active-goal' : ''}">
                <div class="item-info">
                    <strong>${g.name}</strong>
                    <p>${g.desc}</p>
                </div>
                <button class="btn-sm" onclick="GameState.player.currentGoal='${g.id}'; UI.updateAll(); UI.closeModal()">选择</button>
            </div>
        `).join(''));
    },

    // 通用模态框
    openModal: function(title, contentHtml) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = contentHtml;
        document.getElementById('modal-overlay').classList.remove('hidden');
    },
    closeModal: function() {
        document.getElementById('modal-overlay').classList.add('hidden');
    },

    // 选课卡片
    renderCourseCard: function(container) {
        const base = GameState.player.difficulty.baseCredit;
        container.innerHTML = `
            <div class="card">
                <h3>📚 学期选课</h3>
                <div class="slider-row">
                   <label>学分</label>
                   <input type="range" min="10" max="40" value="${base}" oninput="this.nextElementSibling.innerText=this.value" id="c-inp">
                   <span>${base}</span>
                </div>
                <button class="btn-primary" onclick="GameState.confirmCourseSelection(document.getElementById('c-inp').value)">确认选课</button>
            </div>
        `;
    },
    // 事件卡片
    renderEventCard: function(container) {
        const evt = GameData.events[Math.floor(Math.random()*GameData.events.length)];
        let opts = evt.options.map(o =>
            `<button class="btn-option" onclick='GameState.resolveEvent(${JSON.stringify(o.effect)})'>${o.text}</button>`
        ).join('');
        container.innerHTML = `<div class="card"><h3>💡 突发事件</h3><p>${evt.text}</p><div class="option-group">${opts}</div></div>`;
    },

    // 飘字特效
    showFloatingEffects: function(changes) {
        const area = document.getElementById('card-area');
        let delay = 0;
        for (let k in changes) {
            if (Math.abs(changes[k]) < 0.1) continue;
            const el = document.createElement('div');
            const val = changes[k] > 0 ? `+${changes[k].toFixed(1)}` : changes[k].toFixed(1);
            const attrObj = GameData.attributes.find(a=>a.key===k);
            const name = attrObj ? attrObj.name : k; // 防止未找到
            const color = changes[k] > 0 ? 'var(--success-color)' : 'var(--danger-color)';

            el.className = 'float-text';
            el.innerText = `${name} ${val}`;
            el.style.color = color;
            el.style.animationDelay = `${delay}s`;

            area.appendChild(el);
            setTimeout(() => el.remove(), 2000);
            delay += 0.2;
        }
    }
};