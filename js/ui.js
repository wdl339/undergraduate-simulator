// js/ui.js

const UI = {
    init: function() {
        // ...
        this.renderIntro();
        document.getElementById('btn-shop').addEventListener('click', () => this.showShopModal());
        document.getElementById('btn-project').addEventListener('click', () => this.showProjectModal());
        document.getElementById('btn-goal').addEventListener('click', () => this.showGoalModal());
        document.getElementById('btn-modal-close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal-overlay').addEventListener('click', (e) => { if(e.target.id==='modal-overlay') this.closeModal(); });

        // 绑定结果弹窗关闭
        document.getElementById('btn-result-close').addEventListener('click', () => {
             document.getElementById('result-overlay').classList.remove('active');
        });
    },

    renderIntro: function() { /* ... */ },
    showSetup: function() {
        document.getElementById('screen-intro').classList.add('hidden');
        document.getElementById('screen-setup').classList.remove('hidden');
    },

    startGame: function() {
        const diff = document.getElementById('select-difficulty').value;
        const pers = document.getElementById('select-personality').value;
        GameState.init(diff, pers);

        document.getElementById('screen-setup').classList.add('hidden');
        document.getElementById('screen-game').classList.remove('hidden');
        this.updateAll();
    },

    updateAll: function() {
        this.renderSidebar();
        this.renderMainArea();
        this.renderRightPanel();
        this.renderProjectBar();
    },

     renderSidebar: function() {
        // 1. 修复 Bug：更新文字显示
        document.getElementById('display-difficulty').innerText = GameState.player.difficulty.name;
        document.getElementById('display-personality').innerText = GameState.player.personality.name;

        // 渲染函数
        const renderRow = (attr) => {
            const val = GameState.getStat(attr.key);
            let valText = typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val;
            let barHtml = '';

            // GPA 特殊处理：显示预测
            if (attr.key === 'gpa') {
                // 如果当前正在分配精力，显示预测值
                const pendingStudy = this._tempStudyInput || 0; // 从临时变量获取
                if (document.getElementById('inp-study')) {
                     const pred = GameState.getGPAPrediction(pendingStudy);
                     valText += ` <span style="font-size:10px; color:#64748b">(预期 ${pred.min.toFixed(1)}-${pred.max.toFixed(1)})</span>`;
                }
            }

            if (attr.max) {
                const percent = GameState.getStatPercent(attr.key);
                let color = 'var(--primary)';
                if (attr.critical && val <= attr.critical) color = 'var(--danger)';
                barHtml = `<div class="progress-bg"><div class="progress-fill" style="width: ${percent}%; background-color: ${color}"></div></div>`;
                valText = `${valText} / ${attr.max}`;
            }

            return `
                <div class="attr-item">
                    <div class="attr-top">
                        <div class="attr-info">
                            <span class="attr-icon">${attr.icon}</span>
                            <span>${attr.name}</span>
                            <button class="btn-help" onclick="UI.showAttrDetail('${attr.key}')">?</button>
                        </div>
                        <span class="attr-val">${valText}</span>
                    </div>
                    ${barHtml}
                </div>`;
        };

        const basicHtml = GameData.attributes.filter(a => a.category === 'basic').map(renderRow).join('');
        document.getElementById('basic-stats-list').innerHTML = basicHtml;

        // 学业部分：总学分进度条
        const creds = GameState.player.stats.credits; // 当前
        const reqCreds = GameState.player.difficulty.reqCredits;
        const credPercent = Math.min(100, (creds / reqCreds) * 100);

        let academicHtml = `
            <div class="attr-item">
                <div class="attr-top">
                    <div class="attr-info"><span class="attr-icon">🎓</span><span>毕业学分</span></div>
                    <span class="attr-val" style="color:var(--primary)">${creds} / ${reqCreds}</span>
                </div>
                <div class="progress-bg"><div class="progress-fill" style="width: ${credPercent}%; background-color: var(--primary)"></div></div>
            </div>
        `;
        academicHtml += GameData.attributes.filter(a => a.category === 'academic' && a.key !== 'credits' && a.key !== 'gpa').map(renderRow).join('');
        // GPA 单独放最前面或者最后面
        const gpaAttr = GameData.attributes.find(a => a.key === 'gpa');
        academicHtml = renderRow(gpaAttr) + academicHtml;

        document.getElementById('academic-stats-list').innerHTML = academicHtml;

        // 日期
        const t = GameState.player.time;
        const phaseName = GameData.timeStructure.subPhases[Math.max(0, t.phaseIdx) % 8].name;
        document.getElementById('game-date').innerText = `第${t.year}年 | ${phaseName}`;
    },


    // 显示属性详情
    showAttrDetail: function(key) {
        const attr = GameData.attributes.find(a => a.key === key);
        this.openModal(attr.name, `<p style="line-height:1.6; color:#64748b">${attr.desc}</p>`);
    },

    // === 2. 智能弹窗系统 (无 Alert) ===

    // 显示项目 (带条件检查)
    showProjectModal: function() {
        if (GameState.player.activeProject) {
            this.openModal("提示", "<p>你当前已有正在进行的项目，请先完成后再开启新的。</p>");
            return;
        }

        const html = GameData.projects.map(p => {
            // 检查条件
            let reqHtml = '';
            let canStart = true;
            for (let k in p.req) {
                const myVal = GameState.player.stats[k];
                const needVal = p.req[k];
                const met = myVal >= needVal;
                if (!met) canStart = false;
                const attrName = GameData.attributes.find(a=>a.key===k).name;
                // 红色代表未满足，绿色代表满足
                reqHtml += `<span class="req-tag ${met?'green':'red'}">${attrName}: ${myVal.toFixed(0)}/${needVal}</span>`;
            }

            // 消耗描述
            const costDesc = Object.keys(p.costPerTurn).map(k => {
                const attrName = GameData.attributes.find(a=>a.key===k).name;
                return `${attrName}-${p.costPerTurn[k]}`;
            }).join(', ');

            return `
                <div class="list-item">
                    <div class="list-item-left">
                        <strong>${p.name} <span style="font-size:12px; font-weight:normal; color:#999">持续${p.duration}阶段</span></strong>
                        <div style="margin:5px 0">${reqHtml}</div>
                        <p>每回合消耗: ${costDesc}</p>
                        <p style="margin-top:4px; color:#64748b">${p.desc}</p>
                    </div>
                    <button class="btn-primary" style="padding:6px 12px; font-size:12px;"
                        ${canStart ? '' : 'disabled'}
                        onclick="GameState.startProject('${p.id}'); UI.closeModal()">
                        ${canStart ? '开始' : '条件不足'}
                    </button>
                </div>
            `;
        }).join('');

        this.openModal("选择短期项目", html);
    },

    // 显示商店 (带余额检查)
    showShopModal: function() {
        const money = GameState.player.stats.money;
        const html = GameData.shopItems.map(item => {
            const bought = GameState.player.flags.boughtItems.includes(item.id);
            const isPerm = item.type === 'permanent';
            const canAfford = money >= item.cost;
            const canBuy = canAfford && !(isPerm && bought);

            let btnText = `💰 ${item.cost}`;
            if (isPerm && bought) btnText = "已拥有";
            else if (!canAfford) btnText = "余额不足";

            return `
                <div class="list-item">
                    <div class="list-item-left">
                        <strong>${item.name} <span style="font-size:10px; background:#f1f5f9; padding:2px 5px; border-radius:4px">${isPerm?'永久':'消耗'}</span></strong>
                        <p>${item.desc}</p>
                    </div>
                    <button class="btn-primary" style="padding:6px 12px; font-size:12px;"
                        ${canBuy ? '' : 'disabled'}
                        onclick="GameState.buyItem('${item.id}'); UI.showShopModal()"> <!-- 购买后刷新界面以更新按钮状态 -->
                        ${btnText}
                    </button>
                </div>
            `;
        }).join('');
        this.openModal(`校园超市 (余额: ${money.toFixed(0)})`, html);
    },

    // 目标选择
    showGoalModal: function() {
        const html = Object.values(GameData.goals).map(g => {
            const active = GameState.player.currentGoal === g.id;
            return `
                <div class="list-item" style="${active ? 'border-color:var(--primary); background:#eef2ff' : ''}">
                    <div class="list-item-left">
                        <strong>${g.name} ${active ? '✅' : ''}</strong>
                        <p>${g.desc}</p>
                    </div>
                    <button class="btn-outline" style="font-size:12px"
                        onclick="GameState.player.currentGoal='${g.id}'; UI.updateAll(); UI.closeModal()">
                        选择
                    </button>
                </div>
            `;
        }).join('');
        this.openModal("设定毕业目标", html);
    },

    // === 3. 结局界面 ===
    showEndingScreen: function(title, desc, isGood) {
        const el = document.getElementById('screen-ending');
        el.innerHTML = `
            <div class="ending-badge">${isGood ? 'Good Ending' : 'Game Over'}</div>
            <h1 class="ending-title">${title}</h1>
            <p class="ending-desc">${desc}</p>
            <div style="margin-bottom:30px">
                <p>最终 GPA: ${GameState.player.stats.gpa}</p>
                <p>最终 排名: Top ${GameState.player.rank}%</p>
            </div>
            <button class="btn-primary" style="font-size:18px; padding:15px 40px;" onclick="location.reload()">重新开始</button>
        `;
        el.classList.remove('hidden');
    },

    // 通用模态框控制
    openModal: function(title, content) {
        document.getElementById('modal-title').innerText = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').classList.add('active');
    },
    closeModal: function() {
        document.getElementById('modal-overlay').classList.remove('active');
    },

    // === 其余渲染函数 (Course, Event, Logs) 保持逻辑一致，但应用新样式 ===
    renderRightPanel: function() {
        // ... (逻辑同前，渲染 logs 和 goal-tracker)
        const goalId = GameState.player.currentGoal;
        const goal = GameData.goals[goalId];
        let reqHtml = '';
        for (let k in goal.req) {
            const cur = GameState.player.stats[k];
            const need = goal.req[k];
            const met = cur >= need;
            reqHtml += `<div style="font-size:12px; margin-bottom:4px; color:${met?'var(--success)':'#94a3b8'}">
                ${GameData.attributes.find(a=>a.key===k).name}: ${cur.toFixed(1)} / ${need} ${met?'✔':''}
            </div>`;
        }
        if (goal.rankReq) {
            const met = GameState.player.rank <= goal.rankReq * 100;
            reqHtml += `<div style="font-size:12px; color:${met?'var(--success)':'#94a3b8'}">
                排名: Top ${GameState.player.rank}% / ${goal.rankReq*100}% ${met?'✔':''}
            </div>`;
        }

        document.getElementById('goal-tracker').innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
                <strong style="color:var(--text-main)">🎯 ${goal.name}</strong>
                <button class="btn-outline" style="padding:2px 8px; font-size:10px" onclick="UI.showGoalModal()">更换</button>
            </div>
            <div style="background:#f8fafc; padding:10px; border-radius:8px;">${reqHtml}</div>
        `;

        const logs = GameState.player.logs;
        document.getElementById('log-box').innerHTML = logs.map(l =>
            `<div style="font-size:13px; margin-bottom:8px; border-bottom:1px dashed #e2e8f0; padding-bottom:4px;">
                <span style="color:var(--primary); font-weight:bold; font-size:11px; margin-right:5px;">${l.time}</span>
                <span style="color:#475569">${l.msg}</span>
            </div>`
        ).join('');
    },

    // Main Area 渲染卡片 (保持逻辑，更新样式类名)
    renderMainArea: function() {
        const container = document.getElementById('card-area');
        container.innerHTML = '';
        const tasks = GameState.turnData.pendingTasks;
        const btnNext = document.getElementById('btn-next-phase');

        if (tasks.length === 0) {
            btnNext.disabled = false;
            container.innerHTML = `
                <div style="text-align:center; margin-top:60px; color:#94a3b8">
                    <div style="font-size:48px; margin-bottom:20px">☕</div>
                    <h3>本阶段事务已处理完毕</h3>
                    <p>你可以逛逛超市，或者直接进入下一阶段</p>
                </div>
            `;
            return;
        }
        btnNext.disabled = true;

        if (tasks.includes('energy_allocation')) { this.renderEnergyCard(container); return; }
        if (tasks.includes('random_event')) { this.renderEventCard(container); return; }
        if (tasks.includes('course_selection')) { this.renderCourseCard(container); return; }
        if (tasks.includes('final_exam')) {
            container.innerHTML = `
            <div class="card">
                <h3>📝 期末考试</h3>
                <p style="margin-bottom:20px; color:#64748b">一学期的努力将在今天验证。</p>
                <button class="btn-primary" onclick="GameState.calculateSemesterGPA()">开始考试</button>
            </div>`;
            return;
        }
    },

     // === 精力卡片 (含实时预览) ===
    renderEnergyCard: function(container) {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:15px">
                <h3>⚡ 精力分配</h3>
                <span id="energy-total" style="font-weight:bold">0%</span>
            </div>

            <!-- 预览区 -->
            <div id="energy-preview" style="background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:20px; font-size:13px; color:#475569; min-height:40px;">
                调整滑块查看效果...
            </div>

            <div id="slider-group"></div>
            <button class="btn-primary" style="width:100%; margin-top:20px" onclick="UI.submitEnergy()">执行计划</button>
        `;
        container.appendChild(div);

        const sliders = [
            {id:'study', name:'学习', val:40}, {id:'rest', name:'休息', val:30},
            {id:'intern', name:'实习', val:10}, {id:'social', name:'社交', val:20}
        ];

        sliders.forEach(s => {
            div.querySelector('#slider-group').innerHTML += `
                <div class="slider-row">
                    <label>${s.name}</label>
                    <input type="range" id="inp-${s.id}" value="${s.val}" max="100" oninput="UI.updateEnergyPreview()">
                    <span id="val-${s.id}" style="width:30px; text-align:right">${s.val}</span>
                </div>`;
        });
        setTimeout(() => this.updateEnergyPreview(), 0);
    },

    updateEnergyPreview: function() {
        const getVal = k => parseInt(document.getElementById(`inp-${k}`).value) || 0;
        const alloc = { study: getVal('study'), rest: getVal('rest'), intern: getVal('intern'), social: getVal('social') };

        // 更新滑块数字
        for(let k in alloc) document.getElementById(`val-${k}`).innerText = alloc[k];

        // 获取逻辑层计算结果
        const preview = GameState.getEnergyPreview(alloc);

        // 更新总和显示
        const totalEl = document.getElementById('energy-total');
        const max = GameState.player.flags.energyMax;
        totalEl.innerText = `${preview.total} / ${max}`;
        totalEl.className = preview.overflow > 0 ? 'text-danger' : 'text-success';

        // 生成文字描述
        let descHtml = [];
        const chg = preview.changes;
        for (let k in chg) {
            if (Math.abs(chg[k]) < 0.1) continue;
            const attr = GameData.attributes.find(a => a.key === k);
            const val = chg[k] > 0 ? `+${chg[k].toFixed(1)}` : chg[k].toFixed(1);
            const color = chg[k] > 0 ? 'var(--success)' : 'var(--danger)';
            descHtml.push(`<span style="margin-right:8px; white-space:nowrap">${attr.name} <b style="color:${color}">${val}</b></span>`);
        }
        if (preview.warnings.length > 0) {
            preview.warnings.forEach(w => descHtml.push(`<div class="text-danger" style="margin-top:4px">⚠️ ${w}</div>`));
        }

        document.getElementById('energy-preview').innerHTML = descHtml.join('') || "无明显变化";

        // 更新左侧GPA预测 (将当前学习投入存入临时变量)
        this._tempStudyInput = alloc.study;
        this.renderSidebar(); // 局部刷新左侧
    },

    updateEnergySum: function() {
        let sum = 0;
        ['study','rest','intern','social'].forEach(k => {
            const v = parseInt(document.getElementById(`inp-${k}`).value);
            sum += v;
            document.getElementById(`val-${k}`).innerText = v;
        });
        const max = GameState.player.flags.energyMax;
        const totalEl = document.getElementById('energy-total');
        const warn = document.getElementById('energy-warning');

        totalEl.innerText = `${sum} / ${max}`;
        if (sum > max) {
            totalEl.classList.add('text-danger');
            warn.classList.remove('hidden');
            warn.innerText = `⚠️ 精力透支 ${(sum-max)}点 (将扣除大量健康)`;
        } else {
            totalEl.classList.remove('text-danger');
            warn.classList.add('hidden');
        }
    },

    submitEnergy: function() {
        const getVal = k => parseInt(document.getElementById(`inp-${k}`).value) || 0;
        GameState.confirmEnergy({ study: getVal('study'), rest: getVal('rest'), intern: getVal('intern'), social: getVal('social') });
        this._tempStudyInput = 0; // 重置
    },

     // === 事件卡片与结果弹窗 ===
    renderEventCard: function(container) {
        const evt = GameData.events[Math.floor(Math.random()*GameData.events.length)];
        // 把事件对象存起来，方便闭包调用
        const opts = evt.options.map((o, idx) =>
            `<button class="btn-option" id="evt-btn-${idx}">${o.text}</button>`
        ).join('');

        container.innerHTML = `<div class="card"><h3>💡 突发事件</h3><p style="margin-bottom:20px">${evt.text}</p>${opts}</div>`;

        // 绑定点击
        evt.options.forEach((o, idx) => {
            document.getElementById(`evt-btn-${idx}`).onclick = () => {
                const changes = GameState.resolveEvent(o.effect);
                this.showResultModal(o.text, changes);
            };
        });
    },

    showResultModal: function(choiceText, changes) {
        let html = `<p style="color:#64748b; margin-bottom:15px">你选择了：${choiceText}</p><div style="background:#f8fafc; padding:15px; border-radius:8px;">`;
        let hasChange = false;
        for (let k in changes) {
            if (changes[k] === 0) continue;
            const attr = GameData.attributes.find(a => a.key === k);
            const val = changes[k] > 0 ? `+${changes[k].toFixed(1)}` : changes[k].toFixed(1);
            const color = changes[k] > 0 ? 'var(--success)' : 'var(--danger)';
            html += `<div style="display:flex; justify-content:space-between; margin-bottom:5px">
                <span>${attr.name}</span> <b style="color:${color}">${val}</b>
            </div>`;
            hasChange = true;
        }
        if (!hasChange) html += "<div>无事发生</div>";
        html += `</div>`;

        document.getElementById('result-title').innerText = "事件结果";
        document.getElementById('result-body').innerHTML = html;
        document.getElementById('result-overlay').classList.add('active');
    },

    renderCourseCard: function(container) {
        const ac = GameState.player.academics;
        // 计算推荐
        const reqCreds = GameState.player.difficulty.reqCredits;
        const remaining = Math.max(0, reqCreds - ac.totalCredits);
        // ...这里可以直接复用 Logic 里的逻辑，或者直接显示 Logic 算好的 currentSemesterCredits 作为默认值
        const defaultVal = ac.currentSemesterCredits;

        container.innerHTML = `
            <div class="card">
                <h3>📚 学期选课</h3>
                <p style="font-size:13px; color:#64748b; margin-bottom:15px">毕业还需 ${remaining} 学分。</p>
                <div class="slider-row">
                   <label>学分</label>
                   <input type="range" min="10" max="40" value="${defaultVal}" oninput="this.nextElementSibling.innerText=this.value" id="c-inp">
                   <span style="font-weight:bold">${defaultVal}</span>
                </div>
                <button class="btn-primary" style="margin-top:20px; width:100%" onclick="GameState.confirmCourseSelection(document.getElementById('c-inp').value)">确认选课</button>
            </div>
        `;
    },

    renderProjectBar: function() {
        const bar = document.getElementById('active-project-bar');
        const p = GameState.player.activeProject;
        if (!p) {
            bar.innerHTML = '<span style="color:#94a3b8; font-size:13px; font-style:italic">暂无进行中的短期项目</span>';
            return;
        }
        const projName = GameData.projects.find(x=>x.id===p.id).name;
        const pct = (p.progress / p.total) * 100;
        bar.innerHTML = `
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; font-weight:600">
                <span style="color:var(--primary)">⚡ 进行中: ${projName}</span>
                <span>${p.progress} / ${p.total} 阶段</span>
            </div>
            <div class="progress-bg"><div class="progress-fill" style="width:${pct}%"></div></div>
        `;
    },

    showFloatingEffects: function(changes) {
        const area = document.getElementById('card-area');
        let delay = 0;
        for (let k in changes) {
            if (Math.abs(changes[k]) < 0.1) continue;
            const el = document.createElement('div');
            const val = changes[k] > 0 ? `+${changes[k].toFixed(1)}` : changes[k].toFixed(1);
            const name = GameData.attributes.find(a=>a.key===k).name;
            const isGood = changes[k] > 0;

            el.innerText = `${name} ${val}`;
            el.style.cssText = `
                position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%);
                font-weight: 800; font-size: 20px; pointer-events: none;
                color: ${isGood ? 'var(--success)' : 'var(--danger)'};
                animation: floatUp 1.5s forwards; animation-delay: ${delay}s;
                text-shadow: 0 2px 4px rgba(255,255,255,0.8);
            `;
            const styleSheet = document.createElement("style");
            styleSheet.innerHTML = `@keyframes floatUp { 0% { opacity: 0; transform: translate(-50%, 0); } 20% { opacity: 1; transform: translate(-50%, -40px); } 100% { opacity: 0; transform: translate(-50%, -100px); } }`;
            document.head.appendChild(styleSheet);

            area.appendChild(el);
            setTimeout(() => el.remove(), 2000);
            delay += 0.2;
        }
    }
};