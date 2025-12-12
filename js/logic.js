// js/logic.js

const GameState = {
    player: {
        difficulty: null,
        personality: null,
        stats: {}
    },

    // 初始化游戏
    init: function(difficultyKey, personalityKey) {
        this.player.difficulty = GameData.difficulties[difficultyKey];
        this.player.personality = GameData.personalities[personalityKey];

        const baseVal = this.player.personality.statsModifier;

        // 初始化各项数值
        GameData.attributes.forEach(attr => {
            if (attr.key === 'money') {
                this.player.stats[attr.key] = 1000; // 初始资金
            } else {
                this.player.stats[attr.key] = baseVal;
            }
        });

        console.log("游戏初始化完成", this.player);
    },

    // 获取当前属性值
    getStat: function(key) {
        return this.player.stats[key];
    },

    // 获取当前属性相对于最大值的百分比 (用于进度条)
    getStatPercent: function(key) {
        const attr = GameData.attributes.find(a => a.key === key);
        if (!attr || !attr.max) return 100; // 比如金钱没有进度条
        return Math.min(100, Math.max(0, (this.player.stats[key] / attr.max) * 100));
    }
};