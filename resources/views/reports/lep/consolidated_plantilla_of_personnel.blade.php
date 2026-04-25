{{--
    resources/views/reports/lep/consolidated_plantilla_of_personnel.blade.php
    ──────────────────────────────────────────────────────────────────────────
    PART I: CONSOLIDATED PLANTILLA OF PERSONNEL

    Structure:
      • A. GENERAL FUND — all GF departments flow naturally across pages
      • page-break-after GF
      • B.1. / B.2. / B.3. … Special Accounts — all flow together, no break between them

    Variables expected:
      $sections            array  — each: [section_label, is_special, dept_groups]
      $proposed_year       int
      $current_year        int
      $lep_lbc_current     string|null
      $lep_lbc_proposed    string|null
      $lep_tranche_current string|null
      $lep_tranche_proposed string|null
      $grand_current_total float
      $grand_proposed_total float
      $grand_increase      float
      $signatories         array
      $peso                Closure
      $pesoA               Closure
      $muni                string
--}}

@php
$pesoSign = '<span style="font-family:\'DejaVu Sans\',sans-serif;">&#x20B1;&nbsp;</span>';

/* Split sections into GF and SA */
$gfSections = array_values(array_filter($sections, fn($s) => !$s['is_special']));
$saSections = array_values(array_filter($sections, fn($s) =>  $s['is_special']));

/* GF grand totals */
$gfCurrentTotal  = 0.0;
$gfProposedTotal = 0.0;
foreach ($gfSections as $sec) {
    foreach ($sec['dept_groups'] as $grp) {
        $gfCurrentTotal  += $grp['total_current'];
        $gfProposedTotal += $grp['total_proposed'];
    }
}
$gfIncrease = $gfProposedTotal - $gfCurrentTotal;

/* Helper: check if a dept group has any data */
$hasData = fn($grp) => $grp['total_current'] > 0 || $grp['total_proposed'] > 0 || count($grp['rows']) > 0;

/* Shared table header closure */
$tableHeader = function() use ($lep_lbc_current, $lep_lbc_proposed, $lep_tranche_current, $lep_tranche_proposed, $proposed_year) { ?>
<thead>
  <tr style="height:0;line-height:0;font-size:0;visibility:hidden;">
    <td style="width:4%;  padding:0;border:none;"></td>
    <td style="width:4%;  padding:0;border:none;"></td>
    <td style="width:26%; padding:0;border:none;"></td>
    <td style="width:21%; padding:0;border:none;"></td>
    <td style="width:6%;  padding:0;border:none;"></td>
    <td style="width:11%; padding:0;border:none;"></td>
    <td style="width:6%;  padding:0;border:none;"></td>
    <td style="width:11%; padding:0;border:none;"></td>
    <td style="width:11%; padding:0;border:none;"></td>
  </tr>
  <tr style="line-height:1.2;">
    <th colspan="2">Item No.</th>
    <th rowspan="2" style="width:27%;">Position Title</th>
    <th rowspan="2" style="width:20%;">Name of Incumbent</th>
    <th colspan="2" style="line-height:1.2;>
      Current Year Authorized Rate / Annum<br>
      <?php if($lep_lbc_current) echo $lep_lbc_current . '<br>'; ?>
      <span style="font-size:6pt;"><?php echo $lep_tranche_current ?? 'No Data'; ?></span>
    </th>
    <th colspan="2" style="line-height:1.2;">
      Budget Year <?php echo $proposed_year; ?> Proposed Rate / Annum<br>
      <?php if($lep_lbc_proposed) echo $lep_lbc_proposed . '<br>'; ?>
      <span style="font-size:6pt;"><?php echo $lep_tranche_proposed ?? 'No Data'; ?></span>
    </th>
    <th rowspan="2" style="width:11%;">Increase/<br>Decrease</th>
  </tr>
  <tr style="line-height:1.2;">
    <th style="font-size:6pt;">Old</th>
    <th style="font-size:6pt;">New</th>
    <th style="width:5%;">Grade/<br>Step</th>
    <th style="width:12%;">Amount</th>
    <th style="width:5%;">Grade/<br>Step</th>
    <th style="width:12%;">Amount</th>
  </tr>
  <tr style="line-height:1.2;">
    <th>(1)</th><th>(2)</th><th>(3)</th><th>(4)</th>
    <th>(5)</th><th>(6)</th><th>(7)</th><th>(8)</th><th>(9)</th>
  </tr>
</thead>
<?php };
@endphp

