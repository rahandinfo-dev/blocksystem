import bidiFactory from "bidi-js";
const bidi = bidiFactory();
/** UAX #9 orders runs; fontkit shapes each logical Arabic word, never the QR. */
export function pdfTextRuns(value: string, direction: "ltr" | "rtl"): string[] {
  const text = value.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");
  const embedding = bidi.getEmbeddingLevels(text, direction);
  const mirrored = bidi.getMirroredCharactersMap(text, embedding.levels);
  const indices = Array.from({ length: text.length }, (_, index) => index);
  for (const [start, end] of bidi.getReorderSegments(text, embedding))
    indices.splice(
      start,
      end - start + 1,
      ...indices.slice(start, end + 1).reverse(),
    );
  const runs: string[] = [];
  let word: number[] = [];
  const flush = () => {
    if (word.length) {
      if (embedding.levels[word[0]] & 1) word.reverse();
      runs.push(word.map((i) => text[i]).join(""));
      word = [];
    }
  };
  for (const index of indices) {
    // Shape letters together; render digits separately so fontkit cannot reverse Arabic numbers.
    const letter = /[\p{L}\p{M}]/u.test(text[index]);
    if (!letter) {
      flush();
      runs.push(mirrored.get(index) ?? text[index]);
    } else {
      if (
        word.length &&
        (embedding.levels[word[0]] & 1) !== (embedding.levels[index] & 1)
      )
        flush();
      word.push(index);
    }
  }
  flush();
  return runs;
}
