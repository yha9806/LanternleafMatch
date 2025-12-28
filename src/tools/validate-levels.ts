#!/usr/bin/env ts-node
// ============================================
// 关卡批量验证工具
// 使用蒙特卡洛模拟验证关卡可玩性
// ============================================

import { LevelValidator, DEFAULT_SIMULATION_CONFIG, ValidationResult } from '../core/LevelValidator';
import { DifficultyEstimator, DifficultyBreakdown } from '../core/DifficultyEstimator';
import { LevelGenerator } from '../core/LevelGenerator';
import type { LevelDef } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// 配置
// ============================================

interface ValidatorConfig {
  iterations: number;        // 模拟次数
  startLevel: number;        // 起始关卡
  endLevel: number;          // 结束关卡
  outputFormat: 'console' | 'json' | 'csv';
  outputPath?: string;       // 输出文件路径
  verbose: boolean;          // 详细输出
  failOnError: boolean;      // 遇到错误是否退出
  winRateThreshold: number;  // 最低胜率阈值
}

const DEFAULT_CONFIG: ValidatorConfig = {
  iterations: 100,
  startLevel: 1,
  endLevel: 50,
  outputFormat: 'console',
  verbose: false,
  failOnError: false,
  winRateThreshold: 0.3,
};

// ============================================
// 验证结果类型
// ============================================

interface LevelValidationResult {
  level: number;
  validation: ValidationResult;
  difficulty: DifficultyBreakdown;
  status: 'pass' | 'warn' | 'fail';
  issues: string[];
}

interface ValidationReport {
  timestamp: string;
  config: ValidatorConfig;
  summary: {
    total: number;
    passed: number;
    warned: number;
    failed: number;
    avgWinRate: number;
    avgDifficulty: number;
  };
  results: LevelValidationResult[];
}

// ============================================
// 主验证器类
// ============================================

class LevelBatchValidator {
  private validator = new LevelValidator();
  private estimator = new DifficultyEstimator();
  private generator = new LevelGenerator();

  /**
   * 运行批量验证
   */
  async run(config: ValidatorConfig = DEFAULT_CONFIG): Promise<ValidationReport> {
    const results: LevelValidationResult[] = [];
    const startTime = Date.now();

    console.log(`\n🎮 关卡验证工具 v1.0`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 关卡范围: ${config.startLevel} - ${config.endLevel}`);
    console.log(`🎲 模拟次数: ${config.iterations} 次/关卡`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    for (let level = config.startLevel; level <= config.endLevel; level++) {
      const result = await this.validateLevel(level, config);
      results.push(result);

      // 进度输出
      this.printProgress(result, config);

      if (config.failOnError && result.status === 'fail') {
        console.error(`\n❌ 关卡 ${level} 验证失败，退出`);
        break;
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n⏱️  总耗时: ${elapsed}s`);

    // 生成报告
    const report = this.generateReport(results, config);

    // 输出报告
    this.outputReport(report, config);

    return report;
  }

  /**
   * 验证单个关卡
   */
  private async validateLevel(level: number, config: ValidatorConfig): Promise<LevelValidationResult> {
    // 生成关卡定义（使用固定 playerId 保证可复现）
    const levelDef = this.generator.generateLevel(level, 'validator_test_player');

    // 蒙特卡洛验证
    const validation = this.validator.validate(levelDef, {
      iterations: config.iterations,
      strategies: ['mixed'],
      timeoutMs: 30000,
      verbose: config.verbose,
    });

    // 难度评估
    const difficulty = this.estimator.analyzeLevel(levelDef);

    // 判断状态和问题
    const issues: string[] = [];
    let status: 'pass' | 'warn' | 'fail' = 'pass';

    // 检查胜率
    if (validation.winRate < config.winRateThreshold) {
      issues.push(`胜率过低: ${(validation.winRate * 100).toFixed(1)}%`);
      status = 'fail';
    } else if (validation.winRate < difficulty.phase.targetWinRate.min) {
      issues.push(`胜率低于目标: ${(validation.winRate * 100).toFixed(1)}% < ${(difficulty.phase.targetWinRate.min * 100)}%`);
      status = 'warn';
    }

    // 检查难度偏差
    if (Math.abs(difficulty.score - difficulty.phase.targetDifficulty) > 2) {
      issues.push(`难度偏差: ${difficulty.score} vs 目标 ${difficulty.phase.targetDifficulty}`);
      if (status === 'pass') status = 'warn';
    }

    // 添加难度分析警告
    issues.push(...difficulty.warnings);

    // 检查死局率
    if (validation.deadlockRate > 0.2) {
      issues.push(`死局率过高: ${(validation.deadlockRate * 100).toFixed(1)}%`);
      if (status === 'pass') status = 'warn';
    }

    return {
      level,
      validation,
      difficulty,
      status,
      issues,
    };
  }

  /**
   * 打印进度
   */
  private printProgress(result: LevelValidationResult, config: ValidatorConfig): void {
    const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    const winRate = (result.validation.winRate * 100).toFixed(1);
    const diff = result.difficulty.score.toFixed(1);
    const phase = result.difficulty.phase.name;

    console.log(
      `${statusIcon} Lv.${result.level.toString().padStart(3)} ` +
      `| 胜率 ${winRate.padStart(5)}% ` +
      `| 难度 ${diff.padStart(4)} ` +
      `| ${phase.padEnd(4)} ` +
      `${result.issues.length > 0 ? `| ${result.issues[0]}` : ''}`
    );

    if (config.verbose && result.issues.length > 1) {
      for (let i = 1; i < result.issues.length; i++) {
        console.log(`    └─ ${result.issues[i]}`);
      }
    }
  }

