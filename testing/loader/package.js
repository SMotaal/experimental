import {PackageSpecifier, SpecifierPrefix, resolvers} from './helpers.js';

const resolvePackageField = (instance, resolve) => (typeof resolve === 'function' ? resolve(instance) : resolve);

const resolvePackageID = ({id, name, scope}, fallback) =>
	id || (name && `${(scope && `@${scope}/`) || ''}${name}`) || fallback || undefined;

export class Package {
	constructor(manifest, defaults = {}) {
		this.package = this;

		let id, scope, name, root, specifier;

		defaults && ({id, root, specifier = (id && `${id}${root || ''}`) || ''} = defaults);

		[specifier, id, scope, name, root] = PackageSpecifier.exec(specifier || (manifest.id || id));

		({
			scope: this.scope = scope,
			name: this.name = name,
			root: this.root = root || `/`,
			id: this.id = resolvePackageID(this, id),
			cdn: this.provider = defaults.cdn || defaults.provider || undefined,
			main: this.main = ('main' in defaults && resolvePackageField(this, defaults.main)) || undefined,
			module: this.module = ('module' in defaults && resolvePackageField(this, defaults.module)) || undefined,
			stylesheet: this.stylesheet = ('stylesheet' in defaults && resolvePackageField(this, defaults.stylesheet)) ||
				undefined,
		} = {...manifest});
	}

	resolve(entry, provider = this.provider) {
		const specifier = Package.resolve(entry, this);
		return resolvers[provider]({specifier});
	}

	/**
	 * @param {string | {toString(): string}} specifier
	 * @param {Package | Partial<Package>} options
	 */
	static resolve(specifier = './', options) {
		let specifierType, specifierPrefix, validPrefix;
		let bareSpecifier, packageEntry;
		let packageID, packageMain, resolved;

		options && options.package && ({id: packageID, main: packageMain} = options.package);

		try {
			specifierType = (specifier === null && 'null') || typeof specifier;

			if (specifierType === 'object') {
				specifier = `${specifier}`.trim();
				(specifier && typeof specifier === 'string') || ((specifier = '') && specifier.trim());
			}

			[specifierPrefix] = SpecifierPrefix.exec(specifier);
			validPrefix = !specifierPrefix || specifierPrefix === './' || (packageID && specifier === '/');

			if (!specifier || !validPrefix) {
				const reason = !validPrefix
					? `specifier "${arguments[0]}" cannot begin with "${specifierPrefix}"`
					: arguments[0] == null
					? `specifier cannot be ${arguments[0]}`
					: typeof specifier === 'string'
					? `specifier cannot be "${arguments[0]}"`
					: `specifier cannot be ${/^[aeiou]/.test(specifierType) ? 'an' : 'a'} ${specifierType}`;
				throw TypeError(`Cannot resolve package entry: ${reason}`);
			}

			if (packageID) {
				packageEntry =
					(specifierPrefix
						? specifier.slice(specifierPrefix.length)
						: specifier.startsWith(`${packageID}/`)
						? specifier.slice(1 + packageID.length)
						: specifier
					).trim() || packageMain;

				(!packageEntry || packageEntry === '/') && (console.log({packageEntry}), (packageEntry = packageMain));

				if (packageEntry) return (resolved = `${packageID}/${packageEntry}`);

				throw ReferenceError(
					`Cannot resolve package entry: cannot resolve "${arguments[0]}" to a specific package entry`,
				);
			} else {
				if (!specifierPrefix) {
					[bareSpecifier, packageID, , , packageEntry] = PackageSpecifier.exec(specifier);
					if (bareSpecifier) return (resolved = bareSpecifier);
				}

				throw ReferenceError(
					`Cannot resolve package entry: cannot resolve "${arguments[0]}" without a package reference`,
				);
			}
		} finally {
			resolved ||
				console.log({specifier, specifierType, validPrefix, specifierPrefix, bareSpecifier, packageEntry, packageID});
		}
	}
}
