# ConRes: Target Definitions

## Parser: Let's build a `RegEx` parser!

`RegEx` is JavaScript's way of allowing us to quickly search for string patterns using many of the popular Regular Expression facilities.

If you are not familiar with Regular Expressions, they are basically a concept that exists in almost every programming language to declaratively define conditional patterns for string matching. The declarative nature of regular expressions paired with the "somewhat" common notation they share across many languages are their most notable selling point.


<figcaption><b>TDF Example</b></figcaption>

```log
Target Name and Version	Contrast-Resolution Test Target  5x10x10  v3.5
Target Description 	5 TV levels, 10 Contrast steps (FullCsteps 0), 10 Resolution steps, Patch Size 8.0 mm
Number of Pages	4
Number of Blocks per page	2
Number of Total TV Blocks	5
FullCsteps 	0
Patch Size (mm)	8.0
Addressability (spi)	600
Color	K
SpotCorrection	Off
Output Device	Acrobat Distiller 10.1.16
Licensed User	Franz Sigg, Eric Zeise, Saleh Abdel Motaal   530FS140219
Target Origin 	UL

Number of Resolution Steps	10	(Resolution steps are the same for all Tone Value Blocks)
   RStep Count	1	2	3	4	5	6	7	8	9	10
   Resolution (lp/mm)	0.63	0.81	1.04	1.35	1.74	2.24	2.91	3.76	4.85	6.25

Number of Contrast Steps	10
Tone Value Blocks	Page No.	Block No.	Tone (TV%)	Xoffset (mm)	Yoffset (mm)	A	B	C	D	E	F	G	H	I	J
	1	1	10	11.6	20.4	-	-	-	-	12.92%	7.74%	4.64%	2.78%	1.67%	1.0%
	1	2	30	11.6	122.7	-	59.95%	35.94%	21.54%	12.92%	7.74%	4.64%	2.78%	1.67%	1.0%
	2	3	50	11.6	20.4	100.0%	59.95%	35.94%	21.54%	12.92%	7.74%	4.64%	2.78%	1.67%	1.0%
	2	4	70	11.6	122.7	-	59.95%	35.94%	21.54%	12.92%	7.74%	4.64%	2.78%	1.67%	1.0%
	3	5	90	11.6	20.4	-	-	-	-	12.92%	7.74%	4.64%	2.78%	1.67%	1.0%

Paper Size	Letter,  8.5 / 11 in

	X	Y
Target Size frame (in)	4.28	8.655
Target Size frame (mm)	108.7	219.8

Distance from Paper corner to Target corner (mm)	X	Y
   UL corner 	63.3	-27.8
   UR corner 	-43.9	-27.8
   LL corner 	63.3	31.8
   LR corner 	-43.9	31.8

Space between nodes of Fiducial grid (mm)	9.186

Coordinates of Fiducial marks X direction
   starting at upper left corner mark (mm)	0.0	9.186	18.373	27.559	36.745	45.932	55.118	64.304	73.491	82.677	91.863
   Pixels for scan of 1200 dpi (px)	0	434	868	1302	1736	2170	2604	3038	3472	3906	4340

Coordinates of Fiducial marks Y direction
   starting at upper left corner mark (mm)	0.0	9.186	18.373	27.559	36.745	45.932	55.118	64.304	73.491	82.677	91.863
   Pixels for scan of 1200 dpi (px)	0	434	868	1302	1736	2170	2604	3038	3472	3906	4340
```

### Basic Design

<figcaption><b>Baseline Parser</b></figcaption>

```js
function parse(source, state = {}, mode) {
  const mode = {
			matcher: /([ \t]+)|([\s\n]+)|(.+?(?=\s|\n|$))/g,
			types: ['space', 'feed', 'sequence'],
  };
	const tokens = tokenizer(source, state, mode);
	return tokens;
}
```

---

<figcaption><b>Baseline Tokenizer</b></figcaption>

```js
function* tokenize(source, state = {}, mode) {
  let matchIndex = state.matchIndex;
  const {matcher, types} = mode;

  while (!(matchIndex > state.matchIndex) && !(matchIndex > state.finalIndex)) {
    matchIndex = matcher.lastIndex = state.matchIndex;
    const match = matcher.exec(source);
    state.matchIndex = matcher.lastIndex;

    if (!match || !match[0]) return;
    const [text, ...matches] = match;
    const type = types[matches.findIndex(Boolean)];

    yield {type, text, index: match.index, length: text.length};
  }
}
```

### Considerations

#### Performance & Optimization

<blockquote float-right>

Further work is planned to collect empirical evidence that will compare the tokenization performance of `RegEx` against pure JavaScript scanner implementations.

</blockquote>

Historically, `RegEx` has often not been well received by many seasoned authors of JavaScript libraries due to cross-compatibility concerns related to function and deoptimizations.

Those concerns which almost certainly valid in the past cast an overstated shadow for the very common but greatly unfounded sentiment of aversion which backed by anecdodes of olden days.

Most modern runtime-compiled languages like JavaScript rely heavily on source code huerstics to iteratively optimize repetative execution calls. So code that executes more often get's optimized more often, as the runtime is able to confidently abbreviate safeguarding costs it deems unecessary in the repetitions of routines and subrodutines.

<hr clear-both/>

#### Comprehensability & Accuracy

<hr clear-both/>

#### Composability & Maintainability

<hr clear-both/>

<style src="styles.css"></style>
