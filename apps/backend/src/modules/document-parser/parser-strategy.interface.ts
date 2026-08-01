export type ParseResult = {
  text: string;
  method: 'embedded' | 'ocr';
};

export interface ParserStrategy {
  readonly contentTypes: readonly string[];
  parse(filePath: string): Promise<ParseResult>;
}
