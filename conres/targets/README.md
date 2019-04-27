# ConRes › Target Definitions

<script type="module" src="./tabular.matcher.spec.js"></script>

## Parser: Let's build a `RegEx` parser!

`RegEx` is JavaScript's way of allowing us to quickly search for string patterns using many of the popular Regular Expression facilities.

If you are not familiar with Regular Expressions, they are basically a concept that exists in almost every programming language to declaratively define conditional patterns for string matching. The declarative nature of regular expressions paired with the "somewhat" common notation they share across many languages are their most notable selling point.

<figcaption><b>TDF Example</b></figcaption>

```log
Target Name and Version	Contrast-Resolution Test Target  9x10x10  v3.5
Target Description 	9 TV levels  10 Contrast steps  10 Resolution steps   Patch Size 8.0 mm

Corners Paper to Target (mm)	X even pages	Y even pages	X odd pages	Y odd pages
   UL corner 	62.8	-27.9	49.5	-14.6
   UR corner 	-44.5	-27.9	-57.7	-14.6
   LL corner 	62.8	31.9	49.5	45.1
   LR corner 	-44.5	31.9	-57.7	45.1

Target Origin 	UL

	X	Y
Target Size frame (in)	4.277	8.649
Target Size frame (mm)	108.64	219.67
Block Size tight frame (mm)	93.05	93.05

Number of Pages	6
Number of Blocks per page	2
Number of TV Blocks	9
Addressability Indicator Block	1
Screen Pattern Indicator Block	1
FullCsteps 	1
Patch Size (mm)	8.001
Margin between patches (mm)	1.185
Addressability (spi)	600
Color	K
SpotCorrection	Off
Output Device	Acrobat Distiller 10.1.16
Licensed User	Franz Sigg, Eric Zeise, Saleh Abdel Motaal   540FS270319

	X	Y
Paper Size (in)	8.5	11.0	Letter
Paper Size (mm)	216	279

Number of Resolution Steps	10	(Resolution steps are the same for all Tone Value Blocks)
   RStep Count	1	2	3	4	5	6	7	8	9	10
   Resolution (lp/mm)	0.625	0.808	1.042	1.348	1.736	2.242	2.907	3.759	4.854	6.25

Number of Contrast Steps	10
Tone Value Blocks	Metrics			   UL Target to UL Fiducial		 UL Target to UL Block Frame		Contrast
	Tone (TV%)	Block No.	Page No.	Xoffset (mm)	Yoffset(mm)	Xoffset (mm)	Yoffset (mm)	A	B	C	D	E	F	G	H	I	J
	10	1	1	11.59	20.39	10.99	19.79	20.0%	14.34%	10.28%	7.37%	5.28%	3.79%	2.71%	1.95%	1.39%	1.0%
	20	2	1	11.59	122.63	10.99	122.03	40.0%	26.55%	17.62%	11.7%	7.76%	5.15%	3.42%	2.27%	1.51%	1.0%
	30	3	2	11.59	20.39	10.99	19.79	60.0%	38.07%	24.15%	15.33%	9.72%	6.17%	3.91%	2.48%	1.58%	1.0%
	40	4	2	11.59	122.63	10.99	122.03	80.0%	49.16%	30.21%	18.57%	11.41%	7.01%	4.31%	2.65%	1.63%	1.0%
	50	5	3	11.59	20.39	10.99	19.79	100.0%	59.95%	35.94%	21.54%	12.92%	7.74%	4.64%	2.78%	1.67%	1.0%
	60	6	3	11.59	122.63	10.99	122.03	80.0%	49.16%	30.21%	18.57%	11.41%	7.01%	4.31%	2.65%	1.63%	1.0%
	70	7	4	11.59	20.39	10.99	19.79	60.0%	38.07%	24.15%	15.33%	9.72%	6.17%	3.91%	2.48%	1.58%	1.0%
	80	8	4	11.59	122.63	10.99	122.03	40.0%	26.55%	17.62%	11.7%	7.76%	5.15%	3.42%	2.27%	1.51%	1.0%
	90	9	5	11.59	20.39	10.99	19.79	20.0%	14.34%	10.28%	7.37%	5.28%	3.79%	2.71%	1.95%	1.39%	1.0%


Spacing of Fiducial grid (mm)	9.186

Fiducial marks from UL corner mark
   X direction (mm)	0.0	9.186	18.373	27.559	36.745	45.932	55.118	64.304	73.491	82.677	91.863
   Y direction (mm)	0.0	9.186	18.373	27.559	36.745	45.932	55.118	64.304	73.491	82.677	91.863


Number of Steps on StepWedge	21
Width of steps excluding sep. bar (mm)	8.0
Width of separation bar (mm)	0.9
Height of steps (mm)	9.889
Distance Zero to Solid patch (mm)	178.0
NominalTVflag 	1	(When set to zero then Linearization is off, only nominal values are used.)
NominalTVArray (%) 	0	5	10	15	20	25	30	35	40	45	50	55	60	65	70	75	80	85	90	95	100
LinearizedTvArray (%) 	0.0	8.5	16.3	24.5	30.6	35.3	39.0	42.3	45.5	48.9	52.3	55.7	59.1	62.5	66.0	69.8	75.0	81.3	87.5	94.5	100.0

Step Wedge Coordinates from 	Positions	   Zero TV Nominal Step 		   Zero TV Linearized Step		    Solid TV Nominal Step 		    Solid TV Linearized Step
  UL corner of Target to center of 	PageNo 	X Nom 	Y Nom 	X Lin 	Y Lin	X Nom 	Y Nom 	X Lin 	Y Lin
  Zero or Solid patch (mm)	 1	 -28.1	 231.1	 -28.1	 241.0	 149.9	 231.1	 149.9	 241.0
	 2	 -21.4	 222.6	 -11.5	 222.6	 -21.4	 44.6	 -11.5	 44.6
	 3	 141.0	 241.0	 141.0	 231.1	 -37.0	 241.0	 -37.0	 231.1
	 4	 -11.5	 53.5	 -21.4	 53.5	 -11.5	 231.5	 -21.4	 231.5
	 5	 -28.1	 231.1	 -28.1	 241.0	 149.9	 231.1	 149.9	 241.0
	 6	 -21.4	 222.6	 -11.5	 222.6	 -21.4	 44.6	 -11.5	 44.6
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
