/**
 * ConnectionCosts - connection costs matrix from cc.dat file
 * 2 dimension matrix [forward_id][backward_id] -> cost
 */
export class ConnectionCosts {
  forwardDimension: number;
  backwardDimension: number;
  buffer: Int16Array;

  constructor(forwardDimension: number, backwardDimension: number) {
    this.forwardDimension = forwardDimension;
    this.backwardDimension = backwardDimension;

    // leading 2 integers for forward_dimension, backward_dimension
    this.buffer = new Int16Array(forwardDimension * backwardDimension + 2);
    this.buffer[0] = forwardDimension;
    this.buffer[1] = backwardDimension;
  }

  put(forwardId: number, backwardId: number, cost: number): void {
    const index = forwardId * this.backwardDimension + backwardId + 2;
    if (this.buffer.length < index + 1) {
      throw new Error('ConnectionCosts buffer overflow');
    }
    this.buffer[index] = cost;
  }

  get(forwardId: number, backwardId: number): number {
    const index = forwardId * this.backwardDimension + backwardId + 2;
    if (this.buffer.length < index + 1) {
      throw new Error('ConnectionCosts buffer overflow');
    }
    return this.buffer[index];
  }

  loadConnectionCosts(connectionCostsBuffer: Int16Array): void {
    this.forwardDimension = connectionCostsBuffer[0];
    this.backwardDimension = connectionCostsBuffer[1];
    this.buffer = connectionCostsBuffer;
  }
}
