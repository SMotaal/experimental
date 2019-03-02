//@ts-check

interface TypeMap<T> {
	[name: string]: T;
}

namespace LexExp {
	export type Flags = string;
	export type Source = string;

	export type Pattern = Expression | Source;

	export interface Lookup<K extends string> {
		[name: string]: Expression | Lookup;
		[Symbol.unscopables]: K[];
		[Symbol.iterator](): Iterator<K>;
	}

	export interface Expression extends Pick<RegExp, 'exec' | 'matchAll'> {
		lookup?: Lookup;
		source: Source;
		flags: Flags;
	}

	export interface Matcher {}
}

interface LexExp<K extends string> {
	constructor(pattern?: LexExp.Pattern | LexExp.Source, flags?: LexExp.Flags);
	lookup: LexExp.Lookup<K>;
}

// interface LexExp extends RegExp {
// 	/**
// 	 * Returns a string indicating the flags of the regular expression in question. This field is read-only.
// 	 * The characters in this string are sequenced and concatenated in the following order:
// 	 *
// 	 *    - "g" for global
// 	 *    - "i" for ignoreCase
// 	 *    - "m" for multiline
// 	 *    - "u" for unicode
// 	 *    - "y" for sticky
// 	 *
// 	 * If no flags are set, the value is the empty string.
// 	 */
// 	readonly flags: string;

// 	/**
// 	 * Returns a Boolean value indicating the state of the sticky flag (y) used with a regular
// 	 * expression. Default is false. Read-only.
// 	 */
// 	readonly sticky: boolean;

// 	/**
// 	 * Returns a Boolean value indicating the state of the Unicode flag (u) used with a regular
// 	 * expression. Default is false. Read-only.
// 	 */
// 	readonly unicode: boolean;
// }

// interface LexExpConstructor {
// 	new (pattern: LexExp, flags?: string): LexExp;
// 	(pattern: LexExp, flags?: string): LexExp;
// }

// extends Partial<Pick<RegExp, 'source' | 'flags'>>
