#!/usr/bin/env tsx
/**
 * 审查报告生成器
 *
 * 生成 HTML 格式的多页面审查报告。
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { REVIEW_PAGES } from './pages.config';

/**
 * 报告数据
 */
interface ReportData {
  timestamp: string;
  pages: PageReportData[];
  summary: {
    total: number;
    hasBaseline: number;
    new: number;
  };
}

interface PageReportData {
  name: string;
  description: string;
  url: string;
  viewport: { width: number; height: number };
  screenshotPath: string;
  baselinePath: string | null;
  hasBaseline: boolean;
}

/**
 * 收集报告数据
 */
function collectReportData(): ReportData {
  const screenshotsDir = `${config.reportsDir}/screenshots`;
  const baselineDir = config.baselineDir;

  const pages: PageReportData[] = REVIEW_PAGES.map(page => {
    const screenshotPath = `screenshots/${page.name}.png`;
    const baselinePath = `baseline/${page.name}.png`;
    const hasBaseline = fs.existsSync(`${config.reportsDir}/${baselinePath}`);

    return {
      name: page.name,
      description: page.description || '',
      url: page.url,
      viewport: page.viewport,
      screenshotPath,
      baselinePath: hasBaseline ? baselinePath : null,
      hasBaseline,
    };
  });

  return {
    timestamp: new Date().toISOString(),
    pages,
    summary: {
      total: pages.length,
      hasBaseline: pages.filter(p => p.hasBaseline).length,
      new: pages.filter(p => !p.hasBaseline).length,
    },
  };
}

/**
 * 生成 HTML 报告
 */
