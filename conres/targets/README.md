# ConRes › Target Definitions

<script type="module" src="./tabular.matcher.spec.js"></script>

## RegExp Matcher Prototype <code tag>Experimental</code>

<blockquote>

**FYI**: This work builds on top of the earlier [RegExp Tokenizer Prototype](/meta/@conres/targets/RegExp-Tokenizer-Prototype.md) efforts.

</blockquote>

### Motivating Example

<details><summary><b>Target Definition</b></summary>

<!--prettier-ignore-start-->

```log
Target Name	Contrast-Resolution Test Target
Target Version	v3.5
Target Description 	9 TV levels  10 Contrast steps  10 Resolution steps   Patch Size 8.0 mm

Corners Paper to Target (mm)	X even pages	Y even pages	X odd pages	Y odd pages
   UL corner 	62.9	-27.9	49.5	-14.5
   UR corner 	-44.4	-27.9	-57.7	-14.5
   LL corner 	62.9	31.9	49.5	45.2
   LR corner 	-44.4	31.9	-57.7	45.2

Target Origin 	UL

	X	Y
Target Size frame (in)	4.277	8.649
Target Size frame (mm)	108.64	219.67
Block Size tight frame (mm)	93.05	93.05

Number of Pages	6
Number of Blocks per page	2
Number of TV Blocks	9
Addressability Indicator Block	YES
Screen Pattern Indicator Block	YES
FullCsteps 	YES
Patch Size (mm)	8.001
Margin between patches (mm)	1.185
Addressability (spi)	600
Color	K
SpotCorrection	NO
Output Device	Acrobat Distiller 10.1.16
Licensed User	Not Validated  987654321

	X	Y
Paper Size (in)	8.5	11.0	[ Letter ]
Paper Size (mm)	216	279

Number of Resolution Steps	10	[ Resolution steps are the same for all Tone Value Blocks ]
   RStep Count	1	2	3	4	5	6	7	8	9	10
   Resolution (lp/mm)	0.625	0.808	1.042	1.348	1.736	2.242	2.907	3.759	4.854	6.25

Number of Contrast Steps	10
Tone Value Blocks	Metrics			   UL Target to UL Fiducial		 UL Target to UL Block Frame		Contrast
	Tone (TV%)	Block No.	Page No.	Xoffset (mm)	Yoffset (mm)	Xoffset (mm)	Yoffset (mm)	A	B	C	D	E	F	G	H	I	J
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
Height of steps (mm)	10.0
Distance Zero to Solid patch (mm)	178.0
NominalTVflag 	1	[ When set to zero then Linearization is off, only nominal values are used. ]
NominalTVArray (TV%) 	0	5	10	15	20	25	30	35	40	45	50	55	60	65	70	75	80	85	90	95	100
LinearizedTvArray (TV%) 	0.0	8.5	16.3	24.5	30.6	35.3	39.0	42.3	45.5	48.9	52.3	55.7	59.1	62.5	66.0	69.8	75.0	81.3	87.5	94.5	100.0

Step Wedge Coordinates from UL corner of Target to center of Zero or Solid patch (mm)
	Positions	   Zero TV Nominal Step 		   Zero TV Linearized Step		    Solid TV Nominal Step 		    Solid TV Linearized Step
	PageNo 	X Nom 	Y Nom 	X Lin 	Y Lin	X Nom 	Y Nom 	X Lin 	Y Lin
	 1	 -28.1	 231.2	 -28.1	 241.2	 149.9	 231.2	 149.9	 241.2
	 2	 -21.5	 222.6	 -11.5	 222.6	 -21.5	 44.6	 -11.5	 44.6
	 3	 141.0	 241.2	 141.0	 231.2	 -37.0	 241.2	 -37.0	 231.2
	 4	 -11.5	 53.5	 -21.5	 53.5	 -11.5	 231.5	 -21.5	 231.5
	 5	 -28.1	 231.2	 -28.1	 241.2	 149.9	 231.2	 149.9	 241.2
	 6	 -21.5	 222.6	 -11.5	 222.6	 -21.5	 44.6	 -11.5	 44.6
```

<!--prettier-ignore-end-->

</details>

<details open><summary><b>Generated Tokens</b></summary>
<figure style="overflow-y: scroll; max-height: 75vh; margin: 0;   -webkit-overflow-scrolling: touch;">
<output><script defer src="./tokens.spec.js"></script></output>
</figure>
</details>

### Syntax Grammar

The formal syntax is tentatively documented in the public [Fluent Data Format](/meta/public/Fluent-Data-Format.md) document.

### Matcher Definitions

```js
sequences = {
	NUMERIC: sequence`
		(?:(?:[-+]|\b)(?:\d*\.\d+|\d+(?:\.(?:\d*)|)|\d+)%?(?=\W|$))|
		\d+E-?\d+|
		\d+\.\d+E-?\d+
	`,
	UNIT: sequence`\(\b\D\S*?(?:\b[.%]?|\b)\)`,
	SEQUENCE: sequence`\b(?:(?: *|\b *[-._/:,] *)\w.*?\b)+\S*?|\S+?`,
};

matcher = Matcher.define(
	entity =>
		sequence`^(?:
			(?:${entity((text, index, match) => {
				match.capture.row = Matcher.matchAll(text, matcher.row);
				match.identity = 'row';
			})} *(.*\t.*) *)|
			(?:${entity('slug')} *\[ +(.*\w.*) +\] *)|
			(?:${entity('slug')} *(.*\w.*) *)|
			(?:${entity('feed')} *())
		)$(?:\r\n|\n)?`,
	'gimu',
);

matcher.row = Matcher.define(
	entity =>
		sequence`(?: *(?:
			(?=[^\s\t\n\r]+.*? *(?:[\t\n\r]|$))(?:
				(?:${entity('comment')}\[ +([^\t\n\r\)]+) +\])|
				(?:
					(${entity((text, index, match) => {
						match.capture.numeric = parseFloat(text);
						match.identity = 'numeric';
					})}${sequences.NUMERIC})|
					(${(entity('sequence'), sequences.SEQUENCE)})
				)(?:(${(entity('unit'), sequences.UNIT)})|)
			)|
			(${entity('empty')}(?= *\t))
		) *)(${entity(DELIMITER)}[\t\n\r]|$)`,
	'giu',
);
```
