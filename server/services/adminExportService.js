import { Candidate } from '../models/Candidate.js';

/**
 * Sanitizes user-controlled text against CSV/Excel formula injection (CWE-1236).
 * Prepend a single quote if the string begins with =, +, -, @, or tab/CR.
 */
export function sanitizeFormulaInjection(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value).trim();
  if (str.length === 0) {
    return '';
  }

  const formulaChars = ['=', '+', '-', '@', '\t', '\r'];
  if (formulaChars.includes(str[0])) {
    return `'${str}`;
  }

  return str;
}

/**
 * Escapes values for standard RFC 4180 CSV export.
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  if (typeof val === 'number') return String(val);

  const sanitized = sanitizeFormulaInjection(val);
  const escaped = sanitized.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Fetches candidate records matching query filters for export.
 */
async function fetchCandidatesForExport(query = {}) {
  const matchStage = {};

  if (query.search) {
    const searchRegex = { $regex: query.search.trim(), $options: 'i' };
    matchStage.$or = [{ fullName: searchRegex }, { email: searchRegex }];
  }

  const dateMatch = {};
  if (query.from) dateMatch.$gte = new Date(query.from);
  if (query.to) dateMatch.$lte = new Date(query.to);

  if (Object.keys(dateMatch).length > 0) {
    matchStage.createdAt = dateMatch;
  }

  const pipeline = [
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $lookup: {
        from: 'attempts',
        localField: '_id',
        foreignField: 'candidateId',
        as: 'attempt',
      },
    },
    {
      $unwind: {
        path: '$attempt',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        assessmentStatus: { $ifNull: ['$attempt.status', 'not_started'] },
        netScore: '$attempt.scoreSummary.netScore',
        isPassed: '$attempt.scoreSummary.isPassed',
        submittedAt: '$attempt.submittedAt',
      },
    },
  ];

  if (query.assessmentStatus) {
    pipeline.push({ $match: { assessmentStatus: query.assessmentStatus } });
  }

  if (query.isPassed !== undefined) {
    const isPassedBool = query.isPassed === true || query.isPassed === 'true';
    pipeline.push({ $match: { isPassed: isPassedBool } });
  }

  pipeline.push({
    $project: {
      fullName: 1,
      email: 1,
      phoneNumber: 1,
      age: 1,
      gender: 1,
      highestQualification: 1,
      city: 1,
      createdAt: 1,
      assessmentStatus: 1,
      scoreSummary: '$attempt.scoreSummary',
      submittedAt: '$attempt.submittedAt',
    },
  });

  pipeline.push({ $sort: { createdAt: -1 } });

  return Candidate.aggregate(pipeline);
}

/**
 * Generates an RFC 4180 CSV export.
 */
export async function generateCandidatesCsv(query = {}) {
  const candidates = await fetchCandidatesForExport(query);

  const headers = [
    'Candidate Name',
    'Email',
    'Phone',
    'Age',
    'Gender',
    'Qualification',
    'City',
    'Registration Date',
    'Assessment Status',
    'Correct Answers',
    'Incorrect Answers',
    'Unattempted Questions',
    'Marks Gained',
    'Marks Deducted',
    'Net Score',
    'Percentage',
    'Pass/Fail Status',
    'Time Taken (Seconds)',
    'Submission Date',
  ];

  const rows = [headers.map(escapeCsvValue).join(',')];

  for (const c of candidates) {
    const s = c.scoreSummary;
    const isCompleted = c.assessmentStatus === 'completed' || c.assessmentStatus === 'timed_out';

    const row = [
      escapeCsvValue(c.fullName),
      escapeCsvValue(c.email),
      escapeCsvValue(c.phoneNumber || ''),
      c.age !== undefined ? c.age : '',
      escapeCsvValue(c.gender || ''),
      escapeCsvValue(c.highestQualification || ''),
      escapeCsvValue(c.city || ''),
      c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '',
      escapeCsvValue(c.assessmentStatus),
      isCompleted && s ? s.correctCount : 0,
      isCompleted && s ? s.incorrectCount : 0,
      isCompleted && s ? s.unattemptedCount : 10,
      isCompleted && s ? s.marksGained : 0,
      isCompleted && s ? s.marksDeducted : 0,
      isCompleted && s ? s.netScore : 0,
      isCompleted && s ? `${s.percentage}%` : '0%',
      isCompleted && s ? (s.isPassed ? 'Passed' : 'Failed') : 'N/A',
      isCompleted && s ? s.timeTakenSeconds : 0,
      c.submittedAt ? new Date(c.submittedAt).toISOString().replace('T', ' ').substring(0, 19) : 'N/A',
    ];

    rows.push(row.join(','));
  }

  return rows.join('\r\n');
}

