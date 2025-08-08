
        const cardEffectData = {
          "description": "抵擋一次攻擊或【魔彈】。",
          "triggers": [
            {
              "type": "on_attack_or_magic_bullet",
              "conditions": [],
              "effect": {
                "action": "negate_damage",
                "target": "self",
                "time_point": 4,
                "icons": ["抵擋"]
              }
            }
          ]
        };

        module.exports = cardEffectData; // 如果是 Node.js 環境
        // 或者 export default cardEffectData; // 如果是 ES Modules 環境
        