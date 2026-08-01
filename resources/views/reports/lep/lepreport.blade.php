<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>

/* ═══════════════════════════════════════════════════════
   PAGE SIZE + MARGINS  — Portrait Legal (8.5in × 13in)
═══════════════════════════════════════════════════════ */
@page {
    size: 8.5in 13in portrait;
    margin: 0;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
    /* font-family: 'DejaVu Sans Condensed', 'DejaVu Sans', Arial, sans-serif; */
    font-family: Arial, sans-serif;
    font-size: 7pt;
    color: #000;
}

body {
    /* Portrait legal — binding at LEFT */
    margin-top:    36pt;
    margin-bottom: 36pt;
    margin-left:   72pt;
    margin-right:  36pt;
}

.wrap { width: 504pt; } /* 612 - 72 - 36 */

/* ── Letterhead / header ── */
.lh-province   { text-align: center; font-size: 7pt; }
.lh-muni       { text-align: center; font-size: 7.5pt;  }
.lh-office     { text-align: center; font-size: 7pt; font-weight: bold; margin-bottom: 1px; }
.lh-subtitle   { text-align: center; font-size: 7pt; font-weight: bold; margin-bottom: 10px; }

/* ── Ordinance header ── */
.ord-session    { text-align: center; font-size: 7.5pt; font-weight: bold;  margin-top: 10px; margin-bottom: 4px; }
.ord-date-line  { text-align: left;   font-size: 7pt;   margin-bottom: 8px; }
.ord-number     { text-align: center; font-size: 8pt;   font-weight: bold;  margin-bottom: 6px; }
.ord-title-box  {
    text-align: center;
    font-size: 7.5pt;
    font-weight: bold;
    text-transform: uppercase;
    line-height: 1.5;
    margin-bottom: 6px;
    padding: 4px 8px;
}
.ord-intro-by   { text-align: center; font-size: 7pt;   margin-bottom: 6px; }

/* ── Body text ── */
.body-para {
    font-size: 7pt;
    line-height: 1.6;
    margin-bottom: 4px;
    text-align: justify;
}
.body-bold { font-weight: bold; }

/* ── Special account list — centered ── */
.sa-list-wrap {
    width: 100%;
    text-align: center;
    margin: 4px 0;
}
.sa-list {
    display: inline-table;
    font-size: 7pt;
    line-height: 1.8;
    border-collapse: collapse;
    margin: 0 auto;
}
.sa-list td.sa-name        { padding: 0 4pt 0 0; }
.sa-list td.sa-amt         { text-align: right; padding-left: 24pt; font-weight: bold; }
.sa-list td.sa-total-label { padding: 0 4pt 0 0; font-weight: bold; }
.sa-list td.sa-total-amt   { text-align: right; padding-left: 24pt; font-weight: bold; border-top: 1px solid #000; }

/* ── Budget documents list ── */
.doc-list {
    font-size: 7pt;
    margin: 4px 0 4px 24pt;
    line-height: 1.8;
}

/* ── Section label ── */
.section-label {
    font-weight: bold;
    font-size: 7.5pt;
    margin: 6px 0 2px 0;
    text-transform: uppercase;
}

/* ── Data table (plantilla) ── */
table.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7pt;
    table-layout: fixed;
}
table.data-table th,
table.data-table td {
    border: 1px solid #000;
    padding: 1.5px 3px;
    vertical-align: middle;
    line-height: 1.2;
    word-break: break-word;
}
table.data-table th {
    text-align: center;
    font-weight: bold;
    background-color: #fff;
}
table.data-table td.r  { text-align: right; }
table.data-table td.c  { text-align: center; }
table.data-table td.l  { text-align: left; }
table.data-table tr.col-num td { text-align: center; }

table.data-table tbody tr {
    line-height: 1.2;
}

tr.grand-total td { font-weight: bold; }

/* ── Signature blocks ── */
.sig-name  { font-weight: bold; font-size: 6.5pt; margin-top: 22px; display: block; text-align: center; }
.sig-title { font-size: 6.5pt; display: block; text-align: center; }

</style>
</head>
<body>
<div class="wrap">