  /**
   * 生成报告
   */
  private generateReport(results: LevelValidationResult[], config: ValidatorConfig): ValidationReport {
    const passed = results.filter(r => r.status === 'pass').length;
    const warned = results.filter(r => r.status === 'warn').length;
    const failed = results.filter(r => r.status === 'fail').length;

    const avgWinRate = results.reduce((sum, r) => sum + r.validation.winRate, 0) / results.length;
    const avgDifficulty = results.reduce((sum, r) => sum + r.difficulty.score, 0) / results.length;

    return {
      timestamp: new Date().toISOString(),
      config,
      summary: {
        total: results.length,
        passed,
        warned,
        failed,
        avgWinRate: Math.round(avgWinRate * 1000) / 1000,
        avgDifficulty: Math.round(avgDifficulty * 10) / 10,
      },
      results,
    };
  }

  /**
   * 输出报告
   */
  private outputReport(report: ValidationReport, config: ValidatorConfig): void {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 验证报告摘要`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`总关卡数: ${report.summary.total}`);
    console.log(`✅ 通过: ${report.summary.passed}`);
    console.log(`⚠️  警告: ${report.summary.warned}`);
    console.log(`❌ 失败: ${report.summary.failed}`);
    console.log(`平均胜率: ${(report.summary.avgWinRate * 100).toFixed(1)}%`);
    console.log(`平均难度: ${report.summary.avgDifficulty}`);

    // 输出到文件
    if (config.outputPath) {
      const outputPath = config.outputPath;

      if (config.outputFormat === 'json') {
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 JSON 报告已保存: ${outputPath}`);
      } else if (config.outputFormat === 'csv') {
        const csv = this.toCSV(report);
        fs.writeFileSync(outputPath, csv);
        console.log(`\n📄 CSV 报告已保存: ${outputPath}`);
      }
    }

    // 如果有失败，列出问题关卡
    const problematic = report.results.filter(r => r.status !== 'pass');
    if (problematic.length > 0) {
      console.log(`\n⚠️  问题关卡:`);
      for (const r of problematic) {
        console.log(`   Lv.${r.level}: ${r.issues.join(', ')}`);
      }
    }
  }

  /**
   * 转换为 CSV 格式
   */
  private toCSV(report: ValidationReport): string {
    const headers = [
      'level',
      'status',
      'winRate',
      'avgMovesUsed',
      'avgMovesRemaining',
      'difficultyScore',
      'deadlockRate',
      'specialTileUsage',
      'phase',
      'issues',
    ];

    const rows = report.results.map(r => [
      r.level,
      r.status,
      r.validation.winRate.toFixed(4),
      r.validation.avgMovesUsed.toFixed(2),
      r.validation.avgMovesRemaining.toFixed(2),
      r.difficulty.score,
      r.validation.deadlockRate.toFixed(4),
      r.validation.specialTileUsage.toFixed(2),
      r.difficulty.phase.name,
      `"${r.issues.join('; ')}"`,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

// ============================================
// CLI 入口
// ============================================

function parseArgs(): ValidatorConfig {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '-s':
      case '--start':
        config.startLevel = parseInt(args[++i], 10);
        break;
      case '-e':
      case '--end':
        config.endLevel = parseInt(args[++i], 10);
        break;
      case '-i':
      case '--iterations':
        config.iterations = parseInt(args[++i], 10);
        break;
      case '-o':
      case '--output':
        config.outputPath = args[++i];
        break;
      case '-f':
      case '--format':
        config.outputFormat = args[++i] as 'console' | 'json' | 'csv';
        break;
      case '-v':
      case '--verbose':
        config.verbose = true;
        break;
      case '--fail-on-error':
        config.failOnError = true;
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
关卡批量验证工具

使用方法:
  npx ts-node src/tools/validate-levels.ts [选项]

选项:
  -s, --start <n>      起始关卡 (默认: 1)
  -e, --end <n>        结束关卡 (默认: 50)
  -i, --iterations <n> 模拟次数 (默认: 100)
  -o, --output <path>  输出文件路径
  -f, --format <fmt>   输出格式: console, json, csv (默认: console)
  -v, --verbose        详细输出
  --fail-on-error      遇到错误时退出
  -h, --help           显示帮助

示例:
  # 验证 1-50 关
  npx ts-node src/tools/validate-levels.ts

  # 验证 1-10 关，200 次模拟
  npx ts-node src/tools/validate-levels.ts -s 1 -e 10 -i 200

  # 输出 JSON 报告
  npx ts-node src/tools/validate-levels.ts -o report.json -f json
`);
}

// 主入口
async function main() {
  const config = parseArgs();
  const validator = new LevelBatchValidator();

  try {
    const report = await validator.run(config);

    // 根据结果返回退出码
    if (report.summary.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('验证出错:', error);
    process.exit(2);
  }
}

// 如果直接运行
if (require.main === module) {
  main();
}

export { LevelBatchValidator, ValidatorConfig, ValidationReport };
