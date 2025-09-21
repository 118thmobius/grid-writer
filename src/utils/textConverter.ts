// 文字変換ユーティリティ
export const convertToFullWidth = (text: string): string => {
  return text.replace(/[\x20-\x7E]/g, (char) => {
    if (char === ' ') return '　';
    return String.fromCharCode(char.charCodeAt(0) + 0xFEE0);
  });
};

export const convertToHalfWidth = (text: string): string => {
  return text.replace(/[！-～　]/g, (char) => {
    if (char === '　') return ' ';
    return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
  });
};

export const processTextInput = (inputText: string): string => {
  return inputText;
};

export const createDownloadContent = (sourceText: string): string => {
  return convertToHalfWidth(sourceText);
};