@php
/* ── Formatters ── */
$pesoA = fn($n) => '<span style="white-space:nowrap;font-family:\'DejaVu Sans\',sans-serif;">&#x20B1;&nbsp;' . number_format((float)$n, 2) . '</span>';
$peso  = fn($n) => (float)$n == 0 ? '' : $pesoA($n);

$hdr   = $header ?? [];
$sigs  = $signatories ?? [];

/* ── Grand totals across all sections ── */
$grandCurrentTotal  = $grand_current_total  ?? 0.0;
$grandProposedTotal = $grand_proposed_total ?? 0.0;
$grandIncrease      = $grandProposedTotal - $grandCurrentTotal;

/* ── Special account totals ── */
$saItems     = $special_account_totals['items']       ?? [];
$saGrandTot  = $special_account_totals['grand_total'] ?? 0.0;

$generalFundProposed = $grand_proposed_total ?? 0.0;
$totalBudget         = $generalFundProposed + $saGrandTot;

/* ── Header values with fallback ── */
$province        = $hdr['province']            ?? 'Province of Misamis Oriental';
$muni            = $hdr['municipality']        ?? 'MUNICIPALITY OF OPOL';
$officeName      = $hdr['office_name']         ?? 'OFFICE OF THE SANGGUNIANG BAYAN';
$officeSubtitle  = $hdr['office_subtitle']     ?? 'MUNICIPALITY OF OPOL';
$ordSession      = $hdr['ordinance_session']   ?? '2ND SPECIAL SESSION';
$sessionDateText = $hdr['session_date_text']   ?? 'Began and held at its Mun. Session Hall on the ___ day of _______ Two Thousand Twenty Five at SB Session Hall, Opol, Misamis Oriental';
$ordNumber       = $hdr['ordinance_number']    ?? "APPROPRIATION ORDINANCE NO. {$proposed_year} - ___";
$ordTitle        = $hdr['ordinance_title']     ?? "AN ORDINANCE AUTHORIZING THE {$proposed_year} ANNUAL BUDGET OF OPOL";
$introBy         = $hdr['introduced_by']       ?? '';
@endphp

