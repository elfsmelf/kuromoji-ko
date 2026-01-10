declare module 'doublearray' {
  interface DoubleArraySearchResult {
    k: string;
    v: number;
  }

  interface DoubleArray {
    commonPrefixSearch(key: string): DoubleArraySearchResult[];
    contain(key: string): boolean;
    lookup(key: string): number;
  }

  interface DoubleArrayBuilder {
    build(keys: Array<{ k: string; v: number }>): DoubleArray;
  }

  function builder(initial_size?: number): DoubleArrayBuilder;
  function load(base: Int32Array, check: Int32Array): DoubleArray;

  export { builder, load, DoubleArray, DoubleArrayBuilder, DoubleArraySearchResult };
}
