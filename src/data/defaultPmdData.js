export const DEFAULT_RAW_CSV = `PMD,
ลำดับ,TagNo,Asset
1,C2IT10231728,PMD-01
2,C2IT11231668,PMD-02
3,C2IT10231630,PMD-03
4,C2IT09231725,PMD-04
5,C2IT10231730,PMD-05
6,C2IT10231633,PMD-06
7,C2IT10231634,PMD-07
8,C2IT10231635,PMD-08
9,C2IT10231636,PMD-09
10,C2IT10231637,PMD-10
11,C2IT10231638,PMD-11
12,,PMD-12
13,C2IT15231733,PMD-13
14,C2IT00231736,PMD-14
15,C2IT15231672,PMD-15
16,C2IT10231729,PMD-16
17,C2IT09231741,PMD-17
18,C2IT11231731,PMD-18
19,C2IT10231865,PMD-19
20,C2IT09231724,PMD-20
21,L1IT00231751,PMD-21
22,C1IT10231850,PMD-22
23,C1IT00240199,PMD-23
24,C1IT10231869,PMD-24
25,C2IT16231723,PMD-25
26,C1IT09231851,PMD-26
27,C2IT00231743,PMD-27
28,C1IT15231845,PMD-28
29,C1IT10231860,PMD-29
30,C1IT11231852,PMD-30
31,L1IT00231754,PMD-31
32,L1IT00231759,PMD-32
33,L1IT00231750,PMD-33
34,L1IT00231758,PMD-34
35,C1IT09231838,PMD-35
36,L1IT00231749,PMD-36
37,C2IT15231671,PMD-37
38,C1IT10231858,PMD-38
39,C1IT10231870,PMD-39
40,C1IT11231864,PMD-40
41,C1IT10231844,PMD-41
42,C1IT00240200,PMD-42
43,C2IT09231742,PMD-43
44,L1IT00231755,PMD-44
45,C1IT10231840,PMD-45
46,L1IT00231757,PMD-46
47,C1IT11231872,PMD-47
48,C1IT11231874,PMD-48
49,C1IT00231735,PMD-49
50,C2IT10231745,PMD-50
51,L1IT00231756,PMD-51
52,C1IT10231841,PMD-52
53,C1IT10231553,PMD-53
54,C1IT10231867,PMD-54
55,C1IT10231859,PMD-55
56,L1IT00231752,PMD-56
57,C2IT16231616,PMD-57
58,C1IT10231868,PMD-58
59,C1IT00240198,PMD-59
60,C1IT10231861,PMD-60
61,C1IT10231849,PMD-61
62,C1IT11231873,PMD-62
63,C2IT00231732,PMD-63
64,C3IT10231529,PMD-64
65,C2IT15231615,PMD-65
66,L1IT00231753,PMD-66
67,C1IT09231866,PMD-67
68,C1IT11231842,PMD-68
69,C2IT09231734,PMD-69
70,C1IT10231839,PMD-70
71,C1IT00231856,PMD-71
72,C1IT11231853,PMD-72
73,C1IT11231862,PMD-73
74,C1IT11231666,PMD-74
75,C1IT11231863,PMD-75
76,C1IT10231857,PMD-76
77,C1IT10231871,PMD-77
78,C1IT00231855,PMD-78
79,C1IT10231848,PMD-79
80,C1IT09231847,PMD-80
81,C1IT10231843,PMD-81
82,C1IT10231846,PMD-82`;

export function parsePmdCsv(csvString) {
  const lines = csvString.split(/\r?\n/);
  const items = [];
  let headerFound = false;
  let orderColIdx = 0;
  let tagColIdx = 1;
  let assetColIdx = 2;
  let headerTitles = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Parse CSV line handling commas and quotes
    const cols = trimmed.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    
    // Detect header row
    if (cols.some(c => c.includes('ลำดับ') || c.toLowerCase().includes('order') || c.toLowerCase().includes('no') || c.toLowerCase().includes('tag'))) {
      headerFound = true;
      headerTitles = cols;
      
      // Order Column
      orderColIdx = cols.findIndex(c => c.includes('ลำดับ') || c.toLowerCase().includes('order') || c.toLowerCase().includes('seq') || c.toLowerCase().includes('no'));
      if (orderColIdx === -1) orderColIdx = 0;
      
      // Tag Column
      tagColIdx = cols.findIndex(c => c.toLowerCase().includes('tag') || c.toLowerCase().includes('pmd') || c.toLowerCase().includes('qr') || c.toLowerCase().includes('code'));
      if (tagColIdx === -1) tagColIdx = orderColIdx === 0 ? 1 : 0;

      // Asset Column
      assetColIdx = cols.findIndex(c => c.toLowerCase().includes('asset') || c.includes('ทรัพย์สิน') || c.toLowerCase().includes('name') || c.toLowerCase().includes('model'));
      if (assetColIdx === -1) {
        // Fallback: look for third column if exists
        assetColIdx = cols.length > 2 ? 2 : -1;
      }
      continue;
    }

    if (!headerFound && (cols[0] === 'PMD' || cols.length < 2)) {
      continue;
    }

    const orderVal = cols[orderColIdx] !== undefined ? cols[orderColIdx] : '';
    const tagVal = cols[tagColIdx] !== undefined ? cols[tagColIdx] : '';
    const assetVal = (assetColIdx !== -1 && cols[assetColIdx] !== undefined) ? cols[assetColIdx] : '';

    if (orderVal || tagVal || assetVal) {
      items.push({
        id: `pmd-${orderVal || items.length + 1}-${tagVal}`,
        order: orderVal ? parseInt(orderVal, 10) || orderVal : items.length + 1,
        tagNo: tagVal.toUpperCase(),
        normalizedTag: tagVal.replace(/[^A-Z0-9]/gi, '').toUpperCase(),
        asset: assetVal || '',
        scanned: false,
        scannedAt: null,
        extraData: cols
      });
    }
  }

  return items;
}
