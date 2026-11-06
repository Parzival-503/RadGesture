// The prior checklist's source tags: each line ends with the priors it came
// from, "[P2 3/14/2025]" or "[P1 1/5/2024, P2 3/14/2025]". Used by the
// checklist card to filter by prior; shared with the tests.

(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RGPriorTags = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const TAG = /\[(P\d[^\]]{0,80})\]\s*$/;

  // The prior numbers a line names, e.g. [1, 2]; [] when it has no tag.
  function priorsOf(line) {
    const m = TAG.exec(String(line || ''));
    if (!m) return [];
    const out = [];
    for (const p of m[1].matchAll(/\bP(\d{1,2})\b/g)) if (!out.includes(+p[1])) out.push(+p[1]);
    return out;
  }

  // Every prior named across the lines, in number order, each with the first
  // date written next to it: [{ n: 1, date: '1/5/2024' }, ...].
  function priorList(lines) {
    const found = new Map();
    for (const line of lines || []) {
      const m = TAG.exec(String(line || ''));
      if (!m) continue;
      for (const p of m[1].matchAll(/\bP(\d{1,2})\b\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2,4})?/g)) {
        const n = +p[1];
        if (!found.has(n) || (!found.get(n) && p[2])) found.set(n, p[2] || '');
      }
    }
    return [...found.keys()].sort((a, b) => a - b).map((n) => ({ n, date: found.get(n) }));
  }

  // Does the line belong under this filter? 0 = all. A line with no tag is
  // shown under every filter: its source is not known, so it is never hidden.
  function shows(line, n) {
    if (!n) return true;
    const ps = priorsOf(line);
    return !ps.length || ps.includes(n);
  }

  // The modality of an exam title: "CT ABDOMEN PELVIS W CONTRAST" -> "CT".
  // PET before CT (a PET-CT is read as PET), CTA as CT, MRA / MRCP as MRI.
  // "" when the title names none.
  const MODS = [
    ['PET', /\bPET\b|\bFDG\b|\bPSMA\b|\bDOTATATE\b/],
    ['MRI', /\bMRI?\b|\bMRA\b|\bMRCP\b|\bMRV\b|MAGNETIC RESONANCE/],
    ['CT', /\bCTA?\b|\bCAT SCAN\b|COMPUTED TOMOGRAPH/],
    ['Mammo', /\bMAMMO|\bMG\b|\bTOMOSYNTHESIS\b/],
    ['US', /\bUS\b|\bULTRASOUND\b|\bSONO|\bDOPPLER\b|\bDUPLEX\b|\bECHO\b/],
    ['NM', /\bNM\b|\bNUC|\bSPECT\b|\bSCINTI|\bBONE SCAN\b|\bHIDA\b|\bV\/?Q\b/],
    ['Fluoro', /\bFLUORO|\bESOPHAGRAM\b|\bSWALLOW\b|\bUGI\b/],
    ['XR', /\bXR\b|\bX-?RAY\b|\bRADIOGRAPH|\bCR\b|\bDX\b|\b\d\s*VIEWS?\b|\bPA\b|\bAP\b/],
  ];
  function modality(title) {
    const t = String(title || '').toUpperCase();
    for (const [m, re] of MODS) if (re.test(t)) return m;
    return '';
  }

  // The chip text for one prior: "P1 CT 3/14/2025". known = what the helper
  // read from each prior ({ n, date, title }), which wins over the tag's date.
  function chipLabel(p, known) {
    const k = (known || []).find((x) => +x.n === p.n) || {};
    const date = k.date || p.date || '';
    return ['P' + p.n, modality(k.title), date].filter(Boolean).join(' ');
  }

  return { priorsOf, priorList, shows, modality, chipLabel };
});
