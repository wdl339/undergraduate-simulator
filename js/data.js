// js/data.js

const GameData = {
    difficulties: {
        normal: { id: "normal", name: "正常大学", reqCredits: 160, rankDiff: 0, reqRank: 0.15, quitGPA: 1.5 },
        project985: { id: "project985", name: "985高校", reqCredits: 200, rankDiff: 2, reqRank: 0.30, quitGPA: 2.0 },
        top2: { id: "top2", name: "清北学府", reqCredits: 240, rankDiff: 4, reqRank: 0.40, quitGPA: 2.5 },
    },
    personalities: {
        average: { id: "average", name: "平平无奇", statsModifier: 10, regularMoney: 2000 },
        gifted: { id: "gifted", name: "天赋异禀", statsModifier: 14, regularMoney: 2000 },
        frail: { id: "frail", name: "弱不禁风", statsModifier: 5, regularMoney: 2000 },
    },
    attributes: [
        { key: "knowledge", name: "知识水平", icon: "📚", max: 20, category: "basic" },
        { key: "skills", name: "技能水平", icon: "💻", max: 20, category: "basic" },
        { key: "physHealth", name: "身体健康", icon: "💪", max: 20, critical: 6, category: "basic" },
        { key: "mentalHealth", name: "心理健康", icon: "🧠", max: 20, critical: 6, category: "basic" },
        { key: "social", name: "社交水平", icon: "🤝", max: 20, category: "basic" },
        { key: "money", name: "钱包余额", icon: "💰", max: null, category: "basic" },

        // 学业属性
        { key: "gpa", name: "GPA", icon: "💯", max: 4.0, category: "academic",
            desc: "GPA = ∑（课程学分绩点 × 取得的课程学分）/ ∑修读课程学分，绩点与知识水平和投入学习的精力相关。GPA 是评奖学金的标准之一。GPA 过低将会被退学" },
        { key: "credits", name: "已修学分", icon: "🎓", max: null, category: "academic" }, // max将在逻辑中动态获取
        { key: "labor", name: "劳动学时", icon: "🧹", max: 20, category: "academic" },
        { key: "suTuo", name: "素拓分数", icon: "🌟", max: null, category: "academic",
            desc: "素拓也是评奖学金的标准之一，每学年初始重置为0" }
    ],
    timeStructure: {
        totalPhases: 32,
        subPhases: [
            { name: "第 1 学期-开学", isClass: true },
            { name: "第 1 学期-期中", isClass: true },
            { name: "第 1 学期-期末", isClass: true },
            { name: "寒假", isClass: false },
            { name: "第 2 学期-开学", isClass: true },
            { name: "第 2 学期-期中", isClass: true },
            { name: "第 2 学期-期末", isClass: true },
            { name: "暑假", isClass: false }
        ]
    },
    goals: {
        gradSchool: {
            id: 'gradSchool', name: '保研深造',
            req: { knowledge: 16, skills: 10, gpa: 3.6, labor: 20 },
            require_rank: true,
            desc: "立志钻研学术，争取免试攻读研究生"
        },
        job: {
            id: 'job', name: '直接就业',
            req: { skills: 16, social: 10, labor: 20 },
            require_rank: false,
            desc: "积累实习经验，毕业冲刺高薪Offer"
        }
    },
    shopItems: [
        { id: 'book', name: '专业书籍', cost: 500, type: 'consumable', effect: { knowledge: 0.5 }, desc: "知识水平+0.5" },
        { id: 'consulting', name: '心理咨询', cost: 800, type: 'consumable', effect: { mentalHealth: 1.5}, desc: "心理健康+1.5" },
        { id: 'gym_card', name: '羽毛球教学', cost: 900, type: 'consumable', effect: { physHealth: 3}, desc: "身体健康+3" },
        { id: 'concert', name: '演唱会', cost: 1500, type: 'consumable', effect: { mentalHealth: 2, social: 1 }, desc: "心理健康+2，社交水平+1" },
        { id: 'travel', name: '短途旅行', cost: 2000, type: 'consumable', effect: { mentalHealth: 2, physHealth: 1, skills: 1 }, desc: "心理健康+2，身体健康+1，技能水平+1" },
        { id: 'coffee_machine', name: '咖啡机', cost: 2000, type: 'permanent', effect: { energyMax: 10 }, desc: "精力上限+10 (永久, 限购1次)" },
        { id: 'laptop', name: '高性能笔记本', cost: 3500, type: 'permanent', effect: { skillBonus: 0.15 }, desc: "技能水平的获取效率提升15% (永久, 限购1次)" }
    ],
    projects: [
        {
            id: 'club', name: '社团活动', duration: 2,
            req: { social: 9 },
            costPerTurn: { physHealth: 0.5, money: 250, knowledge: 0.3 },
            reward: { social: 1, mentalHealth: 1, knowledge: 0.6, labor: 3 }
        },
        {
            id: 'volunteer', name: '志愿服务', duration: 2,
            req: { skills: 9 },
            costPerTurn: { physHealth: 1, },
            reward: { mentalHealth: 1.5, labor: 4, suTuo: 1  }
        },
        {
            id: 'competition', name: '学科竞赛', duration: 3,
            req: { knowledge: 12, skills: 12 },
            costPerTurn: { physHealth: 0.5, mentalHealth: 1 },
            reward: { suTuo: 2, skills: 2, knowledge: 2, labor: 5 }
        },
        {
            id: 'work', name: '勤工俭学', duration: 3,
            req: { skills: 12, mentalHealth: 10 },
            costPerTurn: { physHealth: 0.5, social: 0.5 },
            reward: { skills: 1.5, labor: 6 }
        },
        {
            id: 'research', name: '进组科研', duration: 4,
            req: { knowledge: 15, gpa: 3.6 },
            costPerTurn: { physHealth: 1, mentalHealth: 1 },
            reward: { knowledge: 3.5, suTuo: 3 }
        },
        {
            id: 'internship', name: '大厂实习', duration: 4,
            req: { social: 8, skills: 13 },
            costPerTurn: { physHealth: 1, mentalHealth: 0.5, social: 0.5 },
            reward: { money: 3000, skills: 3, mentalHealth: 2 }
        },
        {
            id: 'exchange', name: '出国交换', duration: 4,
            req: { gpa: 3.7, money: 3000 },
            costPerTurn: { money: 500 },
            reward: { knowledge: 3, social: 2, mentalHealth: 2 }
        },
        {
            id: 'dating', name: '谈恋爱', duration: 5,
            req: { social: 12, money: 3000 },
            costPerTurn: { money: 400, skills: 0.25, knowledge: 0.25 },
            reward: { mentalHealth: 4, social: 5, physHealth: 1 }
        }
    ],
    events: [
        {
            text: "某门课程的安排不合理，作业量太大，同学们怨声载道。有同学在课程群里直接表达不满：",
            options: [
                { text: "跟风起哄", effect: [ { social: 1, mentalHealth: 2 }, { knowledge: -0.5 } ] },
                { text: "静观其变", effect: { knowledge: -0.5 } },
                { text: "替老师说好话", effect: [{ knowledge: 1, social: -6 }, { social: 1 }] }
            ]
        },
        {
            text: "你发现了竞争对手伪造志愿时长的证据：",
            options: [
                { text: "直接举报！", effect: [ { mentalHealth: 2 }, { social: -0.5 }, { suTuo: 0.3 } ] },
                { text: "向他学习", effect: [{ skills: 0.5 }, {suTuo: -0.5}] },
            ]
        },
        {
            text: "学院组织同学们开展义务劳动，自愿报名：",
            options: [
                { text: "当然要报名", effect: [ { labor: 3 }, { suTuo: 0.3 } ] },
                { text: "学习更重要", effect: { knowledge: 0.1} },
            ]
        },
        {
            text: "室友邀请你通宵打游戏，你决定：",
            options: [
                { text: "加入他们", effect: [ { social: 2, physHealth: -2 }, { physHealth: -1, knowledge: -0.5 } ] },
                { text: "拒绝并睡觉", effect: { social: -1, physHealth: 1 } },
                { text: "起来卷高数", effect: { knowledge: 1, physHealth: -1, social: -1 } }
            ]
        },
        {
            text: "突发流感，身边的同学陆续中招，你也感觉喉咙不舒服：",
            options: [
                { text: "去校医院", effect: { money: -100 } },
                { text: "去附近的三甲医院", effect: { money: -300, physHealth: 1.5 } },
                { text: "硬抗", effect: { physHealth: -3 } }
            ]
        },
        {
            text: "在路上捡到一张校园卡：",
            options: [
                { text: "想办法还给失主", effect: [{ social: 1, suTuo: 0.3 }, { money: 100 }] },
                { text: "不管它", effect: {} }
            ]
        }
    ]
};