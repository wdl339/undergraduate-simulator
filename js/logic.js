// js/logic.js

const GameState = {
    player: {
        stats: {},
        difficulty: null,
        personality: null,
        academics: {
            currentSemesterCredits: 0,
            totalCredits: 0,
            courses: [], // 记录每学期的课程成绩 {credits, gp}
            studyEffortAcc: 0, // 本学期累积学习精力
            classPhasesPassed: 0 // 本学期已经过的上课阶段数
        },
        time: { phaseIdx: 0, year: 1, semester: 1, isClass: true },
        logs: [],
        flags: { energyMax: 100, skillBonus: 1.0, boughtItems: [] },
        activeProject: null,
        currentGoal: 'gradSchool',
        consecutiveBankrupt: 0, // 连续欠费回合数
        rank: 100
    },

    turnData: {
        pendingTasks: [],
    },

    init: function(diffKey, persKey) {
        this.player.difficulty = GameData.difficulties[diffKey];
        this.player.personality = GameData.personalities[persKey];

        // 重置
        this.player.stats = {};
        this.player.academics = { currentSemesterCredits: 0, totalCredits: 0, courses: [], studyEffortAcc: 0, classPhasesPassed: 0 };
        this.player.time = { phaseIdx: -1, year: 1, semester: 1, isClass: true };
        this.player.logs = [];
        this.player.flags = { energyMax: 100, skillBonus: 1.0, boughtItems: [] };
        this.player.activeProject = null;
        this.player.currentGoal = 'gradSchool';
        this.player.consecutiveBankrupt = 0;

        GameData.attributes.forEach(attr => {
            if (['gpa','suTuo','labor', 'money', 'credits'].includes(attr.key)) this.player.stats[attr.key] = 0;
            else this.player.stats[attr.key] = this.player.personality.statsModifier;
        });

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

        const subPhaseObj = GameData.timeStructure.subPhases[phaseInYear];
        this.player.time.isClass = subPhaseObj.isClass;

        // 新学期/新学年 初始化
        if (phaseInYear === 0 || phaseInYear === 4) {
            // 新学期开始，重置GPA相关累积
            this.player.academics.studyEffortAcc = 0;
            this.player.academics.classPhasesPassed = 0;
        }
        if (phaseInYear === 0 && this.player.time.year > 1) {
            this.rankAndScholarship();
            this.player.stats.suTuo = 0;
            this.addLog(`📅 新学年开始，素拓分已重置。`);
        }

        this.processActiveProject();
        this.generateTasks(phaseInYear);
        UI.updateAll();
    },

    generateTasks: function(phaseInYear) {
        this.turnData.pendingTasks = [];
        const isStartOfSemester = (phaseInYear === 0 || phaseInYear === 4);
        const isEndOfSemester = (phaseInYear === 2 || phaseInYear === 6);

        // 开学：选课 & 生活费
        if (isStartOfSemester) {
            this.player.stats.money += this.player.personality.regularMoney;
            this.addLog(`💰 获得生活费 ${this.player.personality.regularMoney} 元。`);

            // 智能推荐学分： (总需 - 已修) / 剩余学期数
            const remainingCredits = Math.max(0, this.player.difficulty.reqCredits - this.player.academics.totalCredits);
            const totalSemesters = 8;
            const passedSemesters = (this.player.time.year - 1) * 2 + (this.player.time.semester - 1);
            const remainingSemesters = totalSemesters - passedSemesters;

            let rec = remainingSemesters > 0 ? Math.ceil(remainingCredits / remainingSemesters) : remainingCredits;
            rec = Math.min(40, Math.max(10, rec)); // 限制在10-40之间

            this.player.academics.currentSemesterCredits = rec;
            this.turnData.pendingTasks.push('course_selection');
        }

        this.turnData.pendingTasks.push('energy_allocation');
        this.turnData.pendingTasks.push('random_event');

        if (isEndOfSemester) {
            this.turnData.pendingTasks.push('final_exam');
        }
    },

    // === 精力分配与预测 ===

    calChangeKnowledge: function(studyInput) {
        const baseGain = (studyInput / 20) * 0.45;
        return baseGain;
    },

    // 供UI调用的预测函数 (不改变实际属性)
    getEnergyPreview: function(alloc) {
        const p = this.player.stats;
        const flags = this.player.flags;
        let changes = { knowledge:0, skills:0, physHealth:0, mentalHealth:0, social:0, money:0 };
        let warnings = [];

        // 1. 收益
        changes.knowledge += this.calChangeKnowledge(alloc.study);
        changes.skills += this.calChangeKnowledge(alloc.study) * flags.skillBonus;
        const restGain = (alloc.rest - 20) / 20 * 0.8;
        changes.physHealth += restGain;
        changes.mentalHealth += restGain;
        changes.social += (alloc.social - 20) / 20 * 0.5;

        // 2. 消耗与惩罚
        // 项目消耗
        if (this.player.activeProject) {
            const proj = GameData.projects.find(pr => pr.id === this.player.activeProject.id);
            for (let k in proj.costPerTurn) {
                if (changes[k] === undefined) changes[k] = 0;
                changes[k] -= proj.costPerTurn[k];
            }
        }

        // 溢出惩罚
        let total = alloc.study + alloc.rest + alloc.social;
        let overflow = Math.max(0, total - flags.energyMax);
        if (overflow > 0) {
            let penalty = overflow / 10;
            changes.physHealth -= penalty * 1.1;
            changes.mentalHealth -= penalty * 0.8;
            warnings.push(`精力透支 ${overflow}%, 健康大幅受损`);
        }

        // 低健康惩罚预警
        // 预测后的血量
        let predPhys = p.physHealth + changes.physHealth;
        let predMent = p.mentalHealth + changes.mentalHealth;
        if (predPhys < 6 || predMent < 6) {
            changes.knowledge -= 1;
            changes.skills -= 1;
            warnings.push("身心状况极差，学习效率下降");
        }

        return { changes, warnings, total, overflow };
    },

    // 确认精力分配
    confirmEnergy: function(alloc) {
        // 复用预测逻辑来计算数值
        const preview = this.getEnergyPreview(alloc);
        const chg = preview.changes;

        for (let k in chg) {
            this.applyChange(null, k, chg[k]);
        }

        // 记录本学期学习精力 (仅当是非假期时)
        if (this.player.time.isClass) {
            this.player.academics.studyEffortAcc += alloc.study;
            this.player.academics.classPhasesPassed++;
        }

        if (preview.warnings.length > 0) {
            this.addLog(`⚠️ ${preview.warnings.join('; ')}`);
        }

        this.completeTask('energy_allocation');
    },

    // === GPA 预测与计算 ===

    // 辅助函数：计算基础GPA
    calculateBaseGPA: function(knowledge, avgEffort, credits) {
        // 知识分：满分3.0（20知识）
        const knowledgeBase = knowledge * 0.15;
        // 努力分：
        // 假设标准努力是 每学分2.5精力/每阶段
        // 例如：20学分 -> 50精力/阶段 -> 努力分 3.0
        const requiredEffortPerPhase = credits * 2.5;
        let effortScore = 0;
        if (requiredEffortPerPhase > 0) {
            effortScore = (avgEffort / requiredEffortPerPhase) * 3.0;
        }
        // console.log(`BaseGPA Calc - Knowledge: ${knowledge}, KnowledgeBase: ${knowledgeBase.toFixed(2)}, EffortScore: ${effortScore.toFixed(2)}, Sum: ${(knowledgeBase + effortScore -2.0).toFixed(2)}`);
        return knowledgeBase + effortScore - 2.0;
    },

    // 获取GPA预测范围 {semester: {min, max, avg}, total: {min, max, avg}}
    getGPAPrediction: function(currentStudyInput) {
        const ac = this.player.academics;
        const credits = ac.currentSemesterCredits;
        if (credits <= 0) return { semester: { min: 0, max: 0, avg: 0 }, total: { min: 0, max: 0, avg: 0 } };

        // 假设当前阶段投入 currentStudyInput
        let projectedEffort = ac.studyEffortAcc;
        let projectedPhases = ac.classPhasesPassed;

        if (this.player.time.isClass) {
            projectedEffort += currentStudyInput;
            projectedPhases += 1;
        }

        // 防止除以0
        let avgEffort = projectedPhases > 0 ? (projectedEffort / projectedPhases) : 0;

        tmpChangeKnowledge = this.player.stats.knowledge + this.calChangeKnowledge(currentStudyInput);
        let baseGPA = this.calculateBaseGPA(tmpChangeKnowledge, avgEffort, credits);
        // 随机浮动 +/- 0.2
        const semesterMin = Math.max(0, Math.min(4.0, baseGPA - 0.2));
        const semesterMax = Math.max(0, Math.min(4.0, baseGPA + 0.2));
        const semesterAvg = Math.max(0, Math.min(4.0, baseGPA));

        // 计算当前总GPA
        let currentTotalScore = 0;
        let currentTotalCredits = 0;
        ac.courses.forEach(c => {
            currentTotalScore += c.gp * c.credits;
            currentTotalCredits += c.credits;
        });

        // 预测总GPA
        const predictedTotalCredits = currentTotalCredits + credits;
        if (predictedTotalCredits <= 0) {
            return {
                semester: { min: semesterMin, max: semesterMax, avg: semesterAvg },
                total: { min: 0, max: 0, avg: 0 }
            };
        }

        const totalMin = (currentTotalScore + semesterMin * credits) / predictedTotalCredits;
        const totalMax = (currentTotalScore + semesterMax * credits) / predictedTotalCredits;
        const totalAvg = (currentTotalScore + semesterAvg * credits) / predictedTotalCredits;

        return {
            semester: { min: semesterMin, max: semesterMax, avg: semesterAvg },
            total: { min: Math.max(0, Math.min(4.0, totalMin)), max: Math.max(0, Math.min(4.0, totalMax)), avg: Math.max(0, Math.min(4.0, totalAvg)) }
        };
    },

    calculateSemesterGPA: function() {
        // 最后一次结算
        const ac = this.player.academics;
        // 平均努力
        let avgEffort = ac.classPhasesPassed > 0 ? (ac.studyEffortAcc / ac.classPhasesPassed) : 0;

        let baseGPA = this.calculateBaseGPA(this.player.stats.knowledge, avgEffort, ac.currentSemesterCredits);
        let finalGPA = baseGPA + (Math.random() * 0.2 * 2 - 0.2); // -0.2 ~ +0.2
        finalGPA = parseFloat(Math.max(0, Math.min(4.0, finalGPA)).toFixed(2));

        // 记录
        ac.courses.push({ credits: ac.currentSemesterCredits, gp: finalGPA });
        ac.totalCredits += ac.currentSemesterCredits;

        // 更新总GPA
        let totalScore = 0; let totalCreds = 0;
        ac.courses.forEach(c => { totalScore += c.gp * c.credits; totalCreds += c.credits; });
        this.player.stats.gpa = parseFloat((totalScore / totalCreds).toFixed(2));
        this.player.stats.credits = ac.totalCredits; // 同步给UI显示

        this.addLog(`📝 学期结束，平均努力: ${avgEffort.toFixed(1)}，绩点: ${finalGPA}`);
        this.completeTask('final_exam');
    },

    rankAndScholarship: function() {
        const diff = this.player.difficulty.rankDiff;
        const playerScore = this.player.stats.gpa * 9 + this.player.stats.suTuo * 5;
        let baseRank = 100 - (playerScore * 2);
        baseRank += (diff * 20);
        baseRank = Math.max(1, Math.min(99, baseRank + (Math.random() * 3 * 2 - 3)));

        this.player.rank = Math.floor(baseRank);
        this.addLog(`🏆 奖学金评选：你的综合排名位于前 ${this.player.rank}%`);

        if (this.player.rank <= 5) {
            this.addLog("🥇 获得【国家奖学金】！(奖金5000，社交+2)");
            this.applyChange({}, 'money', 5000);
            this.applyChange({}, 'social', 2);
        } else if (this.player.rank <= 20) {
            this.addLog("🥈 获得【优秀奖学金】！(奖金1000，社交+1)");
            this.applyChange({}, 'money', 1000);
            this.applyChange({}, 'social', 1);
        }
    },

    // === 事件与任务 ===

    resolveEvent: function(eff) {
        let changes = {};
        for(let k in eff) {
            this.applyChange(changes, k, eff[k]);
        }
        this.completeTask('random_event');
        return changes; // 返回变动给UI显示
    },

   applyChange: function(logObj, key, val) {
        if (!val) return;
        this.player.stats[key] += val;

        const attr = GameData.attributes.find(a => a.key === key);
        if (attr && attr.max) {
            this.player.stats[key] = Math.min(attr.max, Math.max(0, this.player.stats[key]));
        }
        if (logObj) logObj[key] = val;
    },

    completeTask: function(t) {
        this.turnData.pendingTasks = this.turnData.pendingTasks.filter(x => x !== t);
        UI.updateAll();
    },

    confirmCourseSelection: function(c) {
        this.player.academics.currentSemesterCredits = parseInt(c);
        this.addLog(`📚 选课学分：${c}`);
        this.completeTask('course_selection');
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
        }
        this.addLog(`🛍️ 购买了 ${item.name}`);
        UI.updateAll();
    },

    checkBadEndings: function() {
        const s = this.player.stats;
        if (s.money < 0) this.player.consecutiveBankrupt++;
        else this.player.consecutiveBankrupt = 0;

        if (this.player.consecutiveBankrupt >= 3) return this.triggerEnding('bankrupt');
        if (s.gpa > 0 && s.gpa < this.player.difficulty.quitGPA && this.player.time.phaseIdx > 8) return this.triggerEnding('dropout');
        if (s.mentalHealth <= 0) return this.triggerEnding('suicide');
        if (s.physHealth <= 0) return this.triggerEnding('death');
        if (s.social <= 0 && this.player.time.phaseIdx > 8) return this.triggerEnding('outcast');
        return false;
    },

    checkGoodEnding: function() {
        const g = GameData.goals[this.player.currentGoal];
        const s = this.player.stats;
        if (s.credits < this.player.difficulty.reqCredits) return false;
        for (let k in g.req) if (s[k] < g.req[k]) return false;
        if (g.require_rank && (this.player.rank / 100) > this.player.difficulty.reqRank) return false;

        return true;
    },

    triggerEnding: function(type) {
        let title = "", desc = "", isGood = false;
        switch(type) {
            case 'happy':
                title = "完美达成";
                desc = `恭喜！你成功实现了目标【${GameData.goals[this.player.currentGoal].name}】，没有辜负这四年的青春。我们都有光明的未来！`;
                isGood = true;
                break;
            case 'bad_grad':
                title = "平淡毕业";
                desc = `你顺利拿到了毕业证，但回首大学四年，似乎离当初定下的宏伟目标【${GameData.goals[this.player.currentGoal].name}】还有一段距离`;
                break;
            case 'bankrupt':
                title = "无奈退学";
                desc = "连续的经济危机让你无力支付学费和生活费。看着空荡荡的钱包，你只能收拾行李，提前告别校园，开启打工生涯";
                break;
            case 'dropout':
                title = "劝退离校";
                desc = "由于GPA过低，触发了学业预警机制。教务处发来了最终通知书，你的大学生涯到此结束";
                break;
            case 'suicide':
                title = "心理崩溃";
                desc = "长期的压力与抑郁压垮了你的最后一根稻草。世界变成了灰色，你选择了一跳了之";
                break;
            case 'death':
                title = "过劳倒下";
                desc = "无视身体发出的警告，长期的熬夜与透支终于让你在某个清晨倒下，再也没有醒来。健康才是最大的本钱啊";
                break;
            case 'outcast':
                title = "孤岛人生";
                desc = "极度缺乏社交让你与周围的世界完全脱节。在孤独的吞噬下，你选择了悄然离开，没有人注意到你的离去";
                break;
        }
        UI.showEndingScreen(title, desc, isGood);
    },

    // === 辅助 ===
    addLog: function(msg) {
        const t = this.player.time;
        const subPhaseName = GameData.timeStructure.subPhases[Math.max(0, t.phaseIdx) % 8].name;
        const timeStr = `第 ${t.year} 年 | ${subPhaseName}`;
        this.player.logs.unshift({ time: timeStr, msg: msg });
    },

    getStat: function(k) { return this.player.stats[k]; },
    getStatPercent: function(k) {
        const attr = GameData.attributes.find(a => a.key === k);
        if (!attr.max) return 0;
        return Math.min(100, Math.max(0, (this.player.stats[k] / attr.max) * 100));
    },
};