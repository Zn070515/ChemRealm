# M6 instrument reference register

**Status:** implementation evidence register; not owner visual acceptance.

This register separates facts about laboratory instruments from ChemRealm's
derived visual construction. A cited source may establish a family, capacity,
marking convention, or a dimension; it does not automatically establish every
other field in the SVG. Missing source conditions remain missing.

## First-wave records

| Asset | Direct source anchor | Source-backed facts | Derived/approximate facts | Boundary |
|---|---|---|---|---|
| `burette-acid-25ml-class-as` | [DWK DURAN 25 mL Class AS](https://www.dwk.com/duran-burette-class-as-with-schellbach-stripe-and-ptfe-key-25-ml-243303304) | 25 mL family, Ex marking, 0.05 mL interval, PTFE key, 20 °C calibration context where stated | 30 × 820 mm envelope, 24–744 mm marking span, stroke/glass treatment | No claim beyond the cited product fields; source record does not invent pressure or tolerance |
| `burette-alkali-50ml-class-b` | [JY/T 0655-2025](https://www.moe.gov.cn/srcsite/A06/s3732/202507/W020250701322477393561.pdf) plus the repository family-anchor record | school alkali-burette family context | 50 mL dimensions, rubber tube/glass bead/pinch anatomy, 5 mL labelled interval, 0.1 mL visual minor spacing | Explicitly approximate; no Class B tolerance or manufacturer identity is asserted |
| `beaker-250ml` | [Corning PYREX VISTA Griffin 250 mL](https://ecatalog.corning.com/life-sciences/b2c/US/en/General-Labware/Beakers/Beakers%2C-Glass/PYREX%C2%AE-VISTA%E2%84%A2-Beakers%2C-Standard-Low-Griffin/p/70000-250) | approximately 70 mm OD × 95 mm high; approximate 25–200 mL content graduations at 25 mL | 85 mm spout-inclusive envelope, wall thickness and exact vector curves | Marks are approximate contained volume, never analytical delivery volume |
| `conical-flask-250ml` | [DWK DURAN 250 mL Erlenmeyer](https://www.dwk.com/duran-erlenmeyer-flask-with-din-thread-without-cap-250-ml-218033604) | approximately 85 mm diameter × 145 mm height family anchor | neck/shoulder transition, edge widths, highlight placement | No scale is inferred from capacity |

## Classification vocabulary

- `source`: directly copied as a normalized value only when the source states
  the value and relevant condition.
- `derived`: deterministic construction value calculated from a source-backed
  envelope or a declared geometric relationship.
- `interpolated`: value placed between cited table points; the source points
  and interpolation method must both be recorded.
- `pedagogicalApproximation`: a visually useful classroom representation with
  an explicit non-metrological claim.

The manifest/source JSON stores normalized values. The per-master measurement
sheet stores the classification and the source-record markdown explains the
claim scope. A source that gives `1` does not become `1.000` merely because the
JSON can represent three decimal places; `reportedPrecision: not-stated` is
the correct result.

## Zhejiang/NOBOOK research boundary

[NOBOOK's public chemistry laboratory materials](https://www.nobook.com/view/91)
are product-organization and apparatus-abundance research: multiple sizes,
detachable tubing, ports, and contextual inspection are valuable product
lessons. They are not an art source and do not establish ChemRealm geometry or
chemical truth.

[Zhejiang Education Examination Authority laboratory guidance](https://www.zjzs.net/art/2020/7/11/art_46_5302.html)
and [JY/T 0655-2025](https://www.moe.gov.cn/srcsite/A06/s3732/202507/W020250701322477393561.pdf)
support the educational relevance of instrument literacy and school-lab
families. They do not replace a manufacturer or standards source for a
particular dimension or calibration claim.

## Review boundary

The register supports Contract Audit and Instrument Audit. It does not prove
the visual masters are attractive, that a future measurement view is readable,
or that the package is ready for M6 S3. Strong-acid phenolphthalein orange is a
documented optical follow-up/refusal boundary, not an implementation claim in
this asset pass.
