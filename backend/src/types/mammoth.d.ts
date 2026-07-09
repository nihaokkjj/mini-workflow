// mammoth does not ship type declarations in its default dist
declare module "mammoth" {
  interface MammothResult {
    value: string;
    messages: unknown[];
  }

  export function extractRawText(options: {
    buffer: Buffer;
  }): Promise<MammothResult>;
}