{{-- ══════════════════════════════════════════════════════════
     ORDINANCE HEADER — no .page wrapper, no page-break-after
     The plantilla @include continues right below on same page
══════════════════════════════════════════════════════════ --}}

  {{-- Letterhead --}}
  @if(($report_type ?? '') === 'consolidated_plantilla')
  <div class="lh-province">{{ $province }}</div>
  <div class="lh-muni">{{ $muni }}</div>
  <div class="lh-office">{{ $officeName }}</div>
  <div class="lh-subtitle">{{ $officeSubtitle }}</div>

  {{-- Session --}}
  <div class="ord-session">{{ $ordSession }}</div>

  <div class="ord-date-line">{{ $sessionDateText }}</div>

  <div class="ord-number">{{ $ordNumber }}</div>

  <div class="ord-title-box">{{ $ordTitle }} WITH A TOTAL AMOUNT OF
    {!! $pesoA($totalBudget) !!} COMPRISING THE GENERAL FUND AMOUNTING TO
    {!! $pesoA($generalFundProposed) !!}
    @if(count($saItems))
      AND THE TOTAL SPECIAL ACCOUNT AMOUNTING TO
      {!! $pesoA($saGrandTot) !!}: COMPRISING THE
      @foreach($saItems as $idx => $sa)
        {{ strtoupper($sa['dept_name']) }}
        {!! $pesoA($sa['amount']) !!}{{ !$loop->last ? ';' : '' }}
      @endforeach
    @endif
    AND APPROPRIATING THE NECESSARY FUNDS FOR THE PURPOSE
  </div>

  @if($introBy)
  <div class="ord-intro-by">Introduced by <strong>{{ $introBy }}</strong></div>
  @endif

  <div class="body-para" style="margin-top:6px;">
    <span class="body-bold">BE IT ORDAINED</span> in a session assembled :
  </div>

  <div class="body-para">
    <span class="body-bold">SECTION 1.</span>
    The Annual Budget of the {{ str_replace('MUNICIPALITY OF ', 'Municipality of ', $muni) }} for Fiscal Year
    <strong>{{ $proposed_year }}</strong> in the total amount of
    <strong>{!! strtoupper(numberToWords((float)$generalFundProposed) ?? number_format($generalFundProposed, 0)) !!}
    ({!! $pesoA($generalFundProposed) !!})</strong>, covering the various expenditures for the operation of the
    Municipal Government for Fiscal Year {{ $proposed_year }} is hereby approved.

    @if(count($saItems))
    The Special Account Annual Budget for Fiscal Year {{ $proposed_year }} in the total amount of
    <strong>{!! $pesoA($saGrandTot) !!}</strong> covering the various expenditures for the operation of the
    Municipal Economic Enterprises is likewise approved, details are as follows:
    @endif
  </div>

  @if(count($saItems))
  {{-- Centered SA list — full dept name only, no abbreviation --}}
  <div class="sa-list-wrap">
    <table class="sa-list">
      @foreach($saItems as $idx => $sa)
      <tr>
        <td class="sa-name">{{ $idx + 1 }}. {{ $sa['dept_name'] }}</td>
        <td class="sa-amt">{!! $pesoA($sa['amount']) !!}</td>
      </tr>
      @endforeach
      <tr>
        <td class="sa-total-label">Total</td>
        <td class="sa-total-amt">{!! $pesoA($saGrandTot) !!}</td>
      </tr>
    </table>
  </div>
  @endif

  <div class="body-para" style="margin-top:6px;">
    The budget documents consisting of the following are incorporated herein and made integral part of this Ordinance&nbsp;:
  </div>

  <table style="width:100%; border-collapse:collapse; font-size:7pt; margin:4px 0 4px 24pt;">
    <tr>
      <td style="width:34%; vertical-align:top; padding:0; line-height:1.8; border:none;">
        1. Local Expenditure Program, (LEP)<br>
        2. Budget Expenditures and Sources of Financing, (BESF)<br>
        3. Annual Investment Program, (AIP)<br>
        4. Plantilla of Personnel<br>
        5. Receipts Program
      </td>
      <td style="width:33%; vertical-align:top; padding:0; line-height:1.8; border:none;">
        6. Appropriation and Obligation by Office<br>
        7. PS Computation<br>
        8. 20% Municipal Development Fund<br>
        9. Summary of New Appropriations by Sector<br>
        10. Statement of Statutory and Contractual Obligations
      </td>
      <td style="width:33%; vertical-align:top; padding:0; line-height:1.8; border:none;">
        11. 5% Calamity Fund General Fund & SA Consolidated
      </td>
    </tr>
  </table>
  @endif {{-- only consolidated_plantilla gets the ordinance header --}}

{{-- ══════════════════════════════════════════════════════════
     PART I — CONSOLIDATED PLANTILLA OF PERSONNEL
     Continues immediately below — no page break before this
══════════════════════════════════════════════════════════ --}}



@if(($report_type ?? '') === 'receipts_program')
    @include('reports.lep.receipts_program', [
        'receipt_forms'  => $receipt_forms,
        'proposed_year'  => $proposed_year,
        'current_year'   => $current_year,
        'past_year'      => $past_year,
        'signatories'    => $signatories,
    ])

@elseif(($report_type ?? '') === 'lep_form2')
    @include('reports.lep.lep_form2', [
        'form2_sections' => $form2_sections,
        'proposed_year'  => $proposed_year,
        'current_year'   => $current_year,
        'past_year'      => $past_year,
    ])

    @elseif(($report_type ?? '') === 'lep_pscomputation')
    @include('reports.lep.lep_pscomputation', [
        'data' => $data ?? [],
    ])

    @elseif(($report_type ?? '') === 'lep_mdf20')
    @include('reports.lep.lep_mdf20', [
        'data' => $data ?? [],
    ])

    @elseif(($report_type ?? '') === 'lep_form6')
      @include('reports.lep.lep_form6', [
          'data' => ['year' => $year ?? 0, 'lgu' => $lgu ?? '', 'forms' => $forms ?? []],
      ])

    @elseif(($report_type ?? '') === 'lep_form7')
    @include('reports.lep.lep_form7', [
        'data' => [
            'year'  => $year,
            'lgu'   => $lgu,
            'forms' => $forms,
        ],
    ])

    @elseif(($report_type ?? '') === 'lep_consolidated_calamity5')
    @include('reports.lep.consolidated_calamity5', ['data' => $data ?? [
        'year'         => $year         ?? ($proposed_year ?? 0),
        'past_year'    => $past_year    ?? (($proposed_year ?? 0) - 2),
        'current_year' => $current_year ?? (($proposed_year ?? 0) - 1),
        'lgu'          => $lgu          ?? '',
        'sources'      => $sources      ?? [],
        'grand_total'  => $grand_total  ?? [],
        'signatories'  => $signatories  ?? [],
    ]])
    @include('reports.lep.general_provisions', [
        'content'   => $gp_content ?? null,
        'editable'  => false,
        'pageBreak' => true,
    ])

