// js/data.js

const GameData = {
    difficulties: {
        normal: { id: "normal", name: "正常大学", baseCredit: 20, reqCredits: 160, rankDiff: 0, reqRank: 0.15 },
    //     project985: { id: "project985", name: "985高校", baseCredit: 24, reqCredits: 170, rankDiff: 0.3, reqRank: 0.30 },
    //     top2: { id: "top2", name: "清北学府", baseCredit: 28, reqCredits: 180, rankDiff: 0.6, reqRank: 0.40 }
    },
    personalities: {
        average: { id: "average", name: "平平无奇", statsModifier: 10, regularMoney: 2000 },
        gifted: { id: "gifted", name: "天赋异禀", statsModifier: 15, regularMoney: 2000 },
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
        { key: "gpa", name: "GPA", icon: "💯", max: 4.0, category: "academic" },
        { key: "credits", name: "已修学分", icon: "🎓", max: null, category: "academic" }, // max将在逻辑中动态获取
        { key: "suTuo", name: "素拓分数", icon: "🌟", max: null, category: "academic" },
        { key: "labor", name: "劳动学时", icon: "🧹", max: 20, category: "academic" }
    ],
    timeStructure: {
        totalPhases: 32,
        subPhases: [
            { name: "第1学期-开学", isClass: true },
            { name: "第1学期-期中", isClass: true },
            { name: "第1学期-期末", isClass: true },
            { name: "寒假", isClass: false },
            { name: "第2学期-开学", isClass: true },
            { name: "第2学期-期中", isClass: true },
            { name: "第2学期-期末", isClass: true },
            { name: "暑假", isClass: false }
        ]
    },
    goals: {
        gradSchool: {
            id: 'gradSchool', name: '保研深造',
            req: { knowledge: 16, skills: 10, gpa: 3.6, labor: 20 },
            require_rank: true,
            desc: "成为学术大佬，免试攻读研究生"
        },
        job: {
            id: 'job', name: '直接就业',
            req: { skills: 16, social: 10, labor: 20 },
            require_rank: false,
            desc: "积累实习经验，毕业即拿高薪Offer"
        }
    },
    shopItems: [
        { id: 'book', name: '专业书籍', cost: 200, type: 'consumable', effect: { knowledge: 1.5 }, desc: "知识水平+1.5" },
        { id: 'gym_card', name: '健身卡', cost: 500, type: 'consumable', effect: { physHealth: 3, mentalHealth: 1 }, desc: "身体健康+3, 心理健康+1" },
        { id: 'consulting', name: '心理咨询', cost: 800, type: 'consumable', effect: { mentalHealth: 5 }, desc: "心理健康+5" },
        { id: 'coffee_machine', name: '咖啡机', cost: 1500, type: 'permanent', effect: { energyMax: 20 }, desc: "精力上限+20 (永久, 限购1次)" },
        { id: 'laptop', name: '高性能笔记本', cost: 3000, type: 'permanent', effect: { skillBonus: 0.2 }, desc: "实习效率提升20% (永久, 限购1次)" }
    ],
    projects: [
        {
            id: 'competition', name: '学科竞赛', duration: 3,
            req: { knowledge: 12 },
            costPerTurn: { mentalHealth: 0.5 },
            reward: { suTuo: 2, skills: 1, knowledge: 1 },
            desc: "参加全国大学生竞赛"
        },
        {
            id: 'research', name: '进组科研', duration: 4,
            req: { knowledge: 15, gpa: 3.3 },
            costPerTurn: { physHealth: 0.5 },
            reward: { knowledge: 3, skills: 2, suTuo: 1 },
            desc: "给导师打工"
        },
        {
            id: 'dating', name: '谈恋爱', duration: 5,
            req: { social: 12, money: 1000 },
            costPerTurn: { money: 200},
            reward: { mentalHealth: 5, social: 3 },
            desc: "甜甜的恋爱，消耗金钱但治愈心灵"
        },
        {
            id: 'internship', name: '大厂实习', duration: 4,
            req: { skills: 10 },
            costPerTurn: { physHealth: 1 },
            reward: { money: 3000, skills: 3 },
            desc: "大厂996，累但搞钱快"
        }
    ],
    events: [
        {
            text: "室友邀请你通宵开黑，你决定：",
            options: [
                { text: "加入他们", effect: { social: 2, physHealth: -2, knowledge: -0.5 } },
                { text: "拒绝并睡觉", effect: { mentalHealth: -0.5, physHealth: 1 } },
                { text: "起来卷高数", effect: { knowledge: 1, physHealth: -1, social: -1 } }
            ]
        },
        {
            text: "突发流感，你感觉喉咙不舒服：",
            options: [
                { text: "立刻去校医院", effect: { money: -100, physHealth: 1 } },
                { text: "硬抗", effect: { physHealth: -3, mentalHealth: -1 } }
            ]
        },
        {
            text: "路上捡到一张校园卡：",
            options: [
                { text: "想办法还给失主", effect: { social: 1, suTuo: 0.5 } },
                { text: "不管它", effect: {} }
            ]
        }
    ]
};