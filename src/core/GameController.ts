// ============================================
// 游戏主控制器
// 职责：协调各模块、处理玩家操作、管理游戏状态
// ============================================

import type { IGameController, IRNG } from './interfaces';
import type {
  LevelState, LevelDef, SwapAction, MatchResult, Board, Cell, Goal
} from '../types';
import { RNG } from './RNG';
import { LevelGenerator } from './LevelGenerator';
import { MatchFinder } from './MatchFinder';
import { MatchResolver } from './MatchResolver';
import { GoalTracker } from './GoalTracker';
import { EnergyManager } from './EnergyManager';

export interface SwapResult {
  valid: boolean;
  results: MatchResult[];
  state: LevelState;
  specialTriggered: Cell[];
}

export interface GameControllerConfig {
  playerId: string;
  onStateChange?: (state: LevelState) => void;
  onMatchComplete?: (result: MatchResult) => void;
  onLevelComplete?: (state: LevelState) => void;
  onLevelFailed?: (state: LevelState) => void;
  onShuffle?: () => void;
}

export class GameController implements IGameController {
  private state: LevelState | null = null;
  private rng: IRNG | null = null;
  private isPaused = false;

  private levelGenerator = new LevelGenerator();
  private matchFinder = new MatchFinder();
  private matchResolver = new MatchResolver();
  private goalTracker = new GoalTracker();
  private energyManager = new EnergyManager();

  private config: GameControllerConfig;

  constructor(config: GameControllerConfig) {
    this.config = config;
  }

  /**
   * 开始关卡
   */
  startLevel(levelIndex: number): LevelState {
    // 生成关卡
    const levelDef = this.levelGenerator.generateLevel(levelIndex, this.config.playerId);
    this.state = this.levelGenerator.createLevelState(levelDef);
    this.rng = new RNG(levelDef.seed + Date.now()); // 运行时随机用不同种子

    // 初始化苔藓目标
    this.state.goals = this.goalTracker.initializeMossGoal(
      this.state.goals,
      levelDef.blockers.cells
    );

    this.notifyStateChange();
    return this.state;
  }

  /**
   * 执行交换
   */
  executeSwap(swap: SwapAction): SwapResult {
    if (!this.state || !this.rng || this.isPaused) {
      return {
        valid: false,
        results: [],
        state: this.state!,
        specialTriggered: [],
      };
    }

    // 验证交换有效性
    if (!this.matchFinder.wouldSwapMatch(this.state.board, swap)) {
      return {
        valid: false,
        results: [],
        state: this.state,
        specialTriggered: [],
      };
    }

    // 执行交换
    this.swapTiles(this.state.board, swap.from, swap.to);

    // 消耗步数
    this.state.movesLeft -= 1;

    // 处理特殊块触发
    const specialTriggered: Cell[] = [];
    const fromTile = this.state.board[swap.from.row][swap.from.col].tile;
    const toTile = this.state.board[swap.to.row][swap.to.col].tile;

    if (fromTile?.isSpecial) {
      specialTriggered.push(...this.matchResolver.triggerSpecialTile(this.state.board, swap.from));
    }
    if (toTile?.isSpecial) {
      specialTriggered.push(...this.matchResolver.triggerSpecialTile(this.state.board, swap.to));
    }

    // 消除循环
    const { board, results } = this.matchResolver.resolveUntilStable(
      this.state.board,
      this.state.levelDef.tile_weights,
      this.rng
    );
    this.state.board = board;
    this.state.cascadeCount += results.length;

    // 更新目标进度
    for (const result of results) {
      this.state.goals = this.goalTracker.updateProgress(this.state.goals, result);
      this.config.onMatchComplete?.(result);
    }

    // 检查死局
    if (!this.matchFinder.hasValidMove(this.state.board)) {
      this.shuffle();
    }

    // 检查胜利/失败
    this.checkEndConditions();

    this.notifyStateChange();

    return {
      valid: true,
      results,
      state: this.state,
      specialTriggered,
    };
  }

  /**
   * 获取当前状态
   */
  getState(): LevelState | null {
    return this.state;
  }

  /**
   * 获取提示（下一步可行移动）
   */
  getHint(): SwapAction | null {
    if (!this.state) return null;
    const moves = this.matchFinder.getValidMoves(this.state.board);
    return moves.length > 0 ? moves[0] : null;
  }

  /**
   * 暂停
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * 恢复
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * 重新开始当前关卡
   */
  restart(): LevelState {
    if (!this.state) {
      throw new Error('No level loaded');
    }
    return this.startLevel(this.state.levelDef.level_index);
  }

  // --- 私有方法 ---

  private swapTiles(board: Board, a: Cell, b: Cell): void {
    const temp = board[a.row][a.col].tile;
    board[a.row][a.col].tile = board[b.row][b.col].tile;
    board[b.row][b.col].tile = temp;
  }

  private shuffle(): void {
    if (!this.state || !this.rng) return;

    const MAX_ATTEMPTS = 100;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      // 收集所有 tile
      const tiles: (typeof this.state.board[0][0]['tile'])[] = [];
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          if (this.state.board[r][c].tile) {
            tiles.push(this.state.board[r][c].tile);
          }
        }
      }

      // 打乱
      const shuffled = this.rng.shuffle(tiles);

      // 重新放置
      let idx = 0;
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          if (this.state.board[r][c].tile) {
            this.state.board[r][c].tile = shuffled[idx++];
          }
        }
      }

      // 检查是否有有效移动且无初始匹配
      const matches = this.matchFinder.findAllMatches(this.state.board);
      if (matches.length === 0 && this.matchFinder.hasValidMove(this.state.board)) {
        this.state.shuffleCount += 1;
        this.config.onShuffle?.();
        return;
      }
    }

    // 兜底：即使有匹配也接受（会触发连消）
    this.state.shuffleCount += 1;
    this.config.onShuffle?.();
  }

  private checkEndConditions(): void {
    if (!this.state) return;

    // 检查胜利
    if (this.goalTracker.isAllCompleted(this.state.goals)) {
      this.state.isCompleted = true;
      this.config.onLevelComplete?.(this.state);
      return;
    }

    // 检查失败（步数耗尽）
    if (this.state.movesLeft <= 0) {
      this.state.isFailed = true;
      this.config.onLevelFailed?.(this.state);
    }
  }

  private notifyStateChange(): void {
    if (this.state) {
      this.config.onStateChange?.(this.state);
    }
  }
}
