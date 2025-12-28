#!/usr/bin/env tsx
/**
 * E2E 测试运行器
 *
 * 这个脚本生成测试执行指令，供 Claude Code 会话执行。
 *
 * 用法:
 *   npm run test:e2e              - 运行所有 E2E 测试
 *   npm run test:e2e:update       - 更新截图基准
 *   npm run test:review           - 多页面审查
 *   npm run test:review:baseline  - 设置审查基准
 */

import { DemoTestSuite, generateTestInstructions } from './tests';
import { REVIEW_PAGES, config } from './config';
import { TestHelpers } from './utils/playwright-mcp';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 命令行参数
 */
const args = process.argv.slice(2);
const isUpdateSnapshots = args.includes('--update-snapshots');
const isReview = args.includes('--review');
const isBaseline = args.includes('--baseline');

/**
 * 确保目录存在
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 运行 E2E 测试
 */
function runE2ETests(): void {
  console.log('\n🧪 E2E 测试执行指南\n');
  console.log('='.repeat(60));

  if (isUpdateSnapshots) {
    console.log('⚠️  更新模式：将更新所有截图基准\n');
  }

  console.log(`测试套件: ${DemoTestSuite.name}`);
  console.log(`测试数量: ${DemoTestSuite.tests.length}`);
  console.log('');

  // 确保目录存在
  ensureDir(config.snapshotsDir);
  ensureDir(`${config.reportsDir}/screenshots`);

  // 生成每个测试的执行指令
  for (const test of DemoTestSuite.tests) {
    console.log('='.repeat(60));
    const instructions = generateTestInstructions(test);
    console.log(instructions.join('\n'));
  }

  console.log('='.repeat(60));
  console.log('\n📋 执行说明:\n');
  console.log('在 Claude Code 会话中，请依次执行上述 MCP 命令。');
  console.log('每个测试完成后，检查截图是否符合预期。\n');

  if (isUpdateSnapshots) {
    console.log('更新基准：将截图复制到 e2e/snapshots/ 目录\n');
  }
}

/**
 * 多页面审查
 */
function runReview(): void {
  console.log('\n📸 多页面审查\n');
  console.log('='.repeat(60));

  if (isBaseline) {
    console.log('⚠️  基准模式：将设置审查基准\n');
    ensureDir(config.baselineDir);
  }

  ensureDir(`${config.reportsDir}/screenshots`);

  console.log(`审查页面数: ${REVIEW_PAGES.length}\n`);

  for (let i = 0; i < REVIEW_PAGES.length; i++) {
    const page = REVIEW_PAGES[i];
    console.log(`\n### 页面 ${i + 1}: ${page.name}`);
    console.log(`描述: ${page.description || 'N/A'}`);
    console.log(`URL: ${page.url}`);
    console.log(`视口: ${page.viewport.width}x${page.viewport.height}`);
    console.log('');
    console.log('执行步骤:');
    console.log(`1. browser_resize({ width: ${page.viewport.width}, height: ${page.viewport.height} })`);
    console.log(`2. browser_navigate({ url: "${page.url}" })`);
    console.log(`3. browser_wait_for({ time: ${page.waitFor.time || 2} })`);

    const screenshotPath = isBaseline
      ? `${config.baselineDir}/${page.name}.png`
      : `${config.reportsDir}/screenshots/${page.name}.png`;
    console.log(`4. browser_take_screenshot({ filename: "${screenshotPath}" })`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 审查完成后:\n');
  console.log('1. 检查 e2e/reports/screenshots/ 目录中的截图');
  console.log('2. 运行 generate-report 生成 HTML 报告');

  if (isBaseline) {
    console.log('3. 基准截图已保存到 e2e/reports/baseline/');
  }

  console.log('');
}

/**
 * 生成审查报告
 */
function generateReviewReport(): void {
  const screenshotsDir = `${config.reportsDir}/screenshots`;
  const baselineDir = config.baselineDir;
  const reportPath = `${config.reportsDir}/review-report.html`;

  // 获取截图列表
  const screenshots = fs.existsSync(screenshotsDir)
    ? fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'))
    : [];

  const baselines = fs.existsSync(baselineDir)
    ? fs.readdirSync(baselineDir).filter(f => f.endsWith('.png'))
    : [];

  // 生成 HTML 报告
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>多页面审查报告</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    h1 { text-align: center; margin-bottom: 20px; color: #333; }
    .timestamp { text-align: center; color: #666; margin-bottom: 30px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 20px; }
    .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .card-header { padding: 15px; background: #f8f8f8; border-bottom: 1px solid #eee; }
    .card-header h3 { font-size: 16px; color: #333; }
    .card-header .url { font-size: 12px; color: #666; word-break: break-all; }
    .card-body { padding: 10px; }
    .card-body img { width: 100%; height: auto; border-radius: 8px; }
    .compare { display: flex; gap: 10px; }
    .compare > div { flex: 1; }
    .compare label { display: block; text-align: center; font-size: 12px; color: #666; margin-bottom: 5px; }
    .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .status.new { background: #e3f2fd; color: #1976d2; }
    .status.diff { background: #fff3e0; color: #f57c00; }
    .status.same { background: #e8f5e9; color: #388e3c; }
    .no-baseline { color: #999; font-style: italic; text-align: center; padding: 50px; }
  </style>
</head>
<body>
  <h1>🔍 多页面审查报告</h1>
  <p class="timestamp">生成时间: ${new Date().toLocaleString('zh-CN')}</p>

  <div class="grid">
    ${screenshots.map(screenshot => {
      const name = screenshot.replace('.png', '');
      const pageConfig = REVIEW_PAGES.find(p => p.name === name);
      const hasBaseline = baselines.includes(screenshot);

      return `
    <div class="card">
      <div class="card-header">
        <h3>${name} <span class="status ${hasBaseline ? 'same' : 'new'}">${hasBaseline ? '有基准' : '新增'}</span></h3>
        ${pageConfig ? `<p class="url">${pageConfig.url}</p>` : ''}
      </div>
      <div class="card-body">
        ${hasBaseline ? `
        <div class="compare">
          <div>
            <label>基准</label>
            <img src="baseline/${screenshot}" alt="baseline">
          </div>
          <div>
            <label>当前</label>
            <img src="screenshots/${screenshot}" alt="current">
          </div>
        </div>
        ` : `
        <img src="screenshots/${screenshot}" alt="${name}">
        `}
      </div>
    </div>
      `;
    }).join('')}

    ${screenshots.length === 0 ? '<p class="no-baseline">暂无截图，请先运行审查</p>' : ''}
  </div>
</body>
</html>`;

  fs.writeFileSync(reportPath, html);
  console.log(`\n📄 报告已生成: ${reportPath}\n`);
}

/**
 * 主函数
 */
function main(): void {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           灯笼叶子消消乐 - E2E 测试系统                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  if (isReview) {
    runReview();
    if (!isBaseline && fs.existsSync(`${config.reportsDir}/screenshots`)) {
      generateReviewReport();
    }
  } else {
    runE2ETests();
  }
}

main();
