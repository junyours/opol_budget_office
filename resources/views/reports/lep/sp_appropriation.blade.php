{{--
    resources/views/reports/lep/sp_appropriation.blade.php
    ──────────────────────────────────────────────────────────────────────────
    SPECIAL PROVISIONS: GENERAL FUND & SPECIAL ACCOUNT
    (OCC, Public Market & Slaughterhouse) — Appropriation for Programs
    and Specific Activities.

    Whole-document editable section. The entire body is stored as ONE
    HTML blob ($content) so the editor and the PDF render identically.

    Variables expected:
      $content   string  — full HTML of the document (from browser localStorage)
      $editable  bool    — true = render the editor page, false/absent = render for PDF
--}}

@php
$defaultContent = <<<'HTML'
<div class="sa-title">Special Provisions : GENERAL FUND &amp; SPECIAL ACCOUNT (OCC, PUBLIC MARKET &amp; SLAUGHTERHOUSE), CY 2026</div>
<div class="sa-heading">APPROPRIATION FOR PROGRAMS AND SPECIFIC ACTIVITIES.</div>

<div class="sa-item">
  <div class="sa-body sa-body-noindent">
    <p>The amount appropriated herein for subsidies and programs of the LGU shall be used specifically for the identified activities subject to existing budgeting, accounting, and auditing laws, rules and regulations.</p>
  </div>
</div>

<div class="sa-item">
  <span class="sa-num">1.</span>
  <span class="sa-lead">General Rule.</span>
  <div class="sa-body">
    <p>As a general rule, the income estimates, certified by the Municipal Local Finance Committee, are reasonably probable for collection and the expenditure ceiling in this Fiscal Year 2026. Thus, the Annual Budget has strictly observe the general guidelines set forth by the operating procedures of the COA, Department of Budget and Management, Department of Finance, Department of Interior and Local Government and Civil Service Commission.</p>
  </div>
</div>

<div class="sa-item">
  <span class="sa-num">2.</span>
  <span class="sa-lead">Receipts and Income.</span>
  <div class="sa-body">
    <p>Taxes, Fees, Charges, Assessments &amp; Etc. All Taxes, Fees, Charges, Assessment &amp; other receipts or revenues collected by this LGU in the exercise of its functions, shall be deposited with the Municipal Treasury and shall accrue to the General Fund, except the following:</p>
    <p style="margin-left:14pt;">(a) Receipts authorized by law to be recorded as Special Account in the General Fund. Provided, that revenues or income accruing to Special Accounts in the General Fund maybe made available for expenditure, subject to the submission/preparation of Special Account Budget of the concerned Account.</p>
    <p style="margin-left:14pt;">(b) Other instances provided in this Municipal Budget.</p>
  </div>
</div>

<div class="sa-item">
  <span class="sa-num">3.</span>
  <span class="sa-lead">Mandatory Expenditures.</span>
  <div class="sa-body">
    <p>Amounts appropriated, particularly for, but not limited to, gasoline, fuel, oil and lubricants, water, illumination and power services, telephone landline and mobile telecom and other communication services, rent, retirement gratuity and terminal leave requirements shall be disbursed solely for such items of expenditures: PROVIDED, That any savings generated from these items may be realigned only in the last quarter of each year.</p>
  </div>
</div>

<div class="sa-item">
  <span class="sa-num">4.</span>
  <span class="sa-lead">Purchase of Supplies, Materials and Equipment Spareparts for Stock.</span>
  <div class="sa-body">
    <p>Inventory of supplies, materials and equipment spareparts to be procured out of available funds shall at no time exceed the normal 3-month requirement (quarterly), subject to existing rules and regulations.</p>
  </div>
</div>

<div class="sa-item">
  <span class="sa-num">5.</span>
  <span class="sa-lead">Disaster Prevention, Mitigation and Preparedness Projects.</span>
  <div class="sa-body">
    <p>The 5% Reserve for Calamity are authorized to be used to implement projects designed to mitigate and preparation of any disaster, procurement of necessary needed tools and equipments as prescribed and stipulated in RA-10121 and P.D. No. 1566. Implementation of this section shall be in accordance with the guidelines issued by the National Disaster Coordinating Council in coordination with the DBM, pursuant to Section 324 (d), R.A. 7160, that 5% of the estimated revenue from regular sources for one (1) fiscal year shall be set aside as annual lump sum appropriation comprising 70 percent Pre-disaster preparedness and 30 percent Quick Response Fund.</p>
    <p>The Office of the MDRRMO shall take charge of the crafting of the Municipal Disaster Risk Reduction Management Plan as well as its implementation schedule.</p>
    <p>1. Relief, rehabilitation, reconstruction and other works or services in connection with calamities which may occur during the budget year are all incorporated in the MDRRM Plan. Such relief, rehabilitation, construction and other works or services in connection with man-made disaster, include the following:</p>
    <p style="margin-left:14pt;">1.) Medical assistance, death and funeral benefits to the victims, their dependents and immediate families, including victims who are Overseas Filipino Workers, (OFW),</p>
    <p style="margin-left:14pt;">2.) Financial assistance, logistical support and other services for medical, rescue and relief workers who have been tasked to attend to the victims;</p>
    <p style="margin-left:14pt;">3.) Rehabilitation and reconstruction of infrastructures and disaster preparedness orientation, training and other pre-disaster activities.</p>
    <p>2.) That such fund shall be used only in the municipality, or a portion thereof, or other areas affected by a disaster or a calamity, as determined and declared by the Local Sangguniang Bayan concerned; and</p>
    <p>3.) In case of fire or conflagration, the calamity fund shall be used only for relief operations. Provided further, that the Municipal Disaster Risk Reduction Management Council (MDRRMC), shall monitor the use and disbursements of the Municipal Calamity Fund.</p>
    <p>The 5% Calamity fund can be utilized as a funding source for preparedness activities for relief, rehabilitation, reconstruction and other works or services in connection with man-made disasters resulting from unlawful acts or insurgents, terrorists and other criminal acts, as well as for disaster preparedness and other pre-disaster activities.</p>
    <p>Provided that in extreme cases and under extra-ordinary circumstances, such as acts of terrorism and outbreak of dangerous and highly communicable diseases such as SARS, the Calamity Fund may also be utilized without the need of Sangguniang declaration which needs to be prevented or suppressed.</p>
  </div>
</div>
HTML;

$content  = $content ?? $defaultContent;
$editable = $editable ?? false;
@endphp

<style>
  .sa-title {
    text-align: center;
    font-weight: bold;
    font-size: 8pt;
    text-decoration: underline;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .sa-heading {
    text-align: center;
    font-weight: bold;
    font-size: 7.5pt;
    text-decoration: underline;
    text-transform: uppercase;
    margin: 4px 0 10px 0;
  }
  .sa-item { margin-bottom: 8px; font-size: 7pt; line-height: 1.5; text-align: justify; }
  .sa-num  { font-weight: normal; }
  .sa-lead { font-weight: bold; text-decoration: underline; }
  .sa-body { margin-left: 22pt; margin-top: 2px; }
  .sa-body-noindent { margin-left: 0; }
  .sa-body p { margin-bottom: 4px; }
</style>

<div class="sa-print-wrap">
  {!! $content !!}
</div>
