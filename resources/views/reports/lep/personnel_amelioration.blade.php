{{--
    resources/views/reports/lep/personnel_amelioration.blade.php
    ──────────────────────────────────────────────────────────────────────────
    PERSONNEL AMELIORATION
    Whole-document editable section. The entire body is stored as ONE
    HTML blob ($content) so the editor and the PDF render identically.

    Variables expected:
      $content   string  — full HTML of the document (from DB, contenteditable output)
      $editable  bool    — true = render the editor page, false/absent = render for PDF
--}}

@php
/* Default seed content used only the first time a record is created
   (i.e. when $content is empty). After the first save, whatever the
   user typed/edited is what gets stored and rendered — verbatim. */
$defaultContent = <<<'HTML'
<div class="pa-title">PERSONNEL AMELIORATION</div>

<div class="pa-item">
  <span class="pa-num">1.</span>
  <span class="pa-lead">Salary Standardization Law 2024 : 1st Tranche ; and Step Increment.</span>
  <div class="pa-body">
    <p><span class="pa-lead">Mun. Department Heads.</span> All positions having the salary grade of 22 to 24 are considered as Department Heads and therefor are entitled to RATA &amp; other authorized benefits.</p>
    <p><span class="pa-lead">Salary Standardization 2024.</span> The salary standardization of Officials and Personnel is adopted pursuant to the Department of Budget and Management Executive Order No. 64 2nd Tranche with re-allocation of position using the 1st Class Category.</p>
    <p><span class="pa-lead">Hazard Pay of Mun. Health Workers and SWM Garbage Collectors.</span> Partially implementing Hazard Pay at 10% of 25% of their basic pay for Health workers and SWM Garbage Colectors effective January 1, 2026.</p>
    <p><span class="pa-lead">Step Increment.</span> The step increment is granted to all permanent employees based on the length of service pursuant to the Joint CSC-DBM Cir. No. 1, S. 1990 and Joint Senate-House Resolution No. 1, S. 1994.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">2.</span>
  <span class="pa-lead">Funding of Personnel Benefits.</span>
  <div class="pa-body">
    <p>The personnel benefits cost of the Municipal officials and employees shall be charged against the funds from which their compensations are paid. All authorized supplemental or additional compensation, fringe benefits and other personal services cost of officials and employees whose salaries are drawn from Special Accounts or Special Funds, such as salary increases, step increment for length of service, incentive and service fees, commutation of vacation and sick leaves, retirements and life insurance premiums, compensation insurance premiums, health insurance premiums, HDMF contribution, hospitalization and medical benefits, scholarships and education benefits, training and seminar expenses, all kinds of allowances, whether commutable of reimbursable, in cash or in kind, and other personnel benefits and previleges authorized by law, including the payment of retirement gratuities, separation pay and terminal leave benefits, shall similarly be charged against the corresponding fund which their basic salaries are drawn. In no case shall such personnel benefits costs be charged against other fund of the Municipality.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">3.</span>
  <span class="pa-lead">Authorized Deductions.</span>
  <div class="pa-body">
    <p>Deductions from salaries, emulments or other benefit of, government employees chargeable against the appropriations for personal services may be allowed for the payment of individual employees contributions or obligations due. PROVIDED, That in the event the total authorized deductions the net take home pay is less than Three Thousand Pesos (Php 3,000.00), authorized deductions for GSIS Insurance &amp; Loans shall enjoy first preference, Philhealth shall enjoy second preference, Pag-Ibig Contributions &amp; Loans, third, BIR Witholding Tax, 4th and Private Inst. 5th.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">4.</span>
  <span class="pa-lead">13th Month and 14th Month Bonus and Cash Gifts.</span>
  <div class="pa-body">
    <p>The appropriations provided for the 13th and 14th month bonus of one (1) month bonus pursuant to E.O. 201 basic salary and additional cash gift of Five Thousand (Php 5,000.00) provided under R.A. No. 6686, as amended by R.A. No. 8441, is granted, except to job-order workers, to all Municipal Officials and employees whether under permanent basis. All other employees under contractual basis and have rendered at least a total of four (4) months of government service including leaves of absence with pay from January 1 to October 31 of each year, and who are still in the service as of October 31 of the same year shall also be entitled for a bonus of not less than five thousand pesos (P5,000.00) PROVIDED, That such fund is available at the end of each budget year and is subject to the implementing rules and regulations of the DBM.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">5.</span>
  <span class="pa-lead">Travelling Expenses.</span>
  <div class="pa-body">
    <p>Officials and employees of the government may be allowed full payment of claims for reimbursements of travelling and related expenses incurred in the course of travel, certified by the head of agency concerned as absolutely necessary in the performance of an assignment and supported by receipts, chargeable to the allotment for travelling expenses under their respective offices approved budget and shall not exceed on the quarterly release of the PPMP.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">6.</span>
  <span class="pa-lead">Representation &amp; Transportation Allowances.</span>
  <div class="pa-body">
    <p>The following officials and those of equivalent rank as may be determined by the DBM, while in the actual performance of their respective function, are hereby granted monthly commutable representation and transportation allowances payable from the programmed appropriations provided for their respective offices not exceeding the rates indicated below for 1st Class Municipality, (DBM LBC No. 157 dated May 03, 2024)</p>
    <table class="pa-rata-table">
      <tr><td class="pa-rata-letter">(a).</td><td class="pa-rata-amt">Php&nbsp;9,000.00</td><td class="pa-rata-title">Municipal Mayor</td><td class="pa-rata-sg">Salary Grade&nbsp;-&nbsp;27</td></tr>
      <tr><td class="pa-rata-letter">(b).</td><td class="pa-rata-amt">Php&nbsp;8,550.00</td><td class="pa-rata-title">Vice-Mayor</td><td class="pa-rata-sg">Salary Grade&nbsp;-&nbsp;25</td></tr>
      <tr><td class="pa-rata-letter">(c).</td><td class="pa-rata-amt">Php&nbsp;7,650.00</td><td class="pa-rata-title">SB Member/Department Head</td><td class="pa-rata-sg">Salary Grade&nbsp;-&nbsp;24</td></tr>
      <tr><td class="pa-rata-letter">(d).</td><td class="pa-rata-amt">Php&nbsp;5,400.00</td><td class="pa-rata-title">Assistant Department Head</td><td class="pa-rata-sg">Salary Grade&nbsp;-&nbsp;22</td></tr>
    </table>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">7.</span>
  <span class="pa-lead">Employment of Contractual (Job-Order/Emergency) Personnel.</span>
  <div class="pa-body">
    <p>The LGU may hire contractual personnel as part of the organization to perform regular agency functions and specific vital activities or services which cannot be provided by the regular or permanent staff. The contractual (Job-Order/Emergency) personnel employed pursuant to this section shall be considered as an employee of the LGU, limited to the period/year when their services are reasonably required and may be subject to quarterly renewal.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">8.</span>
  <span class="pa-lead">Uniform and Clothing Allowance.</span>
  <div class="pa-body">
    <p>The appropriations provided for each office may be used for uniform clothing allowance of regular/co-terminus employees only, who have rendered at least six months service, at not more than Seven Thousand Pesos (Php 7,000.00) each annum which may be given in cash or in kind.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">9.</span>
  <span class="pa-lead">Entitlement to Personnel Economic Relief Allowance, (PERA).</span>
  <div class="pa-body">
    <p>The Personnel Economic Relief Allowance (PERA) in the amount of Five Hundred Pesos (Php 500.00) per month shall now be Two Thousand Pesos (Php 2,000.00) to all appointed and elective Local Government employees occupying itemized plantilla positions, per Budget Circular No. 2009-3, dated August 18, 2009.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">10.</span>
  <span class="pa-lead">Additional Compensation Allowance.</span>
  <div class="pa-body">
    <p>(ACA/ADCOM) Php 1,500.00 per month pursuant to A.O. 144 and Budget Circular No. 2006-2 dated March 2, 2006 shall now be consolidated with the PERA of Five Hundred Pesos (Php 500.00), per Budget Circular No. 2009-3, dated August 18, 2009. It shall be paid on actual service rendered on an 8-hour, 22-working-day-month basis. Suspended employees/officials are not entitled unless exonerated with the charges.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">11.</span>
  <span class="pa-lead">Appropriation for Retirement Gratuity and Terminal Leave.</span>
  <div class="pa-body">
    <p>Appropriations authorized in this Act to cover retirement gratuity benefit claims shall be released directly to the concerned retiring personnel upon approval by the GSIS of one's application for retirement. In no other case shall payment be made, except on the basis of creditable service as computed by the GSIS in accordance with the provisions of existing retirement Laws.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">12.</span>
  <span class="pa-lead">Appropriation for Annual Medical Allowance.</span>
  <div class="pa-body">
    <p>The P7,000.00 benefit for LGU introduced under E.O. 64 obtained via DBM Circular No. 2024-6.</p>
  </div>
