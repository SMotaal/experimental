import {Matcher} from '/modules/matcher/matcher.js';
import {Matches} from '/modules/matcher/helpers.js';

export const matcher = (() => {
	const Feed = () => Matcher.define(entity => Matcher.sequence`(${entity('feed')})`, 'giu');
	const Slug = () => Matcher.define(entity => Matcher.sequence`(\S.*?${entity('slug')})`, 'giu');
	const Row = ({cells = Cell()} = {}) =>
		Matcher.define(
			entity => Matcher.sequence`(
        .*\t.*
        ${entity((text, entity, match) => {
					// match.capture.row = Matcher.matchAll(text, cells);
					match.capture.row = text;
					match.capture.cells = new Matches(text, cells);
					match.identity = 'row';
				})}
      )`,
			'giu',
		);
	const Cell = () =>
		Matcher.define(
			entity =>
				// cells — where ‹…\t›
				Matcher.sequence`
          (?: *)
          ${void Matcher.sequence`(?=[^\s\t\n\r]+.*? *(?:[\t\n\r]|$))`}
          (?:${Matcher.join(
						// comment — is ‹[ … ]›
						entity(Comment({body: Matcher.sequence`[^\t\n\r\)]+`})),

						// value — or is where ‹…› and maybe ‹ (…)›
						entity(Value()),

						// empty — or is ‹›
						entity(Empty()),
					)})
          (?: *)
          (${entity(Matcher.DELIMITER)}[\t\n\r]|$)
        `,
			'giu',
		);
	const Empty = () => Matcher.define(entity => Matcher.sequence`(${entity('empty')})(?= *\t)`, 'giu');
	const Value = () =>
		Matcher.define(
			entity =>
				Matcher.sequence`(?:${Matcher.join(
					// numeric — is ‹…\d…›
					Matcher.sequence`(
            (?:(?:[-+]|\b)(?:\d*\.\d+|\d+(?:\.(?:\d*)|)|\d+)%?(?=\W|$))
            |\d+E-?\d+
            |\d+\.\d+E-?\d+
            ${entity((text, entity, match) => {
							match.capture.numeric = parseFloat(text);
							match.identity = 'numeric';
							text.endsWith('%') && (match.capture.unit = '%');
						})}
          )`,
					// sequence — or is ‹\S…›
					Matcher.sequence`(\S.*?${entity('sequence')})`,
				)})(?: *${
					// unit — which might have ‹(…)›
					Matcher.sequence`\((\b\D\S+(?:\b[.%]?|\b)${entity('unit')})\)`
				}|)`,
			'giu',
		);
	const Comment = ({body = `.*?`} = {}) =>
		Matcher.define(entity => Matcher.sequence`\[ +(${body}${entity('comment')}) +\]`, 'giu');
	const Definition = () =>
		Matcher.define(
			entity =>
				// lines — where ‹^ … $›
				Matcher.sequence`^ *(?:${Matcher.join(
					// comment — is ‹[ … ]›
					entity(Comment()),
					// row — or is ‹…\t…›
					entity(Row()),
					// slug — or is ‹…\S…›
					entity(Slug()),
					// feed — or is ‹›
					entity(Feed()),
				)}) *$(?:\r\n|\n)?`,
			'gimu',
		);

	return Definition();
})();