{{-- ══════════════════════════════════════════════════════════
     PART I header + A. GENERAL FUND
     page-break-after so SA starts on fresh page
══════════════════════════════════════════════════════════ --}}
<div style="page-break-after: always;">

  <div style="font-weight:bold; font-size:8.5pt; margin-bottom:4px; text-transform:uppercase;">
    PART I: CONSOLIDATED PLANTILLA OF PERSONNEL
  </div>
  <div style="font-weight:bold; font-size:7.5pt; text-align:left; margin-bottom:4px; text-transform:uppercase;">
    A. GENERAL FUND
  </div>

  <table class="data-table" style="margin-top:4px; width:100% !important; table-layout:fixed; font-size:6.5pt;">
    {!! $tableHeader() !!}
    <tbody>

    @foreach($gfSections as $sec)
      @foreach($sec['dept_groups'] as $grp)
        @php
          if (!$hasData($grp)) continue;
          $deptName = $grp['dept_name'];
          $rows     = $grp['rows'] ?? [];
        @endphp

        <tr>
          <td colspan="9" style="font-weight:bold; font-size:7pt; padding:2px 4px;">
            {{ $deptName }}
          </td>
        </tr>

        @forelse($rows as $rIdx => $row)
        @php
          $fmt       = $rIdx === 0 ? $pesoA : fn($n) => (float)$n == 0 ? '' : number_format((float)$n, 0);
          $noCurrent = ($row['current_amount'] <= 0);
          $curAmt    = $row['current_amount'] > 0 ? $row['current_amount'] : ($row['proposed_amount'] ?? 0);
        @endphp
        <tr style="line-height:1.2;">
          <td class="c" style="font-size:6pt;">{{ $row['old_item_number'] ?? '' }}</td>
          <td class="c" style="font-size:6pt;">{{ $row['new_item_number'] }}</td>
          <td style="word-wrap:break-word;">{{ $row['position_title'] }}</td>
          <td style="word-wrap:break-word;">
            {{ $row['incumbent'] }}
            @if(!empty($row['effective_date_note']))
              <br><span style="font-size:5.5pt;color:#444;font-style:italic;">Effective date {{ $row['effective_date_note'] }}</span>
            @endif
          </td>
          @php
            // Use ONLY the real current year amount — never fall back to proposed
            $curAmt    = (float) ($row['current_amount'] ?? 0);
            $noCurrent = $curAmt <= 0;
        @endphp
        <td class="c" style="font-size:6pt;">
            {{ $row['salary_grade'] ?? '' }}<br>
            {{ $row['step_current'] ?? '' }}
        </td>
        <td class="r">{!! $curAmt > 0 ? $fmt($curAmt) : '' !!}</td>
          <td class="c" style="font-size:6pt;">
            {{ $row['salary_grade'] ?? '' }}<br>
            {{ $row['step_proposed'] ?? '' }}
          </td>
          <td class="r">
            {!! $fmt($row['proposed_amount'] ?? 0) !!}
            @if(!empty($row['annual_increment']) && $row['annual_increment'] > 0)
                <br><span style="font-size:5.5pt;font-style:italic;color:#1a7a3c;">+{!! $fmt($row['annual_increment']) !!}</span>
            @endif
            </td>
          <td class="r" style="{{ !$noCurrent && isset($row['increase_decrease']) ? ($row['increase_decrease'] > 0 ? 'color:#1a7a3c;' : ($row['increase_decrease'] < 0 ? 'color:#c0392b;' : '')) : '' }}">
            @if(!$noCurrent && !empty($row['increase_decrease']) && $row['increase_decrease'] != 0)
                {!! $fmt($row['increase_decrease']) !!}
            @endif
            @if(!$noCurrent && !empty($row['annual_increment']) && $row['annual_increment'] > 0)
                <br><span style="font-size:5.5pt;font-style:italic;color:#1a7a3c;">+{!! $fmt($row['annual_increment']) !!}</span>
            @endif
            </td>
        </tr>
        @empty
        <tr><td colspan="9" class="c" style="padding:4px;font-style:italic;color:#666;">No plantilla positions on file.</td></tr>
        @endforelse

      @endforeach
    @endforeach

    </tbody>
  </table>

  {{-- HRMO Designate signature — after GF table --}}
  <table style="width:100%;border-collapse:collapse;font-size:6.5pt;border:1px solid #000;">
    <tr>
      <td style="width:50%;text-align:center;vertical-align:top;padding:6px 4px 24px;">
        Prepared by:
        <span class="sig-name">JOSEPH A. ACTUB</span>
        <span class="sig-title">HRMO Designate</span>
      </td>
      <td style="width:50%;text-align:center;vertical-align:top;padding:6px 4px 24px;">
        &nbsp;
      </td>
    </tr>
  </table>

