{{--
    resources/views/reports/lep/general_provisions.blade.php
    ──────────────────────────────────────────────────────────────────────────
    SECTION 4. GENERAL PROVISIONS + ENACTMENT / SIGNATURE PAGE
    Same whole-document-editable pattern as personnel_amelioration /
    administrative_procedures / sp_20mdf / sp_calamity5.

    Rendered as its own page (page-break-before) — either appended
    automatically after the 5% Calamity Fund — SA Consolidated report, or
    generated standalone via report_type === 'general_provisions'.

    Variables expected:
      $content   string  — full HTML of the document
      $editable  bool    — true = editor page, false/absent = PDF render
--}}

@php
$defaultContent = <<<'HTML'
<div class="gp-heading">Section 4. General Provisions</div>

<div class="gp-para">The following policies are hereby adopted for the fiscal year:</div>

<div class="gp-para" style="margin-top:10px;">
  <span class="gp-bold">1. Availability of Appropriations.</span>
  Unexpended balances of appropriations authorized in the annual appropriation ordinance shall
  revert to the un-appropriated surplus of the general fund at the end of fiscal year and shall
  not be available for the expenditure except by subsequent enactment. However, appropriations
  for capital outlay shall continue and remain valid until fully spent, reverted or the project
  is completed. Reversion of continuing appropriations shall not be allowed unless obligations
  therefor have been fully paid or otherwise settled.
</div>

<div class="gp-para" style="margin-top:10px;">
  <span class="gp-bold">2. Limitation on Cash Advance.</span>
  Notwithstanding any provision of law to the contrary, cash advances shall not be granted until
  such time that the earlier cash advances availed of by the officials or employees concerned
  shall have been liquidated pursuant to pertinent accounting.
</div>

<div class="gp-para" style="margin-top:10px;">
  <span class="gp-bold">3. Meaning of Savings.</span>
  Savings refer to portions of balances as of any given point in the fiscal year or any
  programmed or allotted appropriation which remain free of any obligation or encumbrance and
  which are still available after the satisfactory completion of the work, activity or purpose
  for which the appropriation was originally authorized, or which result from unobligated
  compensation and related costs pertaining to vacant positions and leaves of absence without pay.
</div>

<div class="gp-para" style="margin-top:10px;">
  <span class="gp-bold">4. Use of Savings &amp; Augmentation.</span>
  Funds shall be available exclusively for the specific purpose for which they have been
  appropriated. No ordinance shall be passed authorizing any transfer of appropriations from one
  item to another. However, the local chief executive thru the Municipal Budget Officer may, by
  LCE approved request for augmentation, be authorized to augment any item in the approved annual
  budget for their respective offices from savings in the same expense class of their respective
  appropriations.
</div>

<div class="gp-para" style="margin-top:10px;">
  <span class="gp-bold">5. Separability Clause.</span>
  If for any reason, any section or provision of this Appropriation Ordinance is disallowed in
  Budget review or declared invalid by proper authorities, other provisions hereof that are not
  affected shall continue to be in full force and effect.
</div>

<div class="gp-para" style="margin-top:10px;">
  <span class="gp-bold">6. Effectivity.</span>
  The provisions of this Appropriation Ordinance shall take effect on January One, Two Thousand Twenty Six.
</div>

<div class="gp-para" style="margin-top:26px;">
  ENACTED: This <span class="gp-blank" style="width:30pt;">&nbsp;</span> day of
  <span class="gp-blank" style="width:100pt;">&nbsp;</span> at
  <span class="gp-blank" style="width:150pt;">&nbsp;</span>.
</div>

<div class="gp-certify">
  I HEREBY CERTIFY<br>
  THAT THIS ORDINANCE IS DULY ENACTED<br>
  BY THE SANGGUNIANG ON <span class="gp-blank" style="width:120pt;">&nbsp;</span>.
</div>

<div class="gp-sig-block">
  <span class="gp-sig-name">JOMAR FRANCISCO D. BAGO</span>
  <span class="gp-sig-title">SECRETARY TO THE SANGGUNIAN</span>
</div>

<div class="gp-sig-block">
  <span class="gp-sig-name">HON. DANILO E. DAROY JR.</span>
  <span class="gp-sig-title">PRESIDING OFFICER</span>
</div>

<div class="gp-approved">APPROVED:</div>

<div class="gp-sig-block" style="margin-top:24px;">
  <span class="gp-sig-name">ATTY. JAYFRANCIS G. BAGO</span>
  <span class="gp-sig-title">LOCAL CHIEF EXECUTIVE</span>
</div>
HTML;

$content = $content ?? $defaultContent;
$editable = $editable ?? false;
$pageBreak = $pageBreak ?? false;
@endphp

<style>
  .gp-heading { font-weight: bold; font-size: 9.5pt; margin-bottom: 10px; }
  .gp-para { font-size: 8pt; line-height: 1.5; text-align: left; }
  .gp-bold { font-weight: bold; }
  .gp-blank {
    display: inline-block;
    border-bottom: 1px solid #000;
  }
  .gp-certify {
    font-size: 8pt;
    margin-top: 26px;
    text-align: center;
    line-height: 1.8;
  }
  .gp-sig-block {
    text-align: center;
    font-size: 8pt;
    margin-top: 50px;
  }
  .gp-sig-name  { font-weight: bold; font-size: 6.5pt; display: block; }
  .gp-sig-title { font-size: 6.5pt; display: block; }
  .gp-approved  { font-weight: bold; font-size: 8pt; margin-top: 50px; text-align: center; }
</style>

<div @if($pageBreak) style="page-break-before: always;" @endif>
  <div class="gp-print-wrap">
    {!! $content !!}
  </div>
</div>
