export interface Mismatch {
  start: number
  length: number
  type: string
  base: string
  altbase?: string
  seq?: string
  cliplen?: number
}

export function parseCigar(cigar: string) {
  return cigar.split(/([MIDNSHPX=])/)
}
export function cigarToMismatches(ops: string[], seq: string): Mismatch[] {
  let currOffset = 0
  let seqOffset = 0
  const mismatches: Mismatch[] = []
  for (let i = 0; i < ops.length - 1; i += 2) {
    const len = +ops[i]
    const op = ops[i + 1]
    if (op === 'M' || op === '=' || op === 'E') {
      seqOffset += len
    }
    if (op === 'I') {
      // GAH: shouldn't length of insertion really by 0, since JBrowse internally uses zero-interbase coordinates?
      mismatches.push({
        start: currOffset,
        type: 'insertion',
        base: `${len}`,
        length: 1,
      })
      seqOffset += len
    } else if (op === 'D') {
      mismatches.push({
        start: currOffset,
        type: 'deletion',
        base: '*',
        length: len,
      })
    } else if (op === 'N') {
      mismatches.push({
        start: currOffset,
        type: 'skip',
        base: 'N',
        length: len,
      })
    } else if (op === 'X') {
      const r = seq.slice(seqOffset, seqOffset + len)
      for (let j = 0; j < len; j++) {
        mismatches.push({
          start: currOffset + j,
          type: 'mismatch',
          base: r[j],
          length: 1,
        })
      }
      seqOffset += len
    } else if (op === 'H') {
      mismatches.push({
        start: currOffset,
        type: 'hardclip',
        base: `H${len}`,
        cliplen: len,
        length: 1,
      })
    } else if (op === 'S') {
      mismatches.push({
        start: currOffset,
        type: 'softclip',
        base: `S${len}`,
        cliplen: len,
        length: 1,
      })
      seqOffset += len
    }

    if (op !== 'I' && op !== 'S' && op !== 'H') {
      currOffset += len
    }
  }
  return mismatches
}

/**
 * parse a SAM MD tag to find mismatching bases of the template versus the reference
 * @returns array of mismatches and their positions
 */
export function mdToMismatches(
  mdstring: string,
  cigarOps: string[],
  cigarMismatches: Mismatch[],
  seq: string,
): Mismatch[] {
  const mismatchRecords: Mismatch[] = []
  let curr: Mismatch = { start: 0, base: '', length: 0, type: 'mismatch' }
  const hasSkip = cigarMismatches.find(cigar => cigar.type === 'skip')
  let lastCigar = 0
  let lastTemplateOffset = 0
  let lastRefOffset = 0

  // convert a position on the reference sequence to a position
  // on the template sequence, taking into account hard and soft
  // clipping of reads

  function nextRecord(): void {
    // correct the start of the current mismatch if it comes after a cigar skip
    if (hasSkip) {
      cigarMismatches.forEach((mismatch: Mismatch) => {
        if (mismatch.type === 'skip' && curr.start >= mismatch.start) {
          curr.start += mismatch.length
        }
      })
    }

    // record it
    mismatchRecords.push(curr)

    // get a new mismatch record ready
    curr = {
      start: curr.start + curr.length,
      length: 0,
      base: '',
      type: 'mismatch',
    }
  }

  function getTemplateCoordLocal(refCoord: number): number {
    let templateOffset = lastTemplateOffset
    let refOffset = lastRefOffset
    for (
      let i = lastCigar;
      i < cigarOps.length && refOffset <= refCoord;
      i += 2, lastCigar = i
    ) {
      const len = +cigarOps[i]
      const op = cigarOps[i + 1]
      if (op === 'S' || op === 'I') {
        templateOffset += len
      } else if (op === 'D' || op === 'P') {
        refOffset += len
      } else if (op !== 'H') {
        templateOffset += len
        refOffset += len
      }
    }
    lastTemplateOffset = templateOffset
    lastRefOffset = refOffset
    return templateOffset - (refOffset - refCoord)
  }

  // now actually parse the MD string
  const md = mdstring.match(/(\d+|\^[a-z]+|[a-z])/gi) || []
  for (let i = 0; i < md.length; i++) {
    const token = md[i]
    if (token.match(/^\d/)) {
      curr.start += parseInt(token, 10)
    } else if (token.match(/^\^/)) {
      curr.length = token.length - 1
      curr.base = '*'
      curr.type = 'deletion'
      curr.seq = token.substring(1)
      nextRecord()
    } else if (token.match(/^[a-z]/i)) {
      // mismatch
      for (let j = 0; j < token.length; j += 1) {
        curr.length = 1
        curr.base = seq
          ? seq.substr(
              cigarOps ? getTemplateCoordLocal(curr.start) : curr.start,
              1,
            )
          : 'X'
        curr.altbase = token
        nextRecord()
      }
    }
  }
  return mismatchRecords
}

