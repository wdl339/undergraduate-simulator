// js/data.js

const GameData = {
    info: {
        title: "本科生模拟器",
        objective: "目标：度过美好的大学生活，保持身心健康，刷高GPA，积累素拓与劳动学时。",
        author: "339摸鱼中"
    },
    difficulties: {
        normal: { id: "normal", name: "正常大学", desc: "学分安排合理，保研率 10%", multiplier: 1.0, baseCredit: 20 },
        project985: { id: "project985", name: "985高校", desc: "课程紧凑，大佬云集，保研率 30%", multiplier: 1.2, baseCredit: 24 },
        top2: { id: "top2", name: "清北学府", desc: "地狱难度，内卷之王，保研率 40%", multiplier: 1.5, baseCredit: 28 }
    },
    personalities: {
        average: { id: "average", name: "平平无奇", desc: "均衡发展", statsModifier: 10 },
        gifted: { id: "gifted", name: "天赋异禀", desc: "初始能力较高", statsModifier: 15 },
        frail: { id: "frail", name: "弱不禁风", desc: "体质较差", statsModifier: 5 }
    },
    // 属性定义更新
    attributes: [
        // === 个人状态 (category: 'basic') ===
        { key: "knowledge", name: "知识水平", icon: "📚", max: 20, desc: "决定考试成绩上限。", category: "basic" },
        { key: "skills", name: "技能水平", icon: "💻", max: 20, desc: "影响实习产出与科研。", category: "basic" },
        { key: "physHealth", name: "身体健康", icon: "💪", max: 20, desc: "过低会每回合扣除属性。", critical: 6, category: "basic" },
        { key: "mentalHealth", name: "心理健康", icon: "🧠", max: 20, desc: "过低会每回合扣除属性。", critical: 6, category: "basic" },
        { key: "social", name: "社交水平", icon: "🤝", max: 20, desc: "影响人脉与机会。", category: "basic" },
        { key: "money", name: "钱包余额", icon: "💰", max: null, desc: "生活经费。", category: "basic" },

        // === 学业情况 (category: 'academic') ===
        { key: "gpa", name: "GPA", icon: "💯", max: 4.0, desc: "加权平均分，保研核心指标。", category: "academic" },
        { key: "suTuo", name: "素拓分", icon: "🌟", max: null, desc: "每学年重置，奖学金评定依据。", category: "academic" },
        { key: "labor", name: "劳动学时", icon: "🧹", max: 20, desc: "毕业硬性指标，需满20学时。", category: "academic" }
        // 注意：“已修学分”不是一个基础属性，它是一个统计值，我们在UI里单独处理
    ],
    // 时间配置
    timeStructure: {
        totalPhases: 32, // 4年 * 8阶段
        phasesPerYear: 8,
        phaseNames: ["大一", "大二", "大三", "大四"],
        subPhases: [
            "第一学期-开学", "第一学期-期中", "第一学期-期末", "寒假",
            "第二学期-开学", "第二学期-期中", "第二学期-期末", "暑假"
        ]
    },
    // 随机情境题库 (示例)
    events: [
        {
            text: "室友半夜两点还在打游戏大喊大叫，你选择：",
            options: [
                { text: "加入他们", effect: { social: 2, physHealth: -2, knowledge: -1 } },
                { text: "戴耳塞睡觉", effect: { mentalHealth: -1, physHealth: 1 } },
                { text: "不仅不睡，还起来卷高数", effect: { knowledge: 2, physHealth: -2, mentalHealth: -1, social: -1 } }
            ]
        },
        {
            text: "某社团招新，学长热情地向你推销，你决定：",
            options: [
                { text: "参加并积极干活", effect: { suTuo: 2, social: 1, money: -200 } },
                { text: "参加但在里面划水", effect: { suTuo: 0.5, social: 1 } },
                { text: "拒绝，我要学习", effect: { knowledge: 1, social: -1 } }
            ]
        },
        {
            text: "食堂推出了这一季的新品‘辣椒炒月饼’，只要5元，你：",
            options: [
                { text: "尝尝鲜", effect: { money: -5, physHealth: -2, mentalHealth: 1 } },
                { text: "点外卖（30元）", effect: { money: -30, physHealth: 1 } },
                { text: "不吃了，减肥", effect: { physHealth: -1, mentalHealth: -1 } }
            ]
        },
        // 可继续扩展...
    ]
};