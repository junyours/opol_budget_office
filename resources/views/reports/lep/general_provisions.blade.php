{{--
    resources/views/reports/lep/general_provisions.blade.php
    ──────────────────────────────────────────────────────────────────────────
    SECTION 4. GENERAL PROVISIONS + ENACTMENT / SIGNATURE PAGE

    Rendered as its own page (page-break-before) right after the
    5% Calamity Fund — SA Consolidated report in lepreport.blade.php.

    All underlined blanks (date, day, city, session date) are left empty —
    they are filled in by hand on the printed copy, matching the reference.
--}}
@php
/* Year → words, Title Case, no "PESOS" suffix — e.g. 2026 → "Two Thousand Twenty Six" */
function yearToWordsTitleCase(?int $year): string {
    if (!$year) return '____';
    $ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
             'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
             'Seventeen','Eighteen','Nineteen'];
    $tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

    $convert = function(int $n) use (&$convert, $ones, $tens): string {
        if ($n < 20)  return $ones[$n] ?? '';
        if ($n < 100) return trim($tens[(int)($n/10)] . ($n%10 ? ' '.$ones[$n%10] : ''));
        return '';
    };

    $thousands = intdiv($year, 1000);
    $remainder = $year % 1000;
    $hundreds  = intdiv($remainder, 100);
    $lastTwo   = $remainder % 100;

    $parts = [];
    $parts[] = $convert($thousands) . ' Thousand';
    if ($hundreds > 0) $parts[] = $ones[$hundreds] . ' Hundred';
    if ($lastTwo > 0)  $parts[] = $convert($lastTwo);

    return implode(' ', $parts);
}
@endphp

<div style="page-break-before: always;">

  <div style="font-weight:bold; font-size:9.5pt; margin-bottom:10px;">
    Section 4. General Provisions
  </div>

  <div class="body-para" style="font-size:8pt; text-align:left;">The following policies are hereby adopted for the fiscal year:</div>

  <div class="body-para" style="font-size:8pt; margin-top:10px; text-align:left;">
    <span class="body-bold">1. Availability of Appropriations.</span>
    Unexpended balances of appropriations authorized in the annual appropriation ordinance shall
    revert to the un-appropriated surplus of the general fund at the end of fiscal year and shall
    not be available for the expenditure except by subsequent enactment. However, appropriations
    for capital outlay shall continue and remain valid until fully spent, reverted or the project
    is completed. Reversion of continuing appropriations shall not be allowed unless obligations
    therfor have been fully paid or otherwise settled.
  </div>

  <div class="body-para" style="font-size:8pt;margin-top:10px; text-align:left;">
    <span class="body-bold">2. Limitation on Cash Advance.</span>
    Notwithstanding any provision of law to the contrary, cash advances shall not be granted until
    such time that the earlier cash advances availed of by the officials or employees concerned
    shall have been liquidated pursuant to pertinent accounting.
  </div>

  <div class="body-para" style="font-size:8pt;margin-top:10px; text-align:left;">
    <span class="body-bold">3. Meaning of Savings.</span>
    Savings refer to portions of balances as of any given point in the fiscal year or any
    programmed or alloted appropriation which remain free of any obligation or encumbrance and
    which are still available after the satisfactory completion of the work, activity or purpose
    for which the appropriation was originally authorized, or which result from unobligated
    compensation and related costs pertaining to vacant positions and leaves of absence without pay.
  </div>

  <div class="body-para" style="font-size:8pt;margin-top:10px; text-align:left;">
    <span class="body-bold">4. Use of Savings &amp; Augmentation.</span>
    Funds shall be available exclusively for the specific for w/c they have been appropriated. No
    ordinance shall be passed authorizing any transfer of appropriations from one item to another.
    However, the local chief executive thru the Municipal Budget Officer may, by LCE approved
    request for augmentation be authorized to augment any item in the approved annual budget for
    their respective offices from savings in the same expense class of their respective
    appropriations.
  </div>

  <div class="body-para" style="font-size:8pt;margin-top:10px; text-align:left;">
    <span class="body-bold">5. Separability Clause.</span>
    If for any reason, any section or provision of this Appropriation Ordinance is disallowed in
    Budget review or declared invalid by proper authorities, other provisions hereof that are not
    affected shall continue to be in full force and effect.
  </div>

  <div class="body-para" style="font-size:8pt;margin-top:10px; text-align:left;">
    <span class="body-bold">6. Effectivity.</span>
    The provisions of this Appropriation Ordinance shall take effect on January One,
    {{ yearToWordsTitleCase($proposed_year ?? null) }}.
  </div>

  {{-- ── Enactment line — blank underlines, filled in by hand ── --}}
  <div class="body-para" style="font-size:8pt;margin-top:26px; text-align:left;">
    ENACTED: This
    <span style="font-size:8pt;display:inline-block; width:30pt; border-bottom:1px solid #000;">&nbsp;</span>
    day of
    <span style="font-size:8pt;display:inline-block; width:100pt; border-bottom:1px solid #000;">&nbsp;</span>
    at
    <span style="font-size:8pt;display:inline-block; width:150pt; border-bottom:1px solid #000;">&nbsp;</span>.
  </div>

  <div class="body-para" style="font-size:8pt;margin-top:26px; text-align:center; line-height:1.8;">
    I HEREBY CERTIFY<br>
    THAT THIS ORDINANCE IS DULY ENACTED<br>
    BY THE SANGGUNIANG ON
    <span style="display:inline-block; width:120pt; border-bottom:1px solid #000;">&nbsp;</span>.
  </div>

  {{-- ── Signatories — one per row, centered, in order: Secretary → Presiding Officer → Approved → LCE ── --}}
  <div style="text-align:center; font-size:8pt; margin-top:50px;">
    <span class="sig-name" style="margin-top:0; display:block;">JOMAR FRANCISCO D. BAGO</span>
    <span class="sig-title" style="display:block;">SECRETARY TO THE SANGGUNIAN</span>
  </div>

  <div style="text-align:center; font-size:8pt; margin-top:50px;">
    <span class="sig-name" style="margin-top:0; display:block;">HON. DANILO E. DAROY JR.</span>
    <span class="sig-title" style="display:block;">PRESIDING OFFICER</span>
  </div>

  <div class="body-para body-bold" style="margin-top:50px; text-align:center;">APPROVED:</div>

  <div style="text-align:center; font-size:8pt; margin-top:24px;">
    <span class="sig-name" style="margin-top:0; display:block;">ATTY. JAYFRANCIS G. BAGO</span>
    <span class="sig-title" style="display:block;">LOCAL CHIEF EXECUTIVE</span>
  </div>

</div>
