{{--
    resources/views/reports/lep/administrative_procedures.blade.php
    ──────────────────────────────────────────────────────────────────────────
    ADMINISTRATIVE PROCEDURES
    Whole-document editable section, same pattern as personnel_amelioration.

    Variables expected:
      $content   string  — full HTML of the document (from request, contenteditable output)
      $editable  bool    — true = render the editor page, false/absent = render for PDF
--}}

@php
$defaultContent = <<<'HTML'
<div class="ap-title">ADMINISTRATIVE PROCEDURES</div>

<div class="ap-item">
  <span class="ap-num">1.</span>
  <span class="ap-lead">Organizational and Staffing Pattern Changes.</span>
  <div class="ap-body">
    <p>Unless otherwise directed by the Local Chief Executive, no organizational changes in key positions in any office shall be authorized in their respective organizational structures and staffing patterns and funded from appropriations provided under this Act.</p>
  </div>
</div>

<div class="ap-item">
  <span class="ap-num">2.</span>
  <span class="ap-lead">Service Contracts.</span>
  <div class="ap-body">
    <p>LGU is hereby authorized to enter into service contracts, with other government agencies, private firms or individuals and non-government organizations for services related or incidental to their respective functions, whether on part-time or full-time basis.</p>
    <p>Service contracts may be entered into by the agency for professional consultancy services, which may include contracts with individual professional consultants who are experts in a field of special knowledge requiring highly specialized or technical expertise which cannot be provided by the regular staff of the agency. Such hiring creates no employer-employee relationship between the individual professional consultant and the LGU. The DBM, in coordination with other agencies concerned, shall issue the necessary guidelines governing professional consultancy services.</p>
    <p>Service contracts may also be entered into by the LGU for janitorial, security and other related services, whenever practicable and cost-effective for the government.</p>
    <p>Service contracts shall be entered into by the LGU through Public Bidding or other alternative methods of procurement in accordance with R.A. No. 9184 and its Implementing Rules and Regulations, subject to pertinent accounting and auditing rules and regulations.</p>
  </div>
</div>

<div class="ap-item">
  <span class="ap-num">3.</span>
  <span class="ap-lead">Implementation of Infrastructure Project.</span>
  <div class="ap-body">
    <p>In the hiring of workers needed for the implementation of infrastructure projects, priority shall be given to disadvantaged residents of the LGUs where the project is located.</p>
  </div>
</div>

<div class="ap-item">
  <span class="ap-num">4.</span>
  <span class="ap-lead">Electronic Interconnection.</span>
  <div class="ap-body">
    <p>Through the Internet and E-Commerce Application, the LGU or any of its Offices may use existing appropriations to install an electronic "on-line" network to facilitate the open, speedy and efficient electronic "on-line" transmission, conveyance and use of electronic data messages or electronic documents consistent with R.A. No. 8792, or the E-Commerce Act. The appropriations made possible for the E-Commerce application may be used in the acquisition of computer equipment, preferably on a lease basis, whenever applicable.</p>
  </div>
</div>

<div class="ap-item">
  <span class="ap-num">5.</span>
  <span class="ap-lead">Strict Adherence to Procedures, Laws, Rules and Regulations.</span>
  <div class="ap-body">
    <p>In the procurement of infrastructure projects, goods and consulting services, strict adherence to the provisions of R.A. No. 9184 and its Implementing Rules and Regulations (IRR) shall be observed: PROVIDED, that the Government Electronic Procurement System (G-EPS) shall be used as the primary source of information, pursuant to R.A. No. 9184 and its IRR.</p>
    <p>Consistent with the policy of transparency and to achieve efficiency in the procurement of common use goods: PROVIDED, FURTHER, That all Invitations to Apply for Eligibility and to Bid, Notice of Award, and all other procurement-related notices shall be posted in the G-EPS Electronic Bulletin Board in accordance with the IRR of R.A. No. 9184, regardless of the method of procurement used.</p>
  </div>
</div>