</div>

<div class="pa-heading" style="page-break-before: always;">RELEASE AND USE OF FUNDS:</div>

<div class="pa-item">
  <span class="pa-num">1.</span>
  <span class="pa-lead">Use of Savings.</span>
  <div class="pa-body">
    <p>The LGU is hereby authorized to augment any item in these appropriations from savings in other items of the LGU appropriations.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">2.</span>
  <span class="pa-lead">Meaning of Savings and Augmentation.</span>
  <div class="pa-body">
    <p>Savings refer to portions or balances of any programmed appropriation free from any obligation or encumbrance which are: (i) still available after the completion or final discontinuance or abandonment of the work, activity or purpose for which the appropriation is authorized; (ii) from appropriation balances realized from the implementation of collective negotiation agreements, which resulted in improved system and efficiences and thus enabled an agency to meet and deliver the required or planned targets, programs and services approved in this Act at a lesser cost.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">4.</span>
  <span class="pa-lead">Augmentation of Personal Services (PS).</span>
  <div class="pa-body">
    <p>The LGU thru the Municipal Budget Officer, may augment an item of expenditure within Personal Services (PS) as urgent need arises so as not to hamper the operation and function of such office or department without prior approval from the local legislature, except intelligence and confidential fund.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">5.</span>
  <span class="pa-lead">Augmentation of Maintenance and Other Operating Expenses Item.</span>
  <div class="pa-body">
    <p>The LGU thru the Municipal Budget Officer, may augment an item of expenditure within MOOE from savings in other items of MOOE without prior approval from the local legislature, except intelligence and confedential fund.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">6.</span>
  <span class="pa-lead">Augmentation of Special Purpose Appropriations.</span>
  <div class="pa-body">
    <p>The LGU thru the Municipal Budget Officer, may augment an item of expenditure from SPA within the same Office and be augmented to existing program of the same Office only without prior approval from local legislature provided that the concerned department shall secure a request for augmentation and duly approved by the LCE.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">7.</span>
  <span class="pa-lead">Realignment/Relocation of Capital Outlays.</span>
  <div class="pa-body">
    <p>The amount appropriated in this Act for acquisition, construction, replacement, rehabilitation and completion of various capital outlays may be automatically realigned/relocated in cases of imbalance allocation of projects, duplication of projects, overlapping of funding source and similar. PROVIDED, that it shall only be done thru the Municipal Budget Officer to fast track implementation of projects by the Local Chief Executive.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">8.</span>
  <span class="pa-lead">Availability of Appropriation.</span>
  <div class="pa-body">
    <p>Appropriations for MOOE and Capital Outlays authorized in this provision shall be available for release and obligation for the purpose specified, and under the same special provision applicable thereto, for a period extending to one Fiscal Year after the end of the year in which such items were appropriated. PROVIDED, That a report of these releases and obligations shall be submitted to the Committee on Finance of the Sangguniang Bayan and to the Municipal Finance Committee.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">9.</span>
  <span class="pa-lead">Disbursements of Funds.</span>
  <div class="pa-body">
    <p>All appropriated funds shall be disbursed in accordance with Appropriation Ordinance. Checks must be drawn by the Municipal Treasurer countersigned by the Municipal Mayor, or, Municipal Vice-Mayor for expenditures appropriated for the operation of the sangguniang Bayan on duly approved disbursement vouchers.</p>
  </div>
