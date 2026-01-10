import { ViterbiNode } from './ViterbiNode.js';

/**
 * ViterbiLattice - a word lattice for Viterbi algorithm
 */
export class ViterbiLattice {
  nodesEndAt: (ViterbiNode[] | null)[];
  eosPos: number;

  constructor() {
    this.nodesEndAt = [];
    this.nodesEndAt[0] = [new ViterbiNode(-1, 0, 0, 0, 'BOS', 0, 0, '')];
    this.eosPos = 1;
  }

  /**
   * Append node to the lattice
   */
  append(node: ViterbiNode): void {
    const lastPos = node.start_pos + node.length - 1;
    if (this.eosPos < lastPos) {
      this.eosPos = lastPos;
    }

    let prevNodes = this.nodesEndAt[lastPos];
    if (prevNodes == null) {
      prevNodes = [];
    }
    prevNodes.push(node);

    this.nodesEndAt[lastPos] = prevNodes;
  }

  /**
   * Append EOS (End of Sentence) node
   */
  appendEos(): void {
    const lastIndex = this.nodesEndAt.length;
    this.eosPos++;
    this.nodesEndAt[lastIndex] = [new ViterbiNode(-1, 0, this.eosPos, 0, 'EOS', 0, 0, '')];
  }
}
