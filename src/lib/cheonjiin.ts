/**
 * Cheonjiin Input Logic
 * 
 * This module handles the conversion of Cheonjiin key presses into Hangul characters.
 */

import Hangul from 'hangul-js';

export type CheonjiinKey = 
  | '1' | '2' | '3' // ㅣ, ㆍ, ㅡ
  | '4' | '5' | '6' // ㄱㅋ, ㄴㄹ, ㄷㅌ
  | '7' | '8' | '9' // ㅂㅍ, ㅅㅎ, ㅈㅊ
  | '0' | '*' | '#' // ㅇㅁ, Space, Backspace

const CONSONANT_MAP: Record<string, string[]> = {
  '4': ['ㄱ', 'ㅋ', 'ㄲ'],
  '5': ['ㄴ', 'ㄹ'],
  '6': ['ㄷ', 'ㅌ', 'ㄸ'],
  '7': ['ㅂ', 'ㅍ', 'ㅃ'],
  '8': ['ㅅ', 'ㅎ', 'ㅆ'],
  '9': ['ㅈ', 'ㅊ', 'ㅉ'],
  '0': ['ㅇ', 'ㅁ'],
};

const VOWEL_COMBINATIONS: Record<string, string> = {
  'ㅣㆍ': 'ㅏ',
  'ㆍㅣ': 'ㅓ',
  'ㅡㆍ': 'ㅜ',
  'ㆍㅡ': 'ㅗ',
  'ㅣㆍㆍ': 'ㅑ',
  'ㆍㆍㅣ': 'ㅕ',
  'ㅡㆍㆍ': 'ㅠ',
  'ㆍㆍㅡ': 'ㅛ',
  'ㅣㆍㅣ': 'ㅐ',
  'ㆍㅣㅣ': 'ㅔ',
  'ㅣㆍㆍㅣ': 'ㅒ',
  'ㆍㆍㅣㅣ': 'ㅖ',
  'ㅗㅣ': 'ㅚ',
  'ㅜㅣ': 'ㅟ',
  'ㅗㅏ': 'ㅘ',
  'ㅜㅓ': 'ㅝ',
  'ㅗㅐ': 'ㅙ',
  'ㅜㅔ': 'ㅞ',
  'ㅡㅣ': 'ㅢ',
};

// This is a simplified version. Real Cheonjiin has stateful behavior.
// We'll maintain a list of jamos and use Hangul.assemble()
export class CheonjiinState {
  private jamos: string[] = [];
  private lastKey: string | null = null;
  private lastKeyTime: number = 0;
  private multiTapIndex: number = 0;

  constructor() {}

  public handleKey(key: string): string {
    const now = Date.now();
    const isSameKey = key === this.lastKey && (now - this.lastKeyTime < 1000);
    
    if (key === 'backspace') {
      this.jamos.pop();
      this.lastKey = null;
      return this.assemble();
    }

    if (key === 'space') {
      this.jamos.push(' ');
      this.lastKey = null;
      return this.assemble();
    }

    // Handle Consonants (Multi-tap)
    if (CONSONANT_MAP[key]) {
      const options = CONSONANT_MAP[key];
      if (isSameKey) {
        this.jamos.pop();
        this.multiTapIndex = (this.multiTapIndex + 1) % options.length;
      } else {
        this.multiTapIndex = 0;
      }
      this.jamos.push(options[this.multiTapIndex]);
    } 
    // Handle Vowels (Combination)
    else if (['ㅣ', 'ㆍ', 'ㅡ'].includes(key)) {
      this.jamos.push(key);
      this.resolveVowels();
    }

    this.lastKey = key;
    this.lastKeyTime = now;
    return this.assemble();
  }

  private resolveVowels() {
    // Look for vowel combinations in the last few jamos
    // This is a complex part of Cheonjiin. 
    // For simplicity, we'll just keep them as jamos and let hangul-js handle some,
    // but we need to manually map ㅣ, ㆍ, ㅡ combinations.
    
    let text = this.jamos.join('');
    // Simple replacement for common combinations
    const sortedKeys = Object.keys(VOWEL_COMBINATIONS).sort((a, b) => b.length - a.length);
    for (const combo of sortedKeys) {
      if (text.endsWith(combo)) {
        const start = text.length - combo.length;
        this.jamos.splice(start, combo.length, VOWEL_COMBINATIONS[combo]);
        break;
      }
    }
  }

  public assemble(): string {
    return Hangul.assemble(this.jamos);
  }

  public clear() {
    this.jamos = [];
    this.lastKey = null;
  }

  public getJamos() {
    return [...this.jamos];
  }
}
