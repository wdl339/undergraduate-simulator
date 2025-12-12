// js/logic.js

const GameState = {
    player: {
        stats: {},
        difficulty: null,
        personality: null,
        // 学业记录
        academics: {
            currentSemesterCredits: 0, // 本学期选修学分
            totalCredits: 0,           // 已修总学分
            courses: [],               // 历史课程记录 {credit: 2, gp: 3.7}
            studyEffort: 0             // 本学期累计投入的学习精力
        },
        // 时间记录
        time: {
            currentPhaseIndex: 0, // 0 - 31
            year: 1,
            semester: 1, // 1 或 2
            isHoliday: false
        },
        logs: [] // 生涯记录
    },

    // 运行时临时状态
    turnData: {
        energyTotal: 100,
        pendingTasks: [] // 当前阶段必须完成的任务 ['course', 'energy', 'event']
    },

    init: function(diffKey, persKey) {
        this.player.difficulty = GameData.difficulties[diffKey];
        this.player.personality = GameData.personalities[persKey];

        // 初始属性
        GameData.attributes.forEach(attr => {
            if (attr.key === 'money') this.player.stats[attr.key] = 1500;
            else if (attr.key === 'gpa') this.player.stats[attr.key] = 0.0;
            else if (attr.key === 'suTuo') this.player.stats[attr.key] = 0;
            else if (attr.key === 'labor') this.player.stats[attr.key] = 0;
            else this.player.stats[attr.key] = this.player.personality.statsModifier;
        });

        this.player.time.currentPhaseIndex = -1; // 从 -1 开始，nextPhase 后变成 0
        this.addLog("🎉 恭喜你被录取了！大学生活正式开始。");
        this.nextPhase();
    },

    // 进入下一阶段
    nextPhase: function() {
        this.player.time.currentPhaseIndex++;
        const idx = this.player.time.currentPhaseIndex;

        // 游戏结束判断
        if (idx >= GameData.timeStructure.totalPhases) {
            alert("毕业啦！(结局结算功能待开发)");
            return;
        }

        // 时间计算
        const phaseInYear = idx % 8; // 0-7
        this.player.time.year = Math.floor(idx / 8) + 1;
        // 0,1,2,3 是第一学期+寒假; 4,5,6,7 是第二学期+暑假
        this.player.time.semester = phaseInYear < 4 ? 1 : 2;

        // 判断具体阶段类型
        // subPhaseIndex: 0=开学, 1=期中, 2=期末, 3=假期
        const subPhaseIndex = phaseInYear % 4;
        this.player.time.isHoliday = (subPhaseIndex === 3);

        // 新学年重置素拓
        if (phaseInYear === 0 && this.player.time.year > 1) {
            this.player.stats.suTuo = 0;
            this.addLog(`📅 新学年开始，素拓分已重置。`);
        }

        // 健康值惩罚检查 (阈值检查)
        this.checkHealthPenalty();

        // 生成本回合任务
        this.generateTasks(subPhaseIndex);

        // UI刷新
        UI.updatePhaseDisplay();
        UI.renderSidebar();
        UI.renderMainArea();
    },

    // 检查健康状况
    checkHealthPenalty: function() {
        const p = this.player.stats;
        let penalized = false;
        if (p.physHealth < 6 || p.mentalHealth < 6) {
            p.knowledge = Math.max(0, p.knowledge - 1);
            p.skills = Math.max(0, p.skills - 1);
            penalized = true;
            this.addLog("⚠️ 你的身心状况极差，导致学习效率低下，知识与技能下降了！");
        }
    },

    // 生成任务
    generateTasks: function(subPhaseIndex) {
        this.turnData.pendingTasks = [];

        // 1. 开学选课 & 领生活费
        if (subPhaseIndex === 0) {
            this.player.stats.money += 1500; // 领生活费
            this.addLog("💰 收到父母寄来的生活费 1500元。");
            this.player.academics.currentSemesterCredits = this.player.difficulty.baseCredit;
            this.player.academics.studyEffort = 0; // 重置本学期努力值
            this.turnData.pendingTasks.push('course_selection');
        }

        // 2. 精力分配 (假期也有，但可能有些不同，简化处理全都有)
        this.turnData.pendingTasks.push('energy_allocation');

        // 3. 随机事件
        this.turnData.pendingTasks.push('random_event');

        // 4. 期末考试
        if (subPhaseIndex === 2) {
            this.turnData.pendingTasks.push('final_exam');
        }
    },

    // ---------------- 逻辑处理函数 ----------------

    // 选课处理
    confirmCourseSelection: function(credits) {
        this.player.academics.currentSemesterCredits = parseInt(credits);
        this.addLog(`📚 本学期选课学分：${credits}`);
        this.completeTask('course_selection');
    },

    // 精力分配处理
    confirmEnergy: function(allocation) {
        // allocation: { study, rest, intern, social }
        const p = this.player.stats;

        // 1. 学习 -> 增加知识，增加本学期累积努力值
        // 逻辑：每10点精力增加0.5知识
        p.knowledge = Math.min(20, p.knowledge + (allocation.study / 20));
        this.player.academics.studyEffort += allocation.study;

        // 2. 实习 -> 增加技能，增加劳动学时(少量)，增加钱
        p.skills = Math.min(20, p.skills + (allocation.intern / 15));
        if (allocation.intern > 30) {
            p.labor += 1;
            p.money += 200;
        }

        // 3. 休息 -> 恢复身心
        p.physHealth = Math.min(20, p.physHealth + (allocation.rest / 20));
        p.mentalHealth = Math.min(20, p.mentalHealth + (allocation.rest / 20));

        // 4. 社交 -> 增加社交，增加一点点素拓
        p.social = Math.min(20, p.social + (allocation.social / 15));
        if (allocation.social > 40) p.suTuo += 0.5;

        // 5. 过劳扣血 (总精力默认100，这里允许超额分配，UI层限制或者逻辑层惩罚)
        // 假设UI传入的总和是100，这里我们设定如果单项过高也会扣血
        if (allocation.study > 50 || allocation.intern > 50) {
            p.physHealth -= 1;
            p.mentalHealth -= 1;
        }

        this.addLog("⚡ 完成了本阶段的精力分配。");
        this.completeTask('energy_allocation');
    },

    // 随机事件处理
    resolveEvent: function(optionEffects) {
        for (let key in optionEffects) {
            if (this.player.stats.hasOwnProperty(key)) {
                let val = optionEffects[key];
                this.player.stats[key] += val;
                // 边界检查
                if (GameData.attributes.find(a=>a.key===key).max) {
                    this.player.stats[key] = Math.min(GameData.attributes.find(a=>a.key===key).max, this.player.stats[key]);
                }
                // 金钱无上限，但不能负太多(暂不处理破产)
            }
        }
        this.completeTask('random_event');
    },

    // 期末结算 GPA
    calculateSemesterGPA: function() {
        // 简单模拟算法：
        // 基础分 = 知识水平 * 0.15 (满级20 -> 3.0)
        // 努力分 = (本学期投入总精力 / (学分 * 10)) * 2.0  (假设每学分需要10点精力才能保本)
        // 随机浮动 = +/- 0.3

        const knowledgeBase = this.player.stats.knowledge * 0.15;

        const credits = this.player.academics.currentSemesterCredits;
        const totalEffort = this.player.academics.studyEffort; // 本学期3个阶段累计

        // 努力系数：如果你选了20学分，理想总精力投入应该是 20 * 8(系数) = 160左右。
        // 一个学期3个阶段，假设平均每阶段投入60精力学习，总180。
        let effortScore = 0;
        if (credits > 0) {
            effortScore = (totalEffort / (credits * 8)) * 3.0; // 这里的系数控制难度
        }

        let semesterGP = knowledgeBase + effortScore - 0.5 + (Math.random() * 0.6);
        semesterGP = Math.max(0, Math.min(4.0, semesterGP)); // 限制在 0-4.0

        // 记录课程
        this.player.academics.courses.push({
            credits: credits,
            gp: semesterGP
        });
        this.player.academics.totalCredits += credits;

        // 重新计算总GPA
        let totalScore = 0;
        let totalCreds = 0;
        this.player.academics.courses.forEach(c => {
            totalScore += c.gp * c.credits;
            totalCreds += c.credits;
        });
        this.player.stats.gpa = (totalScore / totalCreds).toFixed(2);

        this.addLog(`📝 学期结束，本学期绩点：${semesterGP.toFixed(2)}，总GPA：${this.player.stats.gpa}`);
        this.completeTask('final_exam');
    },

    // 任务管理辅助
    completeTask: function(taskName) {
        const idx = this.turnData.pendingTasks.indexOf(taskName);
        if (idx > -1) {
            this.turnData.pendingTasks.splice(idx, 1);
        }
        UI.renderMainArea(); // 刷新界面状态
        UI.renderSidebar();  // 刷新属性
    },

    addLog: function(msg) {
        const timeStr = `第${this.player.time.year}年${this.player.time.semester}学期`;
        this.player.logs.unshift({ time: timeStr, msg: msg });
    },

    getStat: function(key) { return this.player.stats[key]; },
    getStatPercent: function(key) {
        const attr = GameData.attributes.find(a => a.key === key);
        if (!attr || !attr.max) return 100;
        return Math.min(100, Math.max(0, (this.player.stats[key] / attr.max) * 100));
    }
};