// js/ui.js

const UI = {
    init: function() {
        this.renderIntro();
        // 绑定TAB切换事件
        document.getElementById('tab-tasks').addEventListener('click', () => this.switchTab('tasks'));
        document.getElementById('tab-logs').addEventListener('click', () => this.switchTab('logs'));
    },

    // 渲染介绍界面
    renderIntro: function() {
        document.getElementById('game-title').innerText = GameData.info.title;
        document.getElementById('game-objective').innerText = GameData.info.objective;
        document.getElementById('game-author').innerText = "作者：" + GameData.info.author;
    },

    // 切换到设置界面
    showSetup: function() {
        document.getElementById('screen-intro').classList.add('hidden');
        document.getElementById('screen-setup').classList.remove('hidden');
        this.renderSetupOptions();
    },

    // 渲染设置选项
    renderSetupOptions: function() {
        const diffSelect = document.getElementById('select-difficulty');
        const persSelect = document.getElementById('select-personality');

        // 清空现有选项
        diffSelect.innerHTML = '';
        persSelect.innerHTML = '';

        // 填充难度
        for (let key in GameData.difficulties) {
            let opt = document.createElement('option');
            opt.value = key;
            opt.text = `${GameData.difficulties[key].name} - ${GameData.difficulties[key].desc}`;
            diffSelect.add(opt);
        }

        // 填充性格
        for (let key in GameData.personalities) {
            let opt = document.createElement('option');
            opt.value = key;
            opt.text = `${GameData.personalities[key].name} (${GameData.personalities[key].desc})`;
            persSelect.add(opt);
        }
    },

    // 开始游戏
    startGame: function() {
        const diff = document.getElementById('select-difficulty').value;
        const pers = document.getElementById('select-personality').value;

        GameState.init(diff, pers);

        document.getElementById('screen-setup').classList.add('hidden');
        document.getElementById('screen-game').classList.remove('hidden');

        this.renderGameSidebar();
    },

    // 显示属性详情模态框
    showAttrDetail: function(key) {
        const attr = GameData.attributes.find(a => a.key === key);
        if (attr) {
            document.getElementById('modal-title').innerText = attr.name;
            document.getElementById('modal-body').innerText = attr.desc;
            document.getElementById('modal-overlay').classList.remove('hidden');
        }
    },

    closeModal: function() {
        document.getElementById('modal-overlay').classList.add('hidden');
    },

    switchTab: function(tabName) {
        document.getElementById('tab-tasks').classList.toggle('active', tabName === 'tasks');
        document.getElementById('tab-logs').classList.toggle('active', tabName === 'logs');
        document.getElementById('view-tasks').classList.toggle('hidden', tabName !== 'tasks');
        document.getElementById('view-logs').classList.toggle('hidden', tabName !== 'logs');
    },

    // 更新时间显示
    updatePhaseDisplay: function() {
        const t = GameState.player.time;
        const timeStr = GameData.timeStructure.subPhases[t.currentPhaseIndex % 8];
        const fullStr = `第 ${t.year} 年 | ${timeStr}`;
        document.getElementById('game-time-display').innerText = fullStr;
    },

    // 渲染左侧属性栏 (已更新)
    renderSidebar: function() {
        const basicContainer = document.getElementById('basic-stats-list');
        const academicContainer = document.getElementById('academic-stats-list');

        basicContainer.innerHTML = '';
        academicContainer.innerHTML = '';

        // 更新顶部信息
        document.getElementById('display-difficulty').innerText = GameState.player.difficulty.name;
        document.getElementById('display-personality').innerText = GameState.player.personality.name;

        // 1. 手动插入“已修学分”到学业栏的最前面
        const credits = GameState.player.academics.totalCredits;
        const creditsDiv = document.createElement('div');
        creditsDiv.className = 'attribute-item';
        creditsDiv.innerHTML = `
            <div class="attr-header">
                <span class="attr-icon">🎓</span>
                <span class="attr-name">已修学分</span>
            </div>
            <div class="attr-val" style="font-size: 1.2em; color: var(--primary-color)">${credits}</div>
        `;
        academicContainer.appendChild(creditsDiv);

        // 2. 循环生成其他属性
        GameData.attributes.forEach(attr => {
            const val = GameState.getStat(attr.key);
            let valText = typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(1) : val;

            // 状态颜色检查
            let extraClass = '';
            if (attr.critical && val <= attr.critical) extraClass = 'text-danger';

            // 进度条HTML
            let progressHtml = '';
            if (attr.max) {
                const percent = GameState.getStatPercent(attr.key);
                let barColor = 'var(--primary-color)';
                if (['physHealth', 'mentalHealth'].includes(attr.key) && val < 6) {
                    barColor = 'var(--danger-color)';
                }
                progressHtml = `
                    <div class="progress-bg">
                        <div class="progress-fill" style="width: ${percent}%; background-color: ${barColor}"></div>
                    </div>
                `;
                valText = `${valText} / ${attr.max}`;
            }

            // 构建HTML
            const div = document.createElement('div');
            div.className = 'attribute-item';
            div.innerHTML = `
                <div class="attr-header">
                    <span class="attr-icon">${attr.icon}</span>
                    <span class="attr-name">${attr.name}</span>
                    <button class="btn-detail" onclick="UI.showAttrDetail('${attr.key}')">?</button>
                </div>
                ${progressHtml}
                <div class="attr-val ${extraClass}">${valText}</div>
            `;

            // 分类放入不同容器
            if (attr.category === 'academic') {
                academicContainer.appendChild(div);
            } else {
                basicContainer.appendChild(div);
            }
        });
    },

    // 核心：渲染主区域
    renderMainArea: function() {
        const taskContainer = document.getElementById('task-container');
        taskContainer.innerHTML = ''; // 清空

        // 渲染日志
        this.renderLogs();

        const tasks = GameState.turnData.pendingTasks;

        // 如果没有任务，显示“下一阶段”按钮
        if (tasks.length === 0) {
            taskContainer.innerHTML = `
                <div class="empty-state">
                    <h3>✅ 本阶段事务已处理完毕</h3>
                    <p>休息一下，准备进入下一阶段吧。</p>
                </div>
            `;
            document.getElementById('btn-next-phase').disabled = false;
            return;
        }

        document.getElementById('btn-next-phase').disabled = true;

        // 1. 选课卡片
        if (tasks.includes('course_selection')) {
            const base = GameState.player.difficulty.baseCredit;
            const card = document.createElement('div');
            card.className = 'card task-card';
            card.innerHTML = `
                <h3>📚 学期选课</h3>
                <p>本学期建议修读学分：${base} </p>
                <div class="form-group">
                    <label>调整学分 (10 - 40): <span id="val-credits">${base}</span></label>
                    <input type="range" min="10" max="40" value="${base}" id="input-credits" oninput="document.getElementById('val-credits').innerText=this.value">
                </div>
                <button class="btn-primary" onclick="GameState.confirmCourseSelection(document.getElementById('input-credits').value)">确认选课</button>
            `;
            taskContainer.appendChild(card);
            return; // 每次只显示一个主要交互，避免混乱
        }

        // 2. 考试结算卡片
        if (tasks.includes('final_exam')) {
             const card = document.createElement('div');
            card.className = 'card task-card';
            card.innerHTML = `
                <h3>📝 期末考试周</h3>
                <p>经过一学期的努力，是时候检验成果了。</p>
                <button class="btn-primary" onclick="GameState.calculateSemesterGPA()">查看成绩</button>
            `;
            taskContainer.appendChild(card);
            return;
        }

        // 3. 精力分配卡片
        if (tasks.includes('energy_allocation')) {
            const card = document.createElement('div');
            card.className = 'card task-card';
            // 简单的HTML滑块组
            card.innerHTML = `
                <h3>⚡ 本月精力分配</h3>
                <p>总精力有限，请妥善分配 (总和建议 100，可超额但伤身)。</p>
                ${this.createSliderHtml('学习', 'study', 40)}
                ${this.createSliderHtml('休息', 'rest', 30)}
                ${this.createSliderHtml('实习/打工', 'intern', 10)}
                ${this.createSliderHtml('社交/娱乐', 'social', 20)}
                <div class="total-energy">当前总分配: <span id="total-energy-val">100</span>%</div>
                <button class="btn-primary" onclick="UI.submitEnergy()">执行计划</button>
            `;
            taskContainer.appendChild(card);
            // 绑定滑块事件计算总和
            setTimeout(() => {
                const inputs = card.querySelectorAll('input[type="range"]');
                inputs.forEach(input => {
                    input.addEventListener('input', () => {
                        document.getElementById(`val-${input.id.split('-')[1]}`).innerText = input.value;
                        let sum = 0;
                        inputs.forEach(i => sum += parseInt(i.value));
                        const totalDisp = document.getElementById('total-energy-val');
                        totalDisp.innerText = sum;
                        totalDisp.style.color = sum > 100 ? 'red' : 'green';
                    });
                });
            }, 0);

            // 为了不让随机事件和精力分配同时挤在一起，这里return
            // 也就是说必须先分配精力，再处理随机事件
            return;
        }

        // 4. 随机事件
        if (tasks.includes('random_event')) {
            const eventIdx = Math.floor(Math.random() * GameData.events.length);
            const evt = GameData.events[eventIdx];

            const card = document.createElement('div');
            card.className = 'card task-card';

            let optionsHtml = '';
            evt.options.forEach((opt, idx) => {
                // 将对象转为字符串存储在 dataset 中以便读取
                optionsHtml += `<button class="btn-option" onclick='GameState.resolveEvent(${JSON.stringify(opt.effect)})'>${opt.text}</button>`;
            });

            card.innerHTML = `
                <h3>💡 突发事件</h3>
                <p class="event-text">${evt.text}</p>
                <div class="option-group">
                    ${optionsHtml}
                </div>
            `;
            taskContainer.appendChild(card);
        }
    },

    createSliderHtml: function(label, id, defaultVal) {
        return `
            <div class="slider-row">
                <label>${label}</label>
                <input type="range" id="input-${id}" min="0" max="100" value="${defaultVal}">
                <span id="val-${id}" class="slider-val">${defaultVal}</span>
            </div>
        `;
    },

    submitEnergy: function() {
        const allocation = {
            study: parseInt(document.getElementById('input-study').value),
            rest: parseInt(document.getElementById('input-rest').value),
            intern: parseInt(document.getElementById('input-intern').value),
            social: parseInt(document.getElementById('input-social').value)
        };
        GameState.confirmEnergy(allocation);
    },

    renderLogs: function() {
        const list = document.getElementById('log-list');
        list.innerHTML = GameState.player.logs.map(log =>
            `<div class="log-item"><span class="log-time">${log.time}</span> ${log.msg}</div>`
        ).join('');
    }
};

// 启动
window.onload = function() {
    UI.init();
};