<div class="ap-item">
  <span class="ap-num">6.</span>
  <span class="ap-lead">Submission of Quarterly Financial and Narrative Accomplishment Reports.</span>
  <div class="ap-body">
    <p>Within thirty (30) days after the end of each quarter, the Municipality shall submit a quarterly financial and narrative accomplishment report to the Sangguniang Bayan, copy furnished the DBM, the COA, and the Finance Committee Chairman of the Sangguniang Bayan. The financial report shall show the cumulative allotments, obligations incurred/liquidated, total disbursements, unliquidated obligations, unobligated and unexpended balances, and the results of expended appropriations.</p>
  </div>
</div>

<div class="ap-item">
  <span class="ap-num">7.</span>
  <span class="ap-lead">Nationally Funded Projects.</span>
  <div class="ap-body">
    <p>Pursuant to Sec. 17 (c) of R.A. 7160, or the Local Government Code of 1991, projects, facilities, programs and services funded by the National Government or Agency shall be under a Memorandum of Agreement entered into between the National Government agency and this Municipality, the beneficiary Local Government, designating the latter to undertake the project or activity.</p>
  </div>
</div>

<div class="ap-item">
  <span class="ap-num">8.</span>
  <span class="ap-lead">Separability Clause.</span>
  <div class="ap-body">
    <p>If for any reason, any section or provision of this Act is declared unconstitutional or invalid, other sections or provisions hereof which are not affected thereby shall continue to be in full force and effect.</p>
  </div>
</div>

<div class="ap-item">
  <span class="ap-num">9.</span>
  <span class="ap-lead">Mun. Economic Enterprise (MEE) and Mun. Public Utilities.</span>
  <div class="ap-body">
    <p>Pursuant to Section 17 (b) of R.A. 7160, this LGU hereby maintains Economic Enterprises, Opol Community College (OCC), Public Market and Slaughterhouse to generate additional revenue and increase its sources of income.</p>
    <table class="ap-mee-table" style="margin-left:auto;margin-right:auto;">
      <tr><td class="ap-mee-roman">I.</td><td class="ap-mee-title">Opol Community College, (OCC)</td></tr>
      <tr><td></td><td class="ap-mee-sub">1. School Tuition Fee</td></tr>
      <tr><td></td><td class="ap-mee-sub">2. Other School Fees</td></tr>
      <tr><td class="ap-mee-roman">II.</td><td class="ap-mee-title">Mun. Public Market</td></tr>
      <tr><td></td><td class="ap-mee-sub">1. Receipts from Market</td></tr>
      <tr><td></td><td class="ap-mee-sub">2. Parking Fee</td></tr>
      <tr><td class="ap-mee-roman">III.</td><td class="ap-mee-title">Mun. Slaughterhouse</td></tr>
      <tr><td></td><td class="ap-mee-sub">1. Slaughtering Fee</td></tr>
    </table>
  </div>
</div>
HTML;

$content = $content ?? $defaultContent;
$editable = $editable ?? false;
@endphp

<style>
  .ap-title {
    text-align: center;
    font-weight: bold;
    font-size: 8.5pt;
    text-decoration: underline;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .ap-item { margin-bottom: 8px; font-size: 7pt; line-height: 1.5; text-align: justify; }
  .ap-num  { font-weight: normal; }
  .ap-lead { font-weight: bold; text-decoration: underline; }
  .ap-body { margin-left: 22pt; margin-top: 2px; }
  .ap-body p { margin-bottom: 4px; }

  .ap-mee-table { margin: 4px auto 2px auto; border-collapse: collapse; font-size: 7pt; }
  .ap-mee-table td { padding: 1px 6pt 1px 0; border: none; vertical-align: top; }
  .ap-mee-roman { width: 18pt; font-weight: bold; }
  .ap-mee-title { font-weight: bold; }
  .ap-mee-sub   { padding-left: 12pt; }
</style>

<div class="ap-print-wrap">
  {!! $content !!}
</div>