@elseif(($report_type ?? '') === 'general_provisions')
    @include('reports.lep.general_provisions', [
        'content'   => $gp_content ?? null,
        'editable'  => false,
        'pageBreak' => false,
    ])

@elseif(($report_type ?? '') === 'personnel_amelioration')
    @include('reports.lep.personnel_amelioration', [
        'content'  => $pa_content ?? null,
        'editable' => false,
    ])

@elseif(($report_type ?? '') === 'administrative_procedures')
    @include('reports.lep.administrative_procedures', [
        'content'  => $ap_content ?? null,
        'editable' => false,
    ])

@elseif(($report_type ?? '') === 'sp_20mdf')
    @include('reports.lep.sp_20mdf', [
        'content'  => $sp20_content ?? null,
        'editable' => false,
    ])

@elseif(($report_type ?? '') === 'sp_calamity5')
    @include('reports.lep.sp_calamity5', [
        'content'  => $sp5_content ?? null,
        'editable' => false,
    ])

@elseif(($report_type ?? '') === 'sp_appropriation')
    @include('reports.lep.sp_appropriation', [
        'content'  => $sp_appr_content ?? null,
        'editable' => false,
    ])

@else
    @include('reports.lep.consolidated_plantilla_of_personnel', [
        'sections'            => $sections,
        'proposed_year'       => $proposed_year,
        'current_year'        => $current_year,
        'lep_lbc_current'     => $lep_lbc_current,
        'lep_lbc_proposed'    => $lep_lbc_proposed,
        'lep_tranche_current' => $lep_tranche_current,
        'lep_tranche_proposed'=> $lep_tranche_proposed,
        'grand_current_total' => $grandCurrentTotal,
        'grand_proposed_total'=> $grandProposedTotal,
        'grand_increase'      => $grandIncrease,
        'signatories'         => $sigs,
        'peso'                => $peso,
        'pesoA'               => $pesoA,
        'muni'                => $muni,
    ])

@endif


</div>{{-- /wrap --}}
</body>
</html>

@php
/**
 * Rudimentary number-to-words for Philippine peso amounts.
 */
function numberToWords(float $num): ?string
{
    if ($num <= 0) return 'ZERO';
    $ones = ['','ONE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE',
             'TEN','ELEVEN','TWELVE','THIRTEEN','FOURTEEN','FIFTEEN','SIXTEEN',
             'SEVENTEEN','EIGHTEEN','NINETEEN'];
    $tens = ['','','TWENTY','THIRTY','FORTY','FIFTY','SIXTY','SEVENTY','EIGHTY','NINETY'];

    $convert = function(int $n) use (&$convert, $ones, $tens): string {
        if ($n < 20)   return $ones[$n] ?? '';
        if ($n < 100)  return $tens[(int)($n/10)] . ($n%10 ? ' '.$ones[$n%10] : '');
        if ($n < 1000) return $ones[(int)($n/100)] . ' HUNDRED' . ($n%100 ? ' '.$convert($n%100) : '');
        if ($n < 1000000) return $convert((int)($n/1000)) . ' THOUSAND' . ($n%1000 ? ' '.$convert($n%1000) : '');
        if ($n < 1000000000) return $convert((int)($n/1000000)) . ' MILLION' . ($n%1000000 ? ' '.$convert($n%1000000) : '');
        return $convert((int)($n/1000000000)) . ' BILLION' . ($n%1000000000 ? ' '.$convert($n%1000000000) : '');
    };

    $intPart = (int) round($num);
    return $convert($intPart) . ' PESOS';
}
@endphp
