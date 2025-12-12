// js/ui.js

const UI = {
    init: function() {
        this.renderIntro();
        this.bindEvents();
    },

    bindEvents: function() {
        // 模态框关闭点击
        document.getElementById('modal-overlay').addEventListener('click', this.closeModal);
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

    // 渲染左侧属性栏
    renderGameSidebar: function() {
        const container = document.getElementById('attributes-list');
        container.innerHTML = ''; // 清空

        // 显示当前身份信息
        document.getElementById('display-difficulty').innerText = GameState.player.difficulty.name;
        document.getElementById('display-personality').innerText = GameState.player.personality.name;

        // 循环生成属性条
        GameData.attributes.forEach(attr => {
            const val = GameState.getStat(attr.key);
            const percent = GameState.getStatPercent(attr.key);

            const div = document.createElement('div');
            div.className = 'attribute-item';

            // 如果是金钱，不显示进度条，只显示数字
            let progressHtml = '';
            let valText = val;

            if (attr.max) {
                progressHtml = `
                    <div class="progress-bg">
                        <div class="progress-fill" style="width: ${percent}%"></div>
                    </div>
                `;
                valText = `${val} / ${attr.max}`;
            }

            div.innerHTML = `
                <div class="attr-header">
                    <span class="attr-icon">${attr.icon}</span>
                    <span class="attr-name">${attr.name}</span>
                    <button class="btn-detail" onclick="UI.showAttrDetail('${attr.key}')">?</button>
                </div>
                ${progressHtml}
                <div class="attr-val">${valText}</div>
            `;
            container.appendChild(div);
        });
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
    }
};

// 启动
window.onload = function() {
    UI.init();
};