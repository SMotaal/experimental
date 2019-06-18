# ConRes › Targets › Format

## Fields

### String Records

- Target Name
- Target Version
- Target Description
- Output Device
- Licensed User

### Enumerated Records

- Target Origin
- Color

### Increment Records

- Number of Pages
- Number of Blocks per page
- Number of TV Blocks
- Number of Resolution Steps
- Number of Contrast Steps
- Number of Steps on StepWedge

### Metric Records

- Patch Size (mm)
- Margin between patches (mm)
- Addressability (spi)
- Spacing of Fiducial grid (mm)
- Width of steps excluding sep. bar (mm)
- Width of separation bar (mm)
- Height of steps (mm)
- Distance Zero to Solid patch (mm)

### Switch Records

- Addressability Indicator Block
- Screen Pattern Indicator Block
- FullCsteps
- SpotCorrection
- NominalTVflag

### Array Records

- NominalTVArray (TV%)
- LinearizedTvArray (TV%)

### Complete Table Records

#### Titled Table Records

- Corners Paper to Target (mm)

  - Columns
    - X even pages
    - Y even pages
    - X odd pages
    - Y odd pages
  - Rows
    - UL corner
    - UR corner
    - LL corner
    - LR corner

- Tone Value Blocks

  - Columns
    - Metrics
      - Tone (TV%)
      - Block No.
      - Page No.
    - UL Target to UL Fiducial
      - Xoffset (mm)
      - Yoffset (mm)
    - UL Target to UL Block Frame
      - Xoffset (mm)
      - Yoffset (mm)
    - Contrast
      - A…J
  - Rows
    - 10…90

#### Slugged Table Records

- Fiducial marks from UL corner mark

  - Rows
    - X direction (mm)
    - Y direction (mm)

- Step Wedge Coordinates from UL corner of Target to center of Zero or Solid patch (mm)
  - Columns
    - Positions
      - PageNo
    - Zero TV Nominal Step
      - X Nom
      - Y Nom
    - Zero TV Linearized Step
      - X Lin
      - Y Lin
    - Solid TV Nominal Step
      - X Nom
      - Y Nom
    - Solid TV Linearized Step
      - X Lin
      - Y Lin
  - Rows
    - 1…6

### Problematic Table Records

- Untitled Table #1 (preceded by feed)

  - Columns
    - X
    - Y
  - Rows
    - Target Size frame (in)
    - Target Size frame (mm)
    - Block Size tight frame (mm)

- Untitled Table #2 (preceded by feed)

  - Columns
    - X
    - Y
  - Rows
    - Paper Size (in)
    - Paper Size (mm)

- Untitled Table #3 (preceded by related record)
  - Rows
    - RStep Count
    - Resolution (lp/mm)