</div>

<div class="pa-item">
  <span class="pa-num">10.</span>
  <span class="pa-lead">Limitations on Cash Advance/Reportorial Requirements.</span>
  <div class="pa-body">
    <p>Notwithstanding any provision of law to the contrary, it is hereby declared not to grant cash advances until such time that the earlier cash advances availed of by the officials or employees concerned shall have been already liquidated pursuant to pertinent accounting and auditing rules and regulations, as certified by the head of agency concerned and the COA Auditor.</p>
  </div>
</div>
HTML;

$content = $content ?? $defaultContent;
$editable = $editable ?? false;
@endphp

<style>
  .pa-title {
    text-align: center;
    font-weight: bold;
    font-size: 8.5pt;
    text-decoration: underline;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .pa-heading {
    text-align: center;
    font-weight: bold;
    font-size: 7.5pt;
    text-decoration: underline;
    text-transform: uppercase;
    margin: 14px 0 8px 0;
  }
  .pa-item { margin-bottom: 8px; font-size: 7pt; line-height: 1.5; text-align: justify; }
  .pa-num  { font-weight: normal; }
  .pa-lead { font-weight: bold; text-decoration: underline; }
  .pa-body { margin-left: 22pt; margin-top: 2px; }
  .pa-body p { margin-bottom: 4px; }

  .pa-rata-table { margin: 4px 0 2px 22pt; border-collapse: collapse; font-size: 7pt; }
  .pa-rata-table td { padding: 1px 6pt 1px 0; border: none; vertical-align: top; }
  .pa-rata-letter { width: 22pt; font-weight: bold; }
  .pa-rata-amt    { width: 70pt; font-weight: bold; }
  .pa-rata-title  { width: 190pt; }
  .pa-rata-sg     { width: 100pt; }

  /* Editor-only chrome — never applied in PDF render */
  .pa-editor-wrap {
    border: 1px solid #ccc;
    padding: 16px 20px;
    max-width: 900px;
    margin: 0 auto;
    background: #fff;
  }
  .pa-editor-wrap[contenteditable="true"]:focus { outline: 2px solid #4a90d9; }
  .pa-toolbar { max-width: 900px; margin: 0 auto 8px auto; display: flex; gap: 8px; }
  .pa-toolbar button {
    font-size: 12px; padding: 6px 14px; border: 1px solid #999; border-radius: 4px;
    background: #f5f5f5; cursor: pointer;
  }
  .pa-status { font-size: 11px; color: #666; margin-left: 8px; align-self: center; }
</style>

{{-- Editing happens in the React app (localStorage) — this partial only
     ever renders the final HTML for PDF output. --}}
<div class="pa-print-wrap">
  {!! $content !!}
</div>
