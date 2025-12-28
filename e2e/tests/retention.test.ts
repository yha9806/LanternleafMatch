/**
 * 留存系统 E2E 测试
 *
 * 测试连胜系统和预置道具选择流程
 */

import { TestDefinition, TestStep } from './demo.test';

/**
 * 1.4.2 连胜流程测试
 */
export const WinStreakTestSuite = {
  name: '连胜系统测试',

  tests: [
    // 测试 1: 连胜计数器显示
    {
      name: 'streak-counter-display',
      description: '验证连胜计数器正确显示',
      steps: [
        {
          action: 'navigate',
          description: '打开留存系统演示页面',
          params: { url: 'http://127.0.0.1:8080/retention-demo.html' }
        },
        {
          action: 'snapshot',
          description: '获取页面快照',
          assertions: [{ type: 'snapshot', expected: 'streak-counter' }]
        },
        {
          action: 'evaluate',
          description: '验证连胜计数器存在',
          params: {
            script: `document.querySelector('.streak-counter') !== null`
          },
          assertions: [{ type: 'evaluate', expected: true }]
        }
      ]
    },

    // 测试 2: 模拟通关增加连胜
    {
      name: 'streak-increment',
      description: '验证通关后连胜正确增加',
      steps: [
        {
          action: 'navigate',
          description: '打开留存系统演示页面',
          params: { url: 'http://127.0.0.1:8080/retention-demo.html' }
        },
        {
          action: 'click',
          description: '点击模拟通关按钮',
          params: { selector: '[data-action="simulate-win"]' }
        },
        {
          action: 'wait',
          description: '等待动画完成',
          params: { timeout: 1000 }
        },
        {
          action: 'evaluate',
          description: '验证连胜数增加',
          params: {
            script: `parseInt(document.querySelector('.streak-count')?.textContent || '0') > 0`
          },
          assertions: [{ type: 'evaluate', expected: true }]
        }
      ]
    },

    // 测试 3: 连胜奖励弹窗
    {
      name: 'streak-rewards-modal',
      description: '验证连胜奖励弹窗正确显示',
      steps: [
        {
          action: 'navigate',
          description: '打开留存系统演示页面',
          params: { url: 'http://127.0.0.1:8080/retention-demo.html' }
        },
        {
          action: 'click',
          description: '点击模拟通关按钮',
          params: { selector: '[data-action="simulate-win"]' }
        },
        {
          action: 'snapshot',
          description: '验证奖励弹窗显示',
          assertions: [{ type: 'snapshot', expected: 'rewards-modal' }]
        },
        {
          action: 'screenshot',
          description: '截取奖励弹窗截图',
          params: { filename: 'streak-rewards.png' }
        }
      ]
    },

    // 测试 4: 连胜失败与复活
    {
      name: 'streak-loss-revival',
      description: '验证连胜失败和复活选项',
      steps: [
        {
          action: 'navigate',
          description: '打开留存系统演示页面',
          params: { url: 'http://127.0.0.1:8080/retention-demo.html' }
        },
        {
          action: 'evaluate',
          description: '设置连胜为 5',
          params: { script: `setStreakLevel && setStreakLevel(5)` }
        },
        {
          action: 'click',
          description: '点击模拟失败按钮',
          params: { selector: '[data-action="simulate-lose"]' }
        },
        {
          action: 'snapshot',
          description: '验证复活选项弹窗',
          assertions: [{ type: 'snapshot', expected: 'revival-modal' }]
        }
      ]
    },

    // 测试 5: 里程碑奖励 (5连胜)
    {
      name: 'streak-milestone-5',
      description: '验证 5 连胜里程碑奖励',
      steps: [
        {
          action: 'navigate',
          description: '打开留存系统演示页面',
          params: { url: 'http://127.0.0.1:8080/retention-demo.html' }
        },
        {
          action: 'evaluate',
          description: '设置连胜为 4',
          params: { script: `setStreakLevel && setStreakLevel(4)` }
        },
        {
          action: 'click',
          description: '点击模拟通关触发 5 连胜',
          params: { selector: '[data-action="simulate-win"]' }
        },
        {
          action: 'wait',
          description: '等待庆祝动画',
          params: { timeout: 1500 }
        },
        {
          action: 'snapshot',
          description: '验证里程碑庆祝效果',
          assertions: [{ type: 'snapshot', expected: 'milestone-celebration' }]
        }
      ]
    }
  ]
};

/**
 * 2.4.2 预置道具选择流程测试
 */
