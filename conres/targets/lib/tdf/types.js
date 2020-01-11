export class Rows extends Array {}
export class Headers extends Array {}
export class Record extends Array {}
export class Row extends Array {}
export class Comment extends String {
	static from(value, properties) {

		const instance = Object.assign(new this(value), properties);

		instance[Symbol.toStringTag] = `【${/^(?: *\[ *|)(.*?)(?: *\] *|)$/.exec(properties.text || value || '')[1] || ''}】`;

		return instance;
	}

}
export class Value extends String {
	static from(value, properties) {
		const instance = Object.assign(new this(value), properties);

		instance[Symbol.toStringTag] = properties.text || `${value}`;

		return instance;
	}
}
export class Switch extends Boolean {}
export class Sequence extends String {}
export class Numeric extends Number {}
export class Percentage extends Numeric {}

for (const Class of [Sequence, Numeric, Percentage, Switch]) {
	Object.defineProperty(Class, 'from', Object.getOwnPropertyDescriptor(Value, 'from'));
}
Object.setPrototypeOf(Sequence.prototype, Value.prototype);
Object.setPrototypeOf(Numeric.prototype, Value.prototype);
Object.setPrototypeOf(Switch.prototype, Value.prototype);
