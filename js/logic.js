// js/logic.js

const GameState = {
    player: {
        stats: {},
        difficulty: null,
        personality: null,
        academics: {
            currentSemesterCredits: 0,
            totalCredits: 0,
            courses: [],
            studyEffort: 0
        },
        time: { phaseIdx: 0, year: 1, semester: 1, isHoliday: false },
        logs: [],
        flags: { energyMax: 100, skillBonus: 1.0, boughtItems: [] },
        activeProject: null,
        currentGoal: 'gradSchool',
        consecutiveBankrupt: 0,
        rank: 100
    },

    turnData: {
        pendingTasks: [],
        tempEffects: {}
    },

    init: function(diffKey, persKey) {
        // 重置状态
        this.player.stats = {};
        this.player.academics = { currentSemesterCredits: 0, totalCredits: 0, courses: [], studyEffort: 0 };
        this.player.time = { phaseIdx: -1, year: 1, semester: 1, isHoliday: false };
        this.player.logs = [];
        this.player.flags = { energyMax: 100, skillBonus: 1.0, boughtItems: [] };
        this.player.activeProject = null;
        this.player.currentGoal= 'gradSchool';
        this.player.consecutiveBankrupt = 0;

        this.player.difficulty = GameData.difficulties[diffKey];
        this.player.personality = GameData.personalities[persKey];

        GameData.attributes.forEach(attr => {
            if (attr.key === 'money') this.player.stats[attr.key] = 2000;
            else if (['gpa','suTuo','labor'].includes(attr.key)) this.player.stats[attr.key] = 0;
            else this.player.stats[attr.key] = this.player.personality.statsModifier;
        });

        // 这里就是之前报错的地方，现在 addLog 已经定义在下方了
        this.addLog("🎉 欢迎入学！请在右侧设置你的毕业目标。");
        this.nextPhase();
    },

    nextPhase: function() {
        this.player.time.phaseIdx++;
        const idx = this.player.time.phaseIdx;

        // 结局检查
        if (this.checkBadEndings()) return;
        if (idx >= GameData.timeStructure.totalPhases) {
            this.triggerEnding(this.checkGoodEnding() ? 'happy' : 'bad_grad');
            return;
        }

        // 时间计算
        const phaseInYear = idx % 8;
        this.player.time.year = Math.floor(idx / 8) + 1;
        this.player.time.semester = phaseInYear < 4 ? 1 : 2;
        const subPhaseIndex = phaseInYear % 4;
        this.player.time.isHoliday = (subPhaseIndex === 3);

        // 新学年重置
        if (phaseInYear === 0 && this.player.time.year > 1) {
            this.rankAndScholarship();
            this.player.stats.suTuo = 0;
            this.addLog(`📅 新学年开始，素拓分已重置。`);
        }

        // 推进项目
        this.processActiveProject();

        // 生成任务
        this.generateTasks(subPhaseIndex);

        // 刷新UI
        UI.updateAll();
    },

    generateTasks: function(subIdx) {
        this.turnData.pendingTasks = [];
        if (subIdx === 0) {
            this.player.stats.money += 2000;
            this.addLog("💰 获得生活费 2000元。");
            this.player.academics.currentSemesterCredits = this.player.difficulty.baseCredit;
            this.player.academics.studyEffort = 0;
            this.turnData.pendingTasks.push('course_selection');
        }
        this.turnData.pendingTasks.push('energy_allocation');
        this.turnData.pendingTasks.push('random_event');
        if (subIdx === 2) {
            this.turnData.pendingTasks.push('final_exam');
        }
    },

    confirmEnergy: function(alloc) {
        const p = this.player.stats;
        const flags = this.player.flags;

        let total = alloc.study + alloc.rest + alloc.intern + alloc.social;
        let overflow = Math.max(0, total - flags.energyMax);
        let changes = {};

        // 结算各项
        let knowGain = (alloc.study / 20) * 0.5;
        this.applyChange(changes, 'knowledge', knowGain);
        this.player.academics.studyEffort += alloc.study;

        let skillGain = (alloc.intern / 20) * 0.5 * flags.skillBonus;
        this.applyChange(changes, 'skills', skillGain);
        if (alloc.intern > 30) {
            this.player.stats.labor += 1;
            this.applyChange(changes, 'money', 300);
        }

        let healthGain = (alloc.rest / 20) * 0.8;
        this.applyChange(changes, 'physHealth', healthGain);
        this.applyChange(changes, 'mentalHealth', healthGain);

        let socialGain = (alloc.social / 20) * 0.5;
        this.applyChange(changes, 'social', socialGain);

        // 惩罚
        if (overflow > 0) {
            let penalty = overflow / 10;
            this.applyChange(changes, 'physHealth', -penalty);
            this.applyChange(changes, 'mentalHealth', -penalty * 0.5);
            this.addLog(`⚠️ 精力透支 ${overflow}%，身体受损！`);
        }
        if (p.physHealth < 6 || p.mentalHealth < 6) {
            this.applyChange(changes, 'knowledge', -1);
            this.applyChange(changes, 'skills', -1);
            this.addLog("⚠️ 身心状况极差，效率大幅下降！");
        }

        this.completeTask('energy_allocation');
        UI.showFloatingEffects(changes);
    },

    applyChange: function(logObj, key, val) {
        if (val === 0) return;
        this.player.stats[key] += val;

        const attr = GameData.attributes.find(a => a.key === key);
        if (attr && attr.max) {
            this.player.stats[key] = Math.min(attr.max, Math.max(0, this.player.stats[key]));
        }

        if (logObj) {
            if (!logObj[key]) logObj[key] = 0;
            logObj[key] += val;
        }
    },

    startProject: function(projId) {
        const proj = GameData.projects.find(p => p.id === projId);
        for (let k in proj.req) {
            if (this.player.stats[k] < proj.req[k]) {
                alert(`属性不足：${GameData.attributes.find(a=>a.key===k).name} 需要 ${proj.req[k]}`);
                return;
            }
        }
        this.player.activeProject = { id: projId, progress: 0, total: proj.duration };
        this.addLog(`🚀 开启了项目：${proj.name}`);
        UI.updateAll();
    },

    processActiveProject: function() {
        const ap = this.player.activeProject;
        if (!ap) return;

        const proj = GameData.projects.find(p => p.id === ap.id);
        let costText = [];
        for (let k in proj.costPerTurn) {
            this.player.stats[k] -= proj.costPerTurn[k];
            costText.push(`${GameData.attributes.find(a=>a.key===k).name}-${proj.costPerTurn[k]}`);
        }
        this.addLog(`🔄 项目【${proj.name}】进行中 (${costText.join(', ')})`);

        ap.progress++;
        if (ap.progress >= ap.total) {
            let rewards = {};
            for (let k in proj.reward) {
                this.applyChange(rewards, k, proj.reward[k]);
            }
            this.addLog(`✅ 项目【${proj.name}】圆满完成！`);
            UI.showFloatingEffects(rewards);
            this.player.activeProject = null;
        }
    },

    buyItem: function(itemId) {
        const item = GameData.shopItems.find(i => i.id === itemId);
        if (this.player.stats.money < item.cost) {
            alert("余额不足！");
            return;
        }
        if (item.type === 'permanent' && this.player.flags.boughtItems.includes(itemId)) {
            alert("只能购买一次！");
            return;
        }

        this.player.stats.money -= item.cost;
        if (item.type === 'permanent') {
            this.player.flags.boughtItems.push(itemId);
            if (item.effect.energyMax) this.player.flags.energyMax += item.effect.energyMax;
            if (item.effect.skillBonus) this.player.flags.skillBonus += item.effect.skillBonus;
        } else {
            let changes = {};
            for (let k in item.effect) {
                this.applyChange(changes, k, item.effect[k]);
            }
            UI.showFloatingEffects(changes);
        }
        this.addLog(`🛍️ 购买了 ${item.name}`);
        UI.updateAll();
    },

    rankAndScholarship: function() {
        const diff = this.player.difficulty.rankDiff;
        const playerScore = this.player.stats.gpa * 10 + this.player.stats.suTuo;
        let baseRank = 100 - (playerScore * 1.8);
        baseRank += (diff * 20);
        baseRank = Math.max(1, Math.min(99, baseRank + (Math.random() * 10 - 5)));

        this.player.rank = Math.floor(baseRank);
        this.addLog(`🏆 学年结算：你的综合排名位于前 ${this.player.rank}%`);

        if (this.player.rank <= 5) {
            this.addLog("🥇 获得【国家奖学金】！(奖金8000，社交+3)");
            this.applyChange({}, 'money', 8000);
            this.applyChange({}, 'social', 3);
        } else if (this.player.rank <= 15) {
            this.addLog("🥈 获得【学业一等奖】！(奖金3000，社交+1)");
            this.applyChange({}, 'money', 3000);
            this.applyChange({}, 'social', 1);
        }
    },

    checkBadEndings: function() {
        const s = this.player.stats;
        if (s.money < 0) this.player.consecutiveBankrupt++;
        else this.player.consecutiveBankrupt = 0;

        if (this.player.consecutiveBankrupt >= 3) return this.triggerEnding('bankrupt');
        if (s.gpa > 0 && s.gpa < 1.5 && this.player.time.phaseIdx > 8) return this.triggerEnding('dropout');
        if (s.mentalHealth <= 0) return this.triggerEnding('suicide');
        if (s.physHealth <= 0) return this.triggerEnding('death');
        if (s.social <= 0 && this.player.time.phaseIdx > 16) return this.triggerEnding('outcast');
        return false;
    },

    checkGoodEnding: function() {
        const g = GameData.goals[this.player.currentGoal];
        const s = this.player.stats;
        for (let k in g.req) {
            if (s[k] < g.req[k]) return false;
        }
        if (g.rankReq && (this.player.rank / 100) > g.rankReq) return false;
        return true;
    },

    triggerEnding: function(type) {
        let title = "", desc = "";
        switch(type) {
            case 'happy': title = "完美结局"; desc = `你成功实现了目标【${GameData.goals[this.player.currentGoal].name}】，前程似锦！`; break;
            case 'bad_grad': title = "遗憾毕业"; desc = "虽然顺利毕业，但未能达成你的核心目标。不过生活还要继续..."; break;
            case 'bankrupt': title = "退学打工"; desc = "连续破产，无力支付学费，你只能收拾行李去电子厂打螺丝。"; break;
            case 'dropout': title = "学业预警劝退"; desc = "GPA太低，学校建议你退学。"; break;
            case 'suicide': title = "坠落"; desc = "心理压力过大，你选择了结束一切。"; break;
            case 'death': title = "猝死"; desc = "过度劳累，你的心脏停止了跳动。"; break;
            case 'outcast': title = "众叛亲离"; desc = "由于极度缺乏社交，你在孤独中抑郁退学。"; break;
        }
        alert(`=== ${title} ===\n${desc}`);
        location.reload();
    },

    calculateSemesterGPA: function() {
        const knowledgeBase = this.player.stats.knowledge * 0.15;
        const credits = this.player.academics.currentSemesterCredits;
        const totalEffort = this.player.academics.studyEffort;

        let effortScore = 0;
        if (credits > 0) effortScore = (totalEffort / (credits * 8)) * 3.0;

        let semesterGP = knowledgeBase + effortScore - 0.5 + (Math.random() * 0.6);
        semesterGP = Math.max(0, Math.min(4.0, semesterGP));

        this.player.academics.courses.push({ credits: credits, gp: semesterGP });
        this.player.academics.totalCredits += credits;

        let totalScore = 0; let totalCreds = 0;
        this.player.academics.courses.forEach(c => { totalScore += c.gp * c.credits; totalCreds += c.credits; });
        this.player.stats.gpa = parseFloat((totalScore / totalCreds).toFixed(2));

        this.addLog(`📝 学期绩点：${semesterGP.toFixed(2)}，总GPA：${this.player.stats.gpa}`);
        this.completeTask('final_exam');
    },

    confirmCourseSelection: function(c) {
        this.player.academics.currentSemesterCredits = parseInt(c);
        this.addLog(`📚 选课学分：${c}`);
        this.completeTask('course_selection');
    },

    resolveEvent: function(eff) {
        let changes = {};
        for(let k in eff) this.applyChange(changes, k, eff[k]);
        UI.showFloatingEffects(changes);
        this.completeTask('random_event');
    },

    completeTask: function(t) {
        this.turnData.pendingTasks = this.turnData.pendingTasks.filter(x => x !== t);
        UI.updateAll();
    },

    // 之前遗漏的关键函数！
    addLog: function(msg) {
        const t = this.player.time;
        // 计算当前阶段名称 (防止-1的情况)
        const idx = Math.max(0, t.phaseIdx);
        const subPhaseName = GameData.timeStructure.subPhases[idx % 8];
        const timeStr = `第${t.year}年 | ${subPhaseName}`;
        this.player.logs.unshift({ time: timeStr, msg: msg });
    },

    getStat: function(k) { return this.player.stats[k]; },

    getStatPercent: function(k) {
        const attr = GameData.attributes.find(a => a.key === k);
        return Math.min(100, Math.max(0, (this.player.stats[k] / attr.max) * 100));
    }
};