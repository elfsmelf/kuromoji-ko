export type ViterbiNodeType = 'KNOWN' | 'UNKNOWN' | 'BOS' | 'EOS';

/**
 * ViterbiNode - a node in the Viterbi lattice
 */
export class ViterbiNode {
  name: number; // word_id
  cost: number; // word cost
  start_pos: number; // start position (1-indexed)
  length: number; // word length
  left_id: number; // left context ID
  right_id: number; // right context ID
  prev: ViterbiNode | null; // previous node in best path
  surface_form: string;
  shortest_cost: number;
  type: ViterbiNodeType;

  constructor(
    nodeName: number,
    nodeCost: number,
    startPos: number,
    length: number,
    type: ViterbiNodeType,
    leftId: number,
    rightId: number,
    surfaceForm: string
  ) {
    this.name = nodeName;
    this.cost = nodeCost;
    this.start_pos = startPos;
    this.length = length;
    this.left_id = leftId;
    this.right_id = rightId;
    this.prev = null;
    this.surface_form = surfaceForm;
    this.shortest_cost = type === 'BOS' ? 0 : Number.MAX_VALUE;
    this.type = type;
  }
}