/**
 * Generates a clean Excel XML (SpreadsheetML) document with strict typing
 * and formula injection protection.
 */
export async function generateCandidatesExcel(query = {}) {
  const candidates = await fetchCandidatesForExport(query);

  const headers = [
    'Candidate Name',
    'Email',
    'Phone',
    'Age',
    'Gender',
    'Qualification',
    'City',
    'Registration Date',
    'Assessment Status',
    'Correct Answers',
    'Incorrect Answers',
    'Unattempted Questions',
    'Marks Gained',
    'Marks Deducted',
    'Net Score',
    'Percentage',
    'Pass/Fail Status',
    'Time Taken (Seconds)',
    'Submission Date',
  ];

  const escapeXml = (unsafe) => {
    if (unsafe === null || unsafe === undefined) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  let rowsXml = '';

  // Header Row
  rowsXml += '    <Row>\n';
  for (const h of headers) {
    rowsXml += `      <Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>\n`;
  }
  rowsXml += '    </Row>\n';

  // Data Rows
  for (const c of candidates) {
    const s = c.scoreSummary;
    const isCompleted = c.assessmentStatus === 'completed' || c.assessmentStatus === 'timed_out';

    const safeName = escapeXml(sanitizeFormulaInjection(c.fullName));
    const safeEmail = escapeXml(sanitizeFormulaInjection(c.email));
    const safePhone = escapeXml(sanitizeFormulaInjection(c.phoneNumber || ''));
    const safeGender = escapeXml(sanitizeFormulaInjection(c.gender || ''));
    const safeQual = escapeXml(sanitizeFormulaInjection(c.highestQualification || ''));
    const safeCity = escapeXml(sanitizeFormulaInjection(c.city || ''));
    const regDate = c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '';
    const safeStatus = escapeXml(sanitizeFormulaInjection(c.assessmentStatus));

    const correctCount = isCompleted && s ? s.correctCount : 0;
    const incorrectCount = isCompleted && s ? s.incorrectCount : 0;
    const unattemptedCount = isCompleted && s ? s.unattemptedCount : 10;
    const marksGained = isCompleted && s ? s.marksGained : 0;
    const marksDeducted = isCompleted && s ? s.marksDeducted : 0;
    const netScore = isCompleted && s ? s.netScore : 0;
    const percentage = isCompleted && s ? `${s.percentage}%` : '0%';
    const passStatus = isCompleted && s ? (s.isPassed ? 'Passed' : 'Failed') : 'N/A';
    const timeTaken = isCompleted && s ? s.timeTakenSeconds : 0;
    const subDate = c.submittedAt ? new Date(c.submittedAt).toISOString().replace('T', ' ').substring(0, 19) : 'N/A';

    rowsXml += '    <Row>\n';
    rowsXml += `      <Cell><Data ss:Type="String">${safeName}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="String">${safeEmail}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="String">${safePhone}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="Number">${c.age || 0}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="String">${safeGender}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="String">${safeQual}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="String">${safeCity}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="String">${regDate}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="String">${safeStatus}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="Number">${correctCount}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="Number">${incorrectCount}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="Number">${unattemptedCount}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="Number">${marksGained}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="Number">${marksDeducted}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="Number">${netScore}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="String">${percentage}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="String">${passStatus}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="Number">${timeTaken}</Data></Cell>\n`;
    rowsXml += `      <Cell><Data ss:Type="String">${subDate}</Data></Cell>\n`;
    rowsXml += '    </Row>\n';
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Candidates">
    <Table>
${rowsXml}    </Table>
  </Worksheet>
</Workbook>`;
}

export default {
  generateCandidatesCsv,
  generateCandidatesExcel,
  sanitizeFormulaInjection,
};
