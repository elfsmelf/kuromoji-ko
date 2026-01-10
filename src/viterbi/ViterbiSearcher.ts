import { ViterbiNode } from './ViterbiNode.js';
import { ViterbiLattice } from './ViterbiLattice.js';
import { ConnectionCosts } from '../dict/ConnectionCosts.js';

/**
 * ViterbiSearcher - finds the best path through the lattice
 */
export class ViterbiSearcher {
  connectionCosts: ConnectionCosts;

  constructor(connectionCosts: ConnectionCosts) {
    this.connectionCosts = connectionCosts;
  }

  /**
   * Search best path using forward-backward algorithm
   */
  search(lattice: ViterbiLattice): ViterbiNode[] {
    lattice = this.forward(lattice);
    return this.backward(lattice);
  }

  /**
   * Forward pass - compute shortest costs
   */
  forward(lattice: ViterbiLattice): ViterbiLattice {
    for (let i = 1; i <= lattice.eosPos; i++) {
      const nodes = lattice.nodesEndAt[i];
      if (nodes == null) {
        continue;
      }

      for (let j = 0; j < nodes.length; j++) {
        const node = nodes[j];
        let cost = Number.MAX_VALUE;
        let shortestPrevNode: ViterbiNode | null = null;

        const prevNodes = lattice.nodesEndAt[node.start_pos - 1];
        if (prevNodes == null) {
          continue;
        }

        for (let k = 0; k < prevNodes.length; k++) {
          const prevNode = prevNodes[k];

          let edgeCost: number;
          if (node.left_id == null || prevNode.right_id == null) {
            console.log('Left or right is null');
            edgeCost = 0;
          } else {
            edgeCost = this.connectionCosts.get(prevNode.right_id, node.left_id);
          }

          const totalCost = prevNode.shortest_cost + edgeCost + node.cost;
          if (totalCost < cost) {
            shortestPrevNode = prevNode;
            cost = totalCost;
          }
        }

        node.prev = shortestPrevNode;
        node.shortest_cost = cost;
      }
    }

    return lattice;
  }

  /**
   * Backward pass - trace back the best path
   */
  backward(lattice: ViterbiLattice): ViterbiNode[] {
    const shortestPath: ViterbiNode[] = [];

    const lastNodes = lattice.nodesEndAt[lattice.nodesEndAt.length - 1];
    if (!lastNodes || lastNodes.length === 0) {
      return [];
    }

    const eos = lastNodes[0];
    let nodeBack = eos.prev;

    if (nodeBack == null) {
      return [];
    }

    while (nodeBack.type !== 'BOS') {
      shortestPath.push(nodeBack);
      if (nodeBack.prev == null) {
        return [];
      }
      nodeBack = nodeBack.prev;
    }

    return shortestPath.reverse();
  }
}
