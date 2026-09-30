declare module "bidi-js" {
  type Embedding = {
    levels: Uint8Array;
    paragraphs: Array<{ start: number; end: number; level: number }>;
  };
  export default function bidiFactory(): {
    getEmbeddingLevels(text: string, direction?: "rtl" | "ltr"): Embedding;
    getReorderSegments(
      text: string,
      embedding: Embedding,
    ): Array<[number, number]>;
    getMirroredCharactersMap(
      text: string,
      levels: Uint8Array,
    ): Map<number, string>;
  };
}