export const PreBoosterTestSuite = {
  name: '预置道具系统测试',

  tests: [
    // 测试 1: 道具选择界面显示
    {
      name: 'booster-selection-ui',
      description: '验证道具选择界面正确显示',
      steps: [
        {
          action: 'navigate',
          description: '打开留存系统演示页面',
          params: { url: 'http://127.0.0.1:8080/retention-demo.html' }
        },
        {
          action: 'click',
          description: '切换到道具选择标签',
          params: { selector: '[data-tab="boosters"]' }
        },
        {
          action: 'snapshot',
          description: '验证道具选择界面',
          assertions: [{ type: 'snapshot', expected: 'booster-selection' }]
        }
      ]
    },

    // 测试 2: 选择道具
    {
      name: 'booster-select',
      description: '验证道具选择功能',
      steps: [
        {
          action: 'navigate',
          description: '打开留存系统演示页面',
          params: { url: 'http://127.0.0.1:8080/retention-demo.html' }
        },
        {
          action: 'click',
          description: '切换到道具选择标签',
          params: { selector: '[data-tab="boosters"]' }
        },
        {
          action: 'click',
          description: '选择火箭道具',
          params: { selector: '[data-booster="rocket"]' }
        },
        {
          action: 'evaluate',
          description: '验证道具已选中',
          params: {
            script: `document.querySelector('[data-booster="rocket"]').classList.contains('selected')`
          },
          assertions: [{ type: 'evaluate', expected: true }]
        }
      ]
    },

    // 测试 3: 道具价格显示
    {
      name: 'booster-prices',
      description: '验证道具价格正确显示',
      steps: [
        {
          action: 'navigate',
          description: '打开留存系统演示页面',
          params: { url: 'http://127.0.0.1:8080/retention-demo.html' }
        },
        {
          action: 'click',
          description: '切换到道具选择标签',
          params: { selector: '[data-tab="boosters"]' }
        },
        {
          action: 'evaluate',
          description: '验证价格标签存在',
          params: {
            script: `document.querySelectorAll('.booster-price').length > 0`
          },
          assertions: [{ type: 'evaluate', expected: true }]
        }
      ]
    },

    // 测试 4: 免费道具标记 (连胜奖励)
    {
      name: 'booster-free-badge',
      description: '验证连胜免费道具标记',
      steps: [
        {
          action: 'navigate',
          description: '打开留存系统演示页面',
          params: { url: 'http://127.0.0.1:8080/retention-demo.html' }
        },
        {
          action: 'evaluate',
          description: '设置连胜为 5 (获得免费道具)',
          params: { script: `setStreakLevel && setStreakLevel(5)` }
        },
        {
          action: 'click',
          description: '切换到道具选择标签',
          params: { selector: '[data-tab="boosters"]' }
        },
        {
          action: 'snapshot',
          description: '验证免费标记显示',
          assertions: [{ type: 'snapshot', expected: 'free-badge' }]
        }
      ]
    },

    // 测试 5: 开始关卡确认
    {
      name: 'booster-start-level',
      description: '验证选择道具后开始关卡',
      steps: [
        {
          action: 'navigate',
          description: '打开留存系统演示页面',
          params: { url: 'http://127.0.0.1:8080/retention-demo.html' }
        },
        {
          action: 'click',
          description: '切换到道具选择标签',
          params: { selector: '[data-tab="boosters"]' }
        },
        {
          action: 'click',
          description: '选择道具',
          params: { selector: '[data-booster="rocket"]' }
        },
        {
          action: 'click',
          description: '点击开始关卡',
          params: { selector: '[data-action="start-level"]' }
        },
        {
          action: 'snapshot',
          description: '验证游戏开始',
          assertions: [{ type: 'snapshot', expected: 'game-started' }]
        }
      ]
    }
  ]
};

/**
 * 导出所有测试套件
 */
export const RetentionTestSuites = {
  winStreak: WinStreakTestSuite,
  preBooster: PreBoosterTestSuite
};

/**
 * 测试执行指南
 *
 * 这些测试通过 Playwright MCP 工具执行：
 *
 * 1. 确保 demo 服务器运行: npx http-server demo -p 8080
 * 2. 在 Claude Code 中使用 Playwright MCP 工具执行测试
 * 3. 测试结果会保存到 e2e/reports/
 *
 * 示例执行流程:
 * - mcp__browser_navigate({ url: 'http://127.0.0.1:8080/retention-demo.html' })
 * - mcp__browser_snapshot()
 * - mcp__browser_click({ element: '...', ref: '...' })
 * - mcp__browser_evaluate({ function: '...' })
 */