</div>{{-- /GF block — page-break-after forces SA onto next page --}}


{{-- ══════════════════════════════════════════════════════════
     PART I (continued) — B. SPECIAL ACCOUNTS
     All B.x sections flow together, no page break between them.
     $sec['section_label'] already contains e.g. "B.1. SPECIAL ACCOUNT: OCC"
     so we use it directly — no extra "B.x." prefix added here.
══════════════════════════════════════════════════════════ --}}
@if(count($saSections) > 0)
<div>

  <div style="font-weight:bold; font-size:8.5pt; margin-bottom:4px; text-transform:uppercase;">
    PART I: CONSOLIDATED PLANTILLA OF PERSONNEL (Continuation)
  </div>

  <table class="data-table" style="width:100%; table-layout:fixed; font-size:6pt;">
    {!! $tableHeader() !!}
    <tbody>

    @foreach($saSections as $saIdx => $sec)
      @php
        /* Use section_label exactly as provided by the controller —
           it already contains "B.1. SPECIAL ACCOUNT: ..." */
        $secLabel = $sec['section_label'];

        $secCurrentTotal  = 0.0;
        $secProposedTotal = 0.0;
        foreach ($sec['dept_groups'] as $grp) {
            $secCurrentTotal  += $grp['total_current'];
            $secProposedTotal += $grp['total_proposed'];
        }
        $secIncrease = $secProposedTotal - $secCurrentTotal;

        $secHasAny = false;
        foreach ($sec['dept_groups'] as $grp) {
            if ($hasData($grp)) { $secHasAny = true; break; }
        }
      @endphp

      {{-- Section label row — uses section_label as-is, no duplicate prefix --}}
      <tr>
        <td colspan="9" style="font-weight:bold; font-size:7pt; padding:2px 4px;">
          {{ $secLabel }}
        </td>
      </tr>

      @if($secHasAny)

        @foreach($sec['dept_groups'] as $grp)
          @php
            if (!$hasData($grp)) continue;
            $deptName = $grp['dept_name'];
            $rows     = $grp['rows'] ?? [];
          @endphp

          <tr>
            <td colspan="9" style="font-size:7pt; padding:2px 4px;">
              {{ $deptName }}
            </td>
          </tr>

          @forelse($rows as $rIdx => $row)
          @php
            $fmt       = $rIdx === 0 ? $pesoA : fn($n) => (float)$n == 0 ? '' : number_format((float)$n, 0);
            $noCurrent = ($row['current_amount'] <= 0);
            $curAmt    = $row['current_amount'] > 0 ? $row['current_amount'] : ($row['proposed_amount'] ?? 0);
          @endphp
          <tr style="line-height:1.2;">
            <td class="c" style="font-size:6pt;">{{ $row['old_item_number'] ?? '' }}</td>
            <td class="c" style="font-size:6pt;">{{ $row['new_item_number'] }}</td>
            <td style="word-wrap:break-word;">{{ $row['position_title'] }}</td>
            <td style="word-wrap:break-word;">
              {{ $row['incumbent'] }}
              @if(!empty($row['effective_date_note']))
                <br><span style="font-size:5.5pt;color:#444;font-style:italic;">Effective date {{ $row['effective_date_note'] }}</span>
              @endif
            </td>
            @php
                // Use ONLY the real current year amount — never fall back to proposed
                $curAmt    = (float) ($row['current_amount'] ?? 0);
                $noCurrent = $curAmt <= 0;
            @endphp
            <td class="c" style="font-size:6pt;">
                {{ $row['salary_grade'] ?? '' }}<br>
                {{ $row['step_current'] ?? '' }}
            </td>
            <td class="r">{!! $curAmt > 0 ? $fmt($curAmt) : '' !!}</td>
            <td class="c" style="font-size:6pt;">
              {{ $row['salary_grade'] ?? '' }}<br>
              {{ $row['step_proposed'] ?? '' }}
            </td>
            <td class="r">
            {!! $fmt($row['proposed_amount'] ?? 0) !!}
            @if(!empty($row['annual_increment']) && $row['annual_increment'] > 0)
                <br><span style="font-size:5.5pt;font-style:italic;color:#1a7a3c;">+{!! $fmt($row['annual_increment']) !!}</span>
            @endif
            </td>
            <td class="r" style="{{ !$noCurrent && isset($row['increase_decrease']) ? ($row['increase_decrease'] > 0 ? 'color:#1a7a3c;' : ($row['increase_decrease'] < 0 ? 'color:#c0392b;' : '')) : '' }}">
            @if(!$noCurrent && !empty($row['increase_decrease']) && $row['increase_decrease'] != 0)
                {!! $fmt($row['increase_decrease']) !!}
            @endif
            @if(!$noCurrent && !empty($row['annual_increment']) && $row['annual_increment'] > 0)
                <br><span style="font-size:5.5pt;font-style:italic;color:#1a7a3c;">+{!! $fmt($row['annual_increment']) !!}</span>
            @endif
            </td>
          </tr>
          @empty
          <tr><td colspan="9" class="c" style="padding:4px;font-style:italic;color:#666;">No plantilla positions on file.</td></tr>
          @endforelse

        @endforeach

        {{-- SA section total (only if non-zero) --}}
        {{-- @if($secCurrentTotal > 0 || $secProposedTotal > 0)
        <tr class="grand-total">
          <td colspan="4" style="font-size:7pt; padding:2px 4px;">
            TOTAL — {{ $secLabel }}
          </td>
          <td></td>
          <td class="r" style="font-size:7pt;">{!! ($pesoA)($secCurrentTotal) !!}</td>
          <td></td>
          <td class="r" style="font-size:7pt;">{!! ($pesoA)($secProposedTotal) !!}</td>
          <td class="r" style="font-size:7pt;">{!! $secIncrease != 0 ? ($pesoA)($secIncrease) : '' !!}</td>
        </tr>
        @endif --}}

      @else
        <tr>
          <td colspan="9" class="c" style="padding:4px;font-style:italic;color:#666;">No plantilla positions on file.</td>
        </tr>
      @endif

    @endforeach

    </tbody>
  </table>

  {{-- HRMO Designate signature — after SA table --}}
  <table style="width:100%;border-collapse:collapse;font-size:6.5pt;border:1px solid #000;">
    <tr>
      <td style="width:50%;text-align:center;vertical-align:top;padding:6px 4px 24px;">
        Prepared by:
        <span class="sig-name">JOSEPH A. ACTUB</span>
        <span class="sig-title">HRMO Designate</span>
      </td>
      <td style="width:50%;text-align:center;vertical-align:top;padding:6px 4px 24px;">
        &nbsp;
      </td>
    </tr>
  </table>

</div>{{-- /SA block --}}
@endif
