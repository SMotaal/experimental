import {SegmentMatcher} from '/markup/packages/matcher/lib/segment-matcher.js';
import {Matches} from '/markup/packages/matcher/helpers.js';

export const matcher = (() => {
	const Feed = () => SegmentMatcher.define(entity => SegmentMatcher.sequence/* regexp */ `(${entity('feed')})`, 'giu');
	const Slug = () => SegmentMatcher.define(entity => SegmentMatcher.sequence/* regexp */ `(\S.*?${entity('slug')})`, 'giu');
	const Row = ({cells = Cell()} = {}) =>
		SegmentMatcher.define(
			entity => SegmentMatcher.sequence/* regexp */ `(
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
		SegmentMatcher.define(
			entity =>
				// cells — where ‹…\t›
				SegmentMatcher.sequence/* regexp */ `
          (?: *)
          ${void SegmentMatcher.sequence/* regexp */ `(?=[^\s\t\n\r]+.*? *(?:[\t\n\r]|$))`}
          (?:${SegmentMatcher.join(
						// comment — is ‹[ … ]›
						entity(Comment({body: SegmentMatcher.sequence/* regexp */ `[^\t\n\r\)]+`})),

						// value — or is where ‹…› and maybe ‹ (…)›
						entity(Value()),

						// empty — or is ‹›
						entity(Empty()),
					)})
          (?: *)
          (${entity(SegmentMatcher.DELIMITER)}[\t\n\r]|$)
        `,
			'giu',
		);
	const Empty = () => SegmentMatcher.define(entity => SegmentMatcher.sequence/* regexp */ `(${entity('empty')})(?= *\t)`, 'giu');
	const Value = () =>
		SegmentMatcher.define(
			entity =>
				SegmentMatcher.sequence/* regexp */ `(?:${SegmentMatcher.join(
					// numeric — is ‹…\d…›
					SegmentMatcher.sequence/* regexp */ `(
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
					SegmentMatcher.sequence/* regexp */ `(\S.*?${entity('sequence')})`,
				)})(?: *${
					// unit — which might have ‹(…)›
					SegmentMatcher.sequence/* regexp */ `\((\b\D\S+(?:\b[.%]?|\b)${entity('unit')})\)`
				}|)`,
			'giu',
		);
	const Comment = ({body = `.*?`} = {}) =>
		SegmentMatcher.define(entity => SegmentMatcher.sequence/* regexp */ `\[ +(${body}${entity('comment')}) +\]`, 'giu');
	const Definition = () =>
		SegmentMatcher.define(
			entity =>
				// lines — where ‹^ … $›
				SegmentMatcher.sequence/* regexp */ `^ *(?:${SegmentMatcher.join(
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
