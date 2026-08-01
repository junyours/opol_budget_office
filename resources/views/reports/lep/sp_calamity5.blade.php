{{--
    resources/views/reports/lep/sp_calamity5.blade.php
    ──────────────────────────────────────────────────────────────────────────
    SPECIAL PROVISIONS: 5% CALAMITY FUND (GEN. FUND & SPCL. ACCOUNT)
    Same whole-document-editable pattern as personnel_amelioration /
    administrative_procedures.

    Variables expected:
      $content   string  — full HTML of the document
      $editable  bool    — true = editor page, false/absent = PDF render
--}}

@php
$defaultContent = <<<'HTML'
<div class="sp5-title">SPECIAL PROVISIONS: 5% CALAMITY FUND (GEN. FUND &amp; SPCL. ACCOUNT), CY 2027</div>

<div class="sp5-item">
  <span class="sp5-num">1.</span>
  <span class="sp5-lead">Use and Release of Fund. Disaster Prevention, Mitigation and Preparedness Projects.</span>
  <div class="sp5-body">
    <p>The 5% Reserve for Calamity are authorized to be used to implement projects designed to mitigate and preparation of any disaster, procurement of necessary needed tools and equipment as prescribed and stipulated in RA-10121 and P.D. No. 1566. Implementation of this section shall be in accordance with the guidelines issued by the National Disaster Coordinating Council in coordination with the DBM, pursuant to Section 324 (d), R.A. 7160, that 5% of the estimated revenue from regular sources for one (1) fiscal year shall be set aside as annual lump sum appropriation comprising 70 percent Pre-disaster preparedness and 30 percent Quick Response Fund.</p>
    <p>The Office of the MDRRMO shall take charge of the crafting of the Municipal Disaster Risk Reduction Management Plan as well as its implementation schedule.</p>

    <p><span class="sp5-subnum">1.</span> Relief, rehabilitation, reconstruction and other works or services in connection with calamities which may occur during the budget year are all incorporated in the MDRRM Plan. Such relief, rehabilitation, construction and other works or services in connection with man-made disaster, include the following:</p>
    <p><span class="sp5-subnum">2.)</span> That such fund shall be used only in the municipality, or a portion thereof, or other areas affected by a disaster or a calamity, as determined and declared by the Local Sangguniang Bayan concerned; and</p>
    <p><span class="sp5-subnum">3.)</span> In case of fire or conflagration, the calamity fund shall be used only for relief operations. Provided further, that the Municipal Disaster Risk Reduction Management Council (MDRRMC), shall monitor the use and disbursements of the Municipal Calamity Fund.</p>

    <p>The 5% Calamity fund can be utilized as a funding source for preparedness activities for relief, rehabilitation, reconstruction and other works or services in connection with man-made disasters resulting from unlawful acts or insurgents, terrorists and other criminal acts, as well as for disaster preparedness and other pre-disaster activities.</p>
    <p>Provided that in extreme cases and under extra-ordinary circumstances, such as acts of terrorism and outbreak of dangerous and highly communicable diseases such as SARS, the Calamity Fund may also be utilized without the need of Sangguniang declaration which needs to be prevented or suppressed.</p>
  </div>
</div>

<div class="sp5-item">
  <span class="sp5-num">2.</span>
  <span class="sp5-lead">Quick Response Fund.</span>
  <div class="sp5-body">
    <p>Of the amount appropriated for LDRRM Fund, thirty-percent (30%) shall be allocated as Quick Response Fund (QRF) or stand-by fund for relief, recovery programs in order that the situation and living conditions of people in the communities or areas stricken by disaster, calamity and epidemics may be normalized as quickly as possible.</p>
    <p>The release and use of QRF shall be supported by a resolution of the Sanggunian declaring the LGU under state of calamity or a Presidential declaration of state of calamity.</p>
  </div>
</div>

<div class="sp5-item">
  <span class="sp5-num">3.</span>
  <span class="sp5-text">In no case shall the QRF be used for pre-disaster, nor be re-aligned for any other purpose.</span>
</div>
HTML;

$content = $content ?? $defaultContent;
$editable = $editable ?? false;
@endphp

<style>
  .sp5-title {
    text-align: center;
    font-weight: bold;
    font-size: 8pt;
    text-decoration: underline;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .sp5-item { margin-bottom: 10px; font-size: 7pt; line-height: 1.5; text-align: justify; }
  .sp5-num  { font-weight: normal; }
  .sp5-lead { font-weight: bold; text-decoration: underline; }
  .sp5-text { }
  .sp5-body { margin-left: 0; margin-top: 2px; }
  .sp5-body p { margin-bottom: 6px; }
  .sp5-subnum { font-weight: bold; margin-right: 4pt; }
</style>

<div class="sp5-print-wrap">
  {!! $content !!}
</div>
