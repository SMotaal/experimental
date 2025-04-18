﻿# ConRes › Target Definitions

<script type="module" src="./targets.spec.js"></script>

## RegExp Matcher Prototype <code tag>Experimental</code>

> **FYI**: This work builds on top of the earlier [RegExp Tokenizer Prototype](/meta/@conres/targets/RegExp-Tokenizer-Prototype.md) efforts.

### Motivating Example

<details><summary><b>Target Definition</b></summary>

<!--prettier-ignore-start-->

```log

 [ Target Definition File for ConRes35 Target ]

Target Name	Contrast-Resolution Test Target
Target Version	v3.5
Target Description	3 TV levels  12 Contrast steps  15 Resolution steps   Patch Size 9.02 mm
Reference File Name	Zz ConRes35_F.eps

Corners Paper to Corners Target (mm)	X even pages	Y even pages	X odd pages	Y odd pages
   UL corner 	42.9	-45.8	29.4	-32.3
   UR corner 	-24.2	-45.8	-37.7	-32.3
   LL corner 	42.9	49.8	29.4	63.3
   LR corner 	-24.2	49.8	-37.7	63.3

	X	Y
Paper Size (in)	8.26	11.0
Paper Size (mm)	209.9	279.4
Target Size frame (mm)	142.807	183.714	 [ Dimensions to center of thickness of frame ]
Block Size frame (mm)	125.264	156.252	 [ Dimensions to center of thickness of frame ]
Thickness of Target and Block Frames (mm)	0.24

Number of Pages	4
Number of TV Blocks	3
Number of Blocks per page	1
Addressability Indicator Block (PgNo)	NO
Screen Pattern Indicator Block (PgNo)	4
Contrast Steps Increments 	NO	 [ YES = Absolute, NO = Relative Contrast step increments ]
Patch Size (mm)	9.017
Margin between patches (mm)	1.312
Possible Color Spaces	SepK	SepC	SepM	SepY	RGB	sRGB	Gray	Lab
Selected Color	SepK
SpotCorrection	NO
Output Device	Acrobat Distiller 10.1.16
Addressability (spi)	600	 [ Set by Distiller, Indicated dimensions should be within � 0.02 mm (one spot) ]
Evenness Tint on Block 	0.0	 [ Tint value on background of block ]
Evenness Tint on Page 	0.7	 [ Tint value on background of Page ]
Licensed User Name	Saleh Abdel Motaal
Licensed User Code	573FS090120

Number of Resolution Steps	15	 [ Resolution steps are the same for all Tone Value Blocks ]
   Resolution Step Number	#1	#2	#3	#4	#5	#6	#7	#8	#9	#10	#11	#12	#13	#14	#15
   Resolution Step Value (lp/mm)	0.625	0.7367	0.8684	1.0237	1.2067	1.4224	1.6767	1.9764	2.3297	2.7462	3.2372	3.8159	4.498	5.3021	6.25

Number of Contrast Steps	12
Tone Value Blocks	Metrics			   UL Target to UL Fiducial		 UL Target to UL Block Frame		Contrast
	Tone (TV%)	Block No.	Page No.	Xoffset (mm)	Yoffset (mm)	Xoffset (mm)	Yoffset (mm)	A	B	C	D	E	F	G	H	I	J	K	L
	25	1	1	13.05	22.98	12.38	22.3	-	-	43.29%	28.48%	18.74%	12.33%	8.11%	5.34%	3.51%	2.31%	1.52%	1.0%
	50	2	2	13.05	22.98	12.38	22.3	100.0%	65.79%	43.29%	28.48%	18.74%	12.33%	8.11%	5.34%	3.51%	2.31%	1.52%	1.0%
	75	3	3	13.05	22.98	12.38	22.3	-	-	43.29%	28.48%	18.74%	12.33%	8.11%	5.34%	3.51%	2.31%	1.52%	1.0%


Spacing of Fiducial grid (mm)	10.329

Fiducial marks from UL corner mark
   X direction (mm)	0.0	10.329	20.659	30.988	41.317	51.647	61.976	72.305	82.635	92.964	103.293	113.623	123.952
   Y direction (mm)	0.0	10.329	20.659	30.988	41.317	51.647	61.976	72.305	82.635	92.964	103.293	113.623	123.952	134.281	144.611	154.94


	Width	Length
Step Wedge Size frame (mm)	26.773	195.8	 [ Dimensions to center of thickness of frame ]

Number of Steps on Step Wedge	21
Width of Steps excluding sep. bar (mm)	8.0
Width of separation bar (mm)	0.9
Thickness of Wedge Frame (mm)	0.24
Height of Steps (mm)	10.0
Width of band for Labels (mm)	3.387
Distance Zero to Solid patch (mm)	178.0

Nominal TV Flag 	0	 [ When set to zero then Linearization is off and only nominal values are used. ]
Number of measurements on Wedge	1	 [ If there are zero measurements, the file defaults to Nom. TVs even when the Nom. TV Flag is 1. ]
Nominal TV Array (TV%) 	0	5	10	15	20	25	30	35	40	45	50	55	60	65	70	75	80	85	90	95	100

Step Wedge Coordinates from UL corner of Target to center of Zero or Solid patches (mm)
		Wedge	    Zero TV Nominal Step 		   Zero TV Linearized Step		     Solid TV Nominal Step 		    Solid TV Linearized Step
	(PageNo)	Rotation (degrees)	X	Y	X	Y	X	Y	X	Y
	 1	 0	 -11.6	 -195.4	 -11.6	 -205.4	 166.4	 -195.4	 166.4	 -205.4
	 2	 90	 21.7	 -205.8	 11.7	 -205.8	 21.7	 -27.8	 11.7	 -27.8
	 3	 -180	 158.6	 -205.4	 158.6	 -195.4	 -19.4	 -205.4	 -19.4	 -195.4
	 4	 -90	 11.7	 -35.5	 21.7	 -35.5	 11.7	 -213.5	 21.7	 -213.5
```

<!--prettier-ignore-end-->

</details>

<details open><summary><b>Generated Tokens</b></summary>
<figure overflow-y:=scroll max-height:= 75vh position:=relative>
<output><script defer src="./tokens.spec.js"></script></output>
</figure>
</details>

### Syntax Grammar

The formal syntax is tentatively documented in the public [Fluent Data Format](/meta/public/Fluent-Data-Format.md) document.

### Matcher Definitions

```js line-wrap markup-mode=es
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
