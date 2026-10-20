export interface CaptionPart { text: string; reading?: string }

function replaceDirections(text: string, left: boolean): string {
  return text.replaceAll('%KIKI%', left ? '左' : '右').replaceAll('%HANTAI%', left ? '右' : '左');
}

/** Returns text tokens for DOM ruby elements; never evaluates HTML. */
export function parseCaption(text: string, left: boolean): CaptionPart[] {
  const source = replaceDirections(text, left);
  const pattern = /\{([^{}|]+)\|([^{}|]+)\}/gu;
  const result: CaptionPart[] = [];
  let position = 0;
  for (const match of source.matchAll(pattern)) {
    if (match.index > position) result.push({ text: source.slice(position, match.index) });
    result.push({ text: match[1], reading: match[2] });
    position = match.index + match[0].length;
  }
  if (position < source.length) result.push({ text: source.slice(position) });
  return result;
}

export function plainCaption(text: string, left = false, reading = false): string {
  return parseCaption(text, left).map(part => reading ? part.reading ?? part.text : part.text).join('');
}

export function captionErrors(text: string): string[] {
  const clean = text.replace(/\{([^{}|]+)\|([^{}|]+)\}/gu, '').replaceAll('%KIKI%', '').replaceAll('%HANTAI%', '');
  const errors: string[] = [];
  if (/[{}|]/u.test(clean)) errors.push('ルビは {親文字|よみ} の形式で指定してください');
  if (/%[^%\s]*%/u.test(clean)) errors.push('未知の字幕置換語があります');
  return errors;
}
