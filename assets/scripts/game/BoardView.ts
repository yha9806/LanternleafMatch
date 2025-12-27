import {
  _decorator, Component, Node, Prefab, instantiate,
  UITransform, Vec3, tween, Color, Sprite, SpriteFrame,
  EventTouch, resources
} from 'cc';
import type { Board, Cell, SwapAction, TileType, SpecialType } from '../core/types';

const { ccclass, property } = _decorator;

/**
 * 棋盘视图组件
 * 负责渲染棋盘、处理触摸交换
 */
@ccclass('BoardView')
export class BoardView extends Component {
  @property(Prefab)
  tilePrefab: Prefab = null!;

  @property(Node)
  tilesContainer: Node = null!;

  @property({ type: Number })
  cellSize: number = 100;

  @property({ type: Number })
  boardSize: number = 6;

  @property({ type: Number })
  swapDuration: number = 0.15;

  @property({ type: Number })
  fallDuration: number = 0.2;

  @property({ type: Number })
  matchFadeDuration: number = 0.1;

  // 内部状态
  private tileNodes: Map<string, Node> = new Map();
  private selectedCell: Cell | null = null;
  private isAnimating: boolean = false;

  // 回调
  private onSwapCallback: ((swap: SwapAction) => void) | null = null;

  // Tile 贴图缓存
  private tileSpriteFrames: Map<string, SpriteFrame> = new Map();

  onLoad() {
    this.setupTouchEvents();
    this.loadTileTextures();
  }

  /**
   * 设置交换回调
   */
  setOnSwap(callback: (swap: SwapAction) => void) {
    this.onSwapCallback = callback;
  }