function generateHTML(data: ReportData): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>多页面审查报告 - 灯笼叶子消消乐</title>
  <style>
    :root {
      --primary: #4a7c59;
      --bg: #f8f9fa;
      --card-bg: #ffffff;
      --text: #333333;
      --text-light: #666666;
      --border: #e0e0e0;
      --success: #4caf50;
      --warning: #ff9800;
      --info: #2196f3;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 2px solid var(--primary);
      margin-bottom: 30px;
    }

    header h1 {
      color: var(--primary);
      font-size: 28px;
      margin-bottom: 10px;
    }

    header .subtitle {
      color: var(--text-light);
      font-size: 14px;
    }

    .summary {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-bottom: 30px;
    }

    .summary-item {
      background: var(--card-bg);
      padding: 20px 30px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      text-align: center;
    }

    .summary-item .number {
      font-size: 36px;
      font-weight: bold;
      color: var(--primary);
    }

    .summary-item .label {
      font-size: 14px;
      color: var(--text-light);
    }

    .controls {
      display: flex;
      justify-content: center;
      gap: 15px;
      margin-bottom: 30px;
    }

    .controls button {
      padding: 10px 20px;
      border: 2px solid var(--primary);
      background: transparent;
      color: var(--primary);
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .controls button:hover {
      background: var(--primary);
      color: white;
    }

    .controls button.active {
      background: var(--primary);
      color: white;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
      gap: 25px;
    }

    .card {
      background: var(--card-bg);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    }

    .card-header {
      padding: 20px;
      background: linear-gradient(135deg, var(--primary), #5d9b6e);
      color: white;
    }

    .card-header h3 {
      font-size: 18px;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .card-header .badge {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255,255,255,0.2);
    }

    .card-header .badge.new {
      background: var(--info);
    }

    .card-header .badge.baseline {
      background: var(--success);
    }

    .card-header .meta {
      font-size: 12px;
      opacity: 0.9;
    }

    .card-body {
      padding: 15px;
    }

    .screenshot-container {
      position: relative;
      background: #f0f0f0;
      border-radius: 8px;
      overflow: hidden;
    }

    .screenshot-container img {
      width: 100%;
      height: auto;
      display: block;
    }

    .compare-view {
      display: none;
    }

    .compare-view.active {
      display: flex;
      gap: 10px;
    }

    .compare-view .side {
      flex: 1;
    }

    .compare-view .label {
      text-align: center;
      font-size: 12px;
      color: var(--text-light);
      margin-bottom: 5px;
    }

    .single-view.hidden {
      display: none;
    }

    .card-footer {
      padding: 15px 20px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-light);
    }

    .card-footer .url {
      word-break: break-all;
    }

    .no-screenshot {
      padding: 60px;
      text-align: center;
      color: var(--text-light);
      font-style: italic;
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr;
      }

      .summary {
        flex-direction: column;
        align-items: center;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🔍 多页面审查报告</h1>
      <p class="subtitle">灯笼叶子消消乐 | 生成时间: ${new Date(data.timestamp).toLocaleString('zh-CN')}</p>
    </header>

    <div class="summary">
      <div class="summary-item">
        <div class="number">${data.summary.total}</div>
        <div class="label">总页面数</div>
      </div>
      <div class="summary-item">
        <div class="number">${data.summary.hasBaseline}</div>
        <div class="label">有基准</div>
      </div>
      <div class="summary-item">
        <div class="number">${data.summary.new}</div>
        <div class="label">新增</div>
      </div>
    </div>

    <div class="controls">
      <button id="btn-single" class="active">单图视图</button>
      <button id="btn-compare">对比视图</button>
    </div>

    <div class="grid">
      ${data.pages.map(page => `
      <div class="card">
        <div class="card-header">
          <h3>
            ${page.name}
            <span class="badge ${page.hasBaseline ? 'baseline' : 'new'}">
              ${page.hasBaseline ? '有基准' : '新增'}
            </span>
          </h3>
          <p class="meta">${page.viewport.width}×${page.viewport.height} | ${page.description}</p>
        </div>
        <div class="card-body">
          <div class="screenshot-container">
            <div class="single-view">
              <img src="${page.screenshotPath}" alt="${page.name}" onerror="this.parentElement.innerHTML='<div class=\\'no-screenshot\\'>截图未找到</div>'">
            </div>
            ${page.hasBaseline ? `
            <div class="compare-view">
              <div class="side">
                <div class="label">基准</div>
                <img src="${page.baselinePath}" alt="baseline">
              </div>
              <div class="side">
                <div class="label">当前</div>
                <img src="${page.screenshotPath}" alt="current">
              </div>
            </div>
            ` : ''}
          </div>
        </div>
        <div class="card-footer">
          <p class="url">${page.url}</p>
        </div>
      </div>
      `).join('')}
    </div>
  </div>

  <script>
    const btnSingle = document.getElementById('btn-single');
    const btnCompare = document.getElementById('btn-compare');
    const singleViews = document.querySelectorAll('.single-view');
    const compareViews = document.querySelectorAll('.compare-view');

    btnSingle.addEventListener('click', () => {
      btnSingle.classList.add('active');
      btnCompare.classList.remove('active');
      singleViews.forEach(v => v.classList.remove('hidden'));
      compareViews.forEach(v => v.classList.remove('active'));
    });

    btnCompare.addEventListener('click', () => {
      btnCompare.classList.add('active');
      btnSingle.classList.remove('active');
      singleViews.forEach(v => v.classList.add('hidden'));
      compareViews.forEach(v => v.classList.add('active'));
    });
  </script>
</body>
</html>`;
}

/**
 * 主函数
 */
function main(): void {
  console.log('📊 生成审查报告...\n');

  // 确保目录存在
  if (!fs.existsSync(config.reportsDir)) {
    fs.mkdirSync(config.reportsDir, { recursive: true });
  }

  // 收集数据
  const data = collectReportData();

  // 生成 HTML
  const html = generateHTML(data);

  // 写入文件
  const reportPath = `${config.reportsDir}/review-report.html`;
  fs.writeFileSync(reportPath, html);

  console.log(`✅ 报告已生成: ${reportPath}`);
  console.log(`\n📈 摘要:`);
  console.log(`   - 总页面数: ${data.summary.total}`);
  console.log(`   - 有基准: ${data.summary.hasBaseline}`);
  console.log(`   - 新增: ${data.summary.new}`);
  console.log('');
}

main();