export function getTemplateCoord(refCoord: number, cigarOps: string[]): number {
  let templateOffset = 0
  let refOffset = 0
  for (let i = 0; i < cigarOps.length && refOffset <= refCoord; i += 2) {
    const len = +cigarOps[i]
    const op = cigarOps[i + 1]
    if (op === 'S' || op === 'I') {
      templateOffset += len
    } else if (op === 'D' || op === 'P') {
      refOffset += len
    } else if (op !== 'H') {
      templateOffset += len
      refOffset += len
    }
  }
  return templateOffset - (refOffset - refCoord)
}

export function getMismatches(
  cigarString: string,
  mdString: string,
  seq: string,
): Mismatch[] {
  let mismatches: Mismatch[] = []
  let cigarOps: string[] = []

  // parse the CIGAR tag if it has one
  if (cigarString) {
    cigarOps = parseCigar(cigarString)
    mismatches = mismatches.concat(cigarToMismatches(cigarOps, seq))
  }

  // now let's look for CRAM or MD mismatches
  if (mdString) {
    mismatches = mismatches.concat(
      mdToMismatches(mdString, cigarOps, mismatches, seq),
    )
  }

  // uniqify the mismatches
  const seen: { [index: string]: boolean } = {}
  return mismatches.filter(m => {
    const key = `${m.type},${m.start},${m.length}`
    const s = seen[key]
    seen[key] = true
    return !s
  })
}

export function generateMD(target: string, query: string, cigar: string) {
  let q_off = 0
  let t_off = 0
  let l_MD = 0
  const cigarOps = parseCigar(cigar)
  let str = ''
  for (let i = 0; i < cigarOps.length; i += 2) {
    const len = +cigarOps[i]
    const op = cigarOps[i + 1]
    if (op === 'M' || op == 'X' || op == '=') {
      for (let j = 0; j < len; j++) {
        // console.log(query[q_off + j], q_off + j, target[t_off + j], t_off + j)
        if (query[q_off + j].toLowerCase() != target[t_off + j].toLowerCase()) {
          str += `${l_MD}${target[t_off + j].toUpperCase()}`
        } else {
          l_MD++
        }
      }
      q_off += len
      t_off += len
    } else if (op === 'I') {
      q_off += len
    } else if (op === 'D') {
      let tmp = ''
      for (let j = 0; j < len; j++) {
        tmp += target[t_off + j].toUpperCase()
      }
      str += `${l_MD}^${tmp}`
      l_MD = 0
      t_off += len
    } else if (op === 'N') {
      t_off += len
    }
  }
  return str
}

// note "MIDNSHP=XB" ops
// static void write_MD_core(kstring_t *s, const uint8_t *tseq, const uint8_t *qseq, const mm_reg1_t *r, char *tmp, int write_tag)
// {
//   int i, q_off, t_off, l_MD = 0;
//   if (write_tag) mm_sprintf_lite(s, "\tMD:Z:");
//   for (i = q_off = t_off = 0; i < (int)r->p->n_cigar; ++i) {
//     int j, op = r->p->cigar[i]&0xf, len = r->p->cigar[i]>>4;
//     assert((op >= 0 && op <= 3) || op == 7 || op == 8);
//     if (op == 0 || op == 7 || op == 8) { // match
//       for (j = 0; j < len; ++j) {
//         if (qseq[q_off + j] != tseq[t_off + j]) {
//           mm_sprintf_lite(s, "%d%c", l_MD, "ACGTN"[tseq[t_off + j]]);
//           l_MD = 0;
//         } else ++l_MD;
//       }
//       q_off += len, t_off += len;
//     } else if (op == 1) { // insertion to ref
//       q_off += len;
//     } else if (op == 2) { // deletion from ref
//       for (j = 0, tmp[len] = 0; j < len; ++j)
//         tmp[j] = "ACGTN"[tseq[t_off + j]];
//       mm_sprintf_lite(s, "%d^%s", l_MD, tmp);
//       l_MD = 0;
//       t_off += len;
//     } else if (op == 3) { // reference skip
//       t_off += len;
//     }
//   }
//   if (l_MD > 0) mm_sprintf_lite(s, "%d", l_MD);
//   assert(t_off == r->re - r->rs && q_off == r->qe - r->qs);
// }