  /**
   * 渲染整个棋盘
   */
  renderBoard(board: Board) {
    this.clearBoard();

    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        const cell = board[r][c];
        if (cell.tile) {
          this.createTileNode(r, c, cell.tile.type, cell.tile.isSpecial, cell.tile.specialType);
        }
        if (cell.blocker) {
          this.createMossOverlay(r, c);
        }
      }
    }
  }

  /**
   * 执行交换动画
   */
  async animateSwap(from: Cell, to: Cell, valid: boolean): Promise<void> {
    this.isAnimating = true;

    const fromNode = this.getTileNode(from);
    const toNode = this.getTileNode(to);

    if (!fromNode || !toNode) {
      this.isAnimating = false;
      return;
    }

    const fromPos = this.cellToPosition(from);
    const toPos = this.cellToPosition(to);

    // 交换动画
    await Promise.all([
      this.tweenPosition(fromNode, toPos, this.swapDuration),
      this.tweenPosition(toNode, fromPos, this.swapDuration),
    ]);

    if (valid) {
      // 更新映射
      this.tileNodes.set(this.cellKey(from), toNode);
      this.tileNodes.set(this.cellKey(to), fromNode);
    } else {
      // 无效交换，换回来
      await Promise.all([
        this.tweenPosition(fromNode, fromPos, this.swapDuration),
        this.tweenPosition(toNode, toPos, this.swapDuration),
      ]);
    }

    this.isAnimating = false;
  }

  /**
   * 执行消除动画
   */
  async animateMatch(cells: Cell[]): Promise<void> {
    this.isAnimating = true;

    const nodes = cells.map(c => this.getTileNode(c)).filter(n => n !== null) as Node[];

    // 消失动画
    await Promise.all(nodes.map(node =>
      this.tweenFade(node, 0, this.matchFadeDuration)
    ));

    // 移除节点
    for (const cell of cells) {
      this.removeTileNode(cell);
    }

    this.isAnimating = false;
  }

  /**
   * 执行下落动画
   */
  async animateFall(movements: Array<{ from: Cell; to: Cell }>): Promise<void> {
    this.isAnimating = true;

    const animations: Promise<void>[] = [];

    for (const { from, to } of movements) {
      const node = this.getTileNode(from);
      if (node) {
        const toPos = this.cellToPosition(to);
        const distance = Math.abs(to.row - from.row);
        const duration = this.fallDuration * Math.sqrt(distance);

        animations.push(this.tweenPosition(node, toPos, duration));

        // 更新映射
        this.tileNodes.delete(this.cellKey(from));
        this.tileNodes.set(this.cellKey(to), node);
      }
    }

    await Promise.all(animations);
    this.isAnimating = false;
  }

  /**
   * 生成新 Tile 动画
   */
  async animateSpawn(cells: Array<{ cell: Cell; type: TileType }>): Promise<void> {
    this.isAnimating = true;

    for (const { cell, type } of cells) {
      const node = this.createTileNode(cell.row, cell.col, type, false);
      if (node) {
        node.setScale(new Vec3(0, 0, 1));
        tween(node)
          .to(0.15, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
          .start();
      }
    }

    await this.delay(150);
    this.isAnimating = false;
  }

  /**
   * 清除苔藓覆盖层
   */
  removeMossOverlay(cell: Cell) {
    const key = `moss_${cell.row}_${cell.col}`;
    const node = this.tilesContainer.getChildByName(key);
    if (node) {
      tween(node)
        .to(0.2, { scale: new Vec3(0, 0, 1) })
        .call(() => node.destroy())
        .start();
    }
  }

  /**
   * 高亮提示
   */
  showHint(swap: SwapAction) {
    const fromNode = this.getTileNode(swap.from);
    const toNode = this.getTileNode(swap.to);

    if (fromNode && toNode) {
      this.pulseNode(fromNode);
      this.pulseNode(toNode);
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  private setupTouchEvents() {
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
  }

  private loadTileTextures() {
    const types = ['leaf', 'acorn', 'star', 'fish', 'bone', 'special_whirl', 'special_lantern', 'moss'];
    for (const type of types) {
      resources.load(`textures/tiles/tile_${type}_128/spriteFrame`, SpriteFrame, (err, sf) => {
        if (!err && sf) {
          this.tileSpriteFrames.set(type, sf);
        }
      });
    }
  }

  private onTouchStart(event: EventTouch) {
    if (this.isAnimating) return;

    const location = event.getUILocation();
    const cell = this.positionToCell(location.x, location.y);

    if (cell && this.isValidCell(cell)) {
      this.selectedCell = cell;
      this.highlightCell(cell, true);
    }
  }

  private onTouchEnd(event: EventTouch) {
    if (this.isAnimating || !this.selectedCell) return;

    const location = event.getUILocation();
    const cell = this.positionToCell(location.x, location.y);

    if (cell && this.isValidCell(cell) && this.isAdjacent(this.selectedCell, cell)) {
      const swap: SwapAction = { from: this.selectedCell, to: cell };
      this.onSwapCallback?.(swap);
    }

    this.highlightCell(this.selectedCell, false);
    this.selectedCell = null;
  }

  private onTouchCancel() {
    if (this.selectedCell) {
      this.highlightCell(this.selectedCell, false);
      this.selectedCell = null;
    }
  }

  private createTileNode(row: number, col: number, type: TileType, isSpecial: boolean, specialType?: SpecialType): Node | null {
    if (!this.tilePrefab) return null;

    const node = instantiate(this.tilePrefab);
    node.name = `tile_${row}_${col}`;
    node.setPosition(this.cellToPosition({ row, col }));
    node.parent = this.tilesContainer;

    // 设置贴图
    const sprite = node.getComponent(Sprite);
    if (sprite) {
      let textureKey = type;
      if (isSpecial && specialType) {
        textureKey = specialType.startsWith('whirl') ? 'special_whirl' : 'special_lantern';
      }
      const sf = this.tileSpriteFrames.get(textureKey);
      if (sf) {
        sprite.spriteFrame = sf;
      }
    }

    this.tileNodes.set(this.cellKey({ row, col }), node);
    return node;
  }

  private createMossOverlay(row: number, col: number) {
    if (!this.tilePrefab) return;

    const node = instantiate(this.tilePrefab);
    node.name = `moss_${row}_${col}`;
    node.setPosition(this.cellToPosition({ row, col }));
    node.parent = this.tilesContainer;

    const sprite = node.getComponent(Sprite);
    if (sprite) {
      const sf = this.tileSpriteFrames.get('moss');
      if (sf) {
        sprite.spriteFrame = sf;
        sprite.color = new Color(255, 255, 255, 180); // 半透明
      }
    }
  }

  private getTileNode(cell: Cell): Node | null {
    return this.tileNodes.get(this.cellKey(cell)) || null;
  }

  private removeTileNode(cell: Cell) {
    const key = this.cellKey(cell);
    const node = this.tileNodes.get(key);
    if (node) {
      node.destroy();
      this.tileNodes.delete(key);
    }
  }

  private clearBoard() {
    this.tileNodes.forEach(node => node.destroy());
    this.tileNodes.clear();
    this.tilesContainer.removeAllChildren();
  }

  private cellToPosition(cell: Cell): Vec3 {
    const offset = (this.boardSize - 1) * this.cellSize / 2;
    const x = cell.col * this.cellSize - offset;
    const y = -cell.row * this.cellSize + offset; // Y 轴向下
    return new Vec3(x, y, 0);
  }

  private positionToCell(x: number, y: number): Cell | null {
    const transform = this.node.getComponent(UITransform);
    if (!transform) return null;

    const localPos = transform.convertToNodeSpaceAR(new Vec3(x, y, 0));
    const offset = (this.boardSize - 1) * this.cellSize / 2;

    const col = Math.round((localPos.x + offset) / this.cellSize);
    const row = Math.round((-localPos.y + offset) / this.cellSize);

    return { row, col };
  }

  private isValidCell(cell: Cell): boolean {
    return cell.row >= 0 && cell.row < this.boardSize &&
           cell.col >= 0 && cell.col < this.boardSize;
  }

  private isAdjacent(a: Cell, b: Cell): boolean {
    const dr = Math.abs(a.row - b.row);
    const dc = Math.abs(a.col - b.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  }

  private cellKey(cell: Cell): string {
    return `${cell.row},${cell.col}`;
  }

  private highlightCell(cell: Cell, highlight: boolean) {
    const node = this.getTileNode(cell);
    if (node) {
      const scale = highlight ? 1.1 : 1.0;
      tween(node)
        .to(0.1, { scale: new Vec3(scale, scale, 1) })
        .start();
    }
  }

  private pulseNode(node: Node) {
    tween(node)
      .to(0.2, { scale: new Vec3(1.15, 1.15, 1) })
      .to(0.2, { scale: new Vec3(1, 1, 1) })
      .union()
      .repeat(3)
      .start();
  }

  private tweenPosition(node: Node, target: Vec3, duration: number): Promise<void> {
    return new Promise(resolve => {
      tween(node)
        .to(duration, { position: target }, { easing: 'sineOut' })
        .call(() => resolve())
        .start();
    });
  }

  private tweenFade(node: Node, alpha: number, duration: number): Promise<void> {
    return new Promise(resolve => {
      const sprite = node.getComponent(Sprite);
      if (sprite) {
        const startAlpha = sprite.color.a;
        tween(node)
          .to(duration, {}, {
            onUpdate: (_, ratio) => {
              const a = startAlpha + (alpha * 255 - startAlpha) * (ratio || 0);
              sprite.color = new Color(255, 255, 255, a);
            }
          })
          .call(() => resolve())
          .start();
      } else {
        resolve();
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
