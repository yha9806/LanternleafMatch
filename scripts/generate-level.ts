#!/usr/bin/env tsx
// ============================================
// 关卡生成调试脚本
// 用法: npm run gen:level -- [levelIndex] [playerId]
// ============================================

import { LevelGenerator } from '../src/core/LevelGenerator';
import { MatchFinder } from '../src/core/MatchFinder';

const levelIndex = parseInt(process.argv[2] || '1', 10);
const playerId = process.argv[3] || 'test-player';

console.log(`\n🎮 生成关卡 ${levelIndex} (player: ${playerId})\n`);
console.log('='.repeat(50));

const generator = new LevelGenerator();
const matchFinder = new MatchFinder();

// 生成关卡定义
const levelDef = generator.generateLevel(levelIndex, playerId);
console.log('\n📋 关卡定义:');
console.log(JSON.stringify(levelDef, null, 2));

// 创建关卡状态
const levelState = generator.createLevelState(levelDef);
console.log('\n📊 棋盘状态:');

// 可视化棋盘
const TILE_ICONS: Record<string, string> = {
  leaf: '🍃',
  acorn: '🌰',
  star: '⭐',
  fish: '🐟',
  bone: '🦴',
};

console.log('\n   0  1  2  3  4  5');
console.log('  ─────────────────');

for (let r = 0; r < 6; r++) {
  let row = `${r} │`;
  for (let c = 0; c < 6; c++) {
    const cell = levelState.board[r][c];
    const icon = cell.tile ? TILE_ICONS[cell.tile.type] : '  ';
    const moss = cell.blocker ? '░' : ' ';
    row += `${moss}${icon}`;
  }
  console.log(row);
}

console.log('\n📍 苔藓位置:', levelDef.blockers.cells.length, '格');
console.log('   Pattern:', levelDef.blockers.pattern);
console.log('   Density:', levelDef.blockers.density);

// 检查有效移动
const validMoves = matchFinder.getValidMoves(levelState.board);
console.log('\n✅ 可行移动数:', validMoves.length);

if (validMoves.length > 0) {
  console.log('   示例:', validMoves.slice(0, 3).map(m =>
    `(${m.from.row},${m.from.col}) ↔ (${m.to.row},${m.to.col})`
  ).join(', '));
}

// 检查初始匹配（应该为 0）
const initialMatches = matchFinder.findAllMatches(levelState.board);
console.log('\n🔍 初始匹配数:', initialMatches.length, initialMatches.length === 0 ? '✓' : '✗ (应为0)');

console.log('\n' + '='.repeat(50));
console.log('✨ 关卡生成完成\n